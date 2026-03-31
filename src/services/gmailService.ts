import { db, type Transaction } from '../db';
import { detectParserRule, type EmailParserType } from './emailConfig';
import { getDocs, query, where, limit, addDoc, setDoc, doc } from 'firebase/firestore';

// ─── Utilities ───────────────────────────────────────────────

/** Clean VPBank amount format "10,000" or "1,500,000" → integer */
function parseAmount(raw: string): number {
    return parseInt(raw.replace(/[,.\s]/g, ''), 10) || 0;
}

/** Parse Vietnamese date "DD/MM/YYYY HH:mm[:ss]" → Date (seconds optional).
 *  Validates ranges to avoid false matches from embedded MM/DD timestamps in description text
 *  (e.g. "luc 03/20/2026 18:03:21" would produce month=20 which is invalid → rejected). */
function parseVietnameseDate(str: string): Date | null {
    const m = str.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})(?::(\d{2}))?/);
    if (!m) return null;
    const [, dd, mm, yyyy, hh, mi, ss] = m;
    const day = +dd, month = +mm, hour = +hh, minute = +mi;
    // Reject out-of-range values — catches American-format dates used inside description strings
    if (month < 1 || month > 12) return null;
    if (day < 1 || day > 31) return null;
    if (hour > 23 || minute > 59) return null;
    return new Date(+yyyy, month - 1, day, hour, minute, +(ss || 0));
}

/** Decode base64url → utf-8 string */
function decodeBase64Url(data: string): string {
    let b64 = data.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    try {
        return decodeURIComponent(escape(atob(b64)));
    } catch {
        return atob(b64);
    }
}

// ─── Gmail Extraction ────────────────────────────────────────

/** Extract both HTML and plain-text bodies from Gmail payload (handles nested multipart) */
function extractBodies(payload: any): { html: string; text: string } {
    let html = '';
    let text = '';

    const scan = (part: any) => {
        if (part.mimeType === 'text/html' && part.body?.data) {
            html = decodeBase64Url(part.body.data);
        } else if (part.mimeType === 'text/plain' && part.body?.data) {
            text = decodeBase64Url(part.body.data);
        }
        if (part.parts) part.parts.forEach(scan);
    };

    scan(payload);
    return { html, text };
}

/** Extract Subject header from Gmail message payload */
function getSubject(payload: any): string {
    const headers: any[] = payload.headers || [];
    const h = headers.find((h: any) => h.name.toLowerCase() === 'subject');
    return h?.value || '';
}

// ─── HTML Cell Extraction ────────────────────────────────────

/** Extract text content of every <td> cell in the email HTML */
function extractTableCells(html: string): string[] {
    const clean = html.replace(/<!--[\s\S]*?-->/g, '');
    const cells: string[] = [];
    const re = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    let m: RegExpExecArray | null;
    while ((m = re.exec(clean)) !== null) {
        const t = m[1]
            .replace(/<br\s*\/?>/gi, ' ')
            .replace(/<[^>]+>/g, ' ')
            .replace(/&nbsp;/gi, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&#\d+;/g, '')
            .replace(/\s+/g, ' ')
            .trim();
        if (t.length > 0) cells.push(t);
    }
    return cells;
}

/** Skip-patterns for label cells */
const LABEL_PATTERNS = /^(Details of Payment|Debit|Credit|Fee|Transaction|Beneficiary|Charge|Exclude)/i;
const FIELD_LABELS = /(Số tiền|Ngày|Tài khoản|Loại phí|Tên người|Mã giao dịch|Nội dung|Thời gian|Hạn mức|Thẻ)/i;

// ─── Transfer Parser ─────────────────────────────────────────
// Layout: LABEL cell → VALUE cell (left-to-right / top-to-bottom)

function parseTransferHtml(cells: string[]): Partial<Transaction> | null {
    let debitAmount: number | null = null;
    let creditAmount: number | null = null;
    let date: Date | null = null;
    let description: string | null = null;

    for (let i = 0; i < cells.length; i++) {
        const cell = cells[i];

        // Số tiền trích nợ → next cell has amount
        if (/Số tiền trích nợ/i.test(cell) && debitAmount === null) {
            for (let j = i + 1; j < Math.min(i + 3, cells.length); j++) {
                const m = cells[j].match(/([\d,]+)\s*VN[DĐ]/i);
                if (m) { debitAmount = parseAmount(m[1]); break; }
            }
        }

        // Số tiền ghi có → next cell has amount
        if (/Số tiền ghi có/i.test(cell) && creditAmount === null) {
            for (let j = i + 1; j < Math.min(i + 3, cells.length); j++) {
                const m = cells[j].match(/([\d,]+)\s*VN[DĐ]/i);
                if (m) { creditAmount = parseAmount(m[1]); break; }
            }
        }

        // Ngày, giờ giao dịch → next cell has date
        if (/Ngày.*giờ giao dịch/i.test(cell) && !date) {
            for (let j = i + 1; j < Math.min(i + 3, cells.length); j++) {
                const d = parseVietnameseDate(cells[j]);
                if (d) { date = d; break; }
            }
        }

        // Nội dung → next cell has description
        if (/Nội dung/i.test(cell) && !description) {
            for (let j = i + 1; j < Math.min(i + 3, cells.length); j++) {
                const val = cells[j];
                if (val.length > 2 && !LABEL_PATTERNS.test(val) && !FIELD_LABELS.test(val)) {
                    description = val;
                    break;
                }
            }
        }
    }

    // Debit = expense (negative), credit-only = income (positive)
    let amount: number | null = null;
    if (debitAmount != null && debitAmount > 0) {
        amount = -debitAmount;
    } else if (creditAmount != null && creditAmount > 0) {
        amount = creditAmount;
    }
    if (amount === null) return null;

    return { amount, description: description || 'VPBank Transaction', date: (date || new Date()).getTime() };
}

// ─── Balance Changed Parser ──────────────────────────────────
// Layout: VALUE cell → LABEL cell (value appears BEFORE its label)
// Note: sometimes value and label are compressed into the SAME cell (separated by <br>)

function parseBalanceChangedHtml(cells: string[], internalDate?: number): Partial<Transaction> | null {
    let amount: number | null = null;
    let date: Date | null = null;
    let description: string | null = null;

    for (let i = 0; i < cells.length; i++) {
        const cell = cells[i];

        // Số tiền thay đổi / Changed Amount
        if (/Số tiền thay đổi|Changed Amount/i.test(cell) && amount === null) {
            const AMOUNT_RE = /([+-])?\s*([\d,]+)\s*VN[DĐ]/i;
            const mSelf = cell.match(AMOUNT_RE);
            if (mSelf) {
                const raw = parseAmount(mSelf[2]);
                amount = mSelf[1] === '-' ? -raw : raw;
            } else {
                for (let j = i - 1; j >= Math.max(i - 3, 0); j--) {
                    const m = cells[j].match(AMOUNT_RE);
                    if (m) {
                        const raw = parseAmount(m[2]);
                        amount = m[1] === '-' ? -raw : raw;
                        break;
                    }
                }
            }
        }

        // Thời gian / Time — multi-strategy search
        if (/Thời gian|Time/i.test(cell) && !date) {
            // 1. Self cell (value+label in same <td>)
            const dSelf = parseVietnameseDate(cell);
            if (dSelf) {
                date = dSelf;
            } else {
                // 2. Backward — wider window (value-before-label layout)
                for (let j = i - 1; j >= Math.max(i - 5, 0); j--) {
                    const d = parseVietnameseDate(cells[j]);
                    if (d) { date = d; break; }
                }
                // 3. Forward — (label-before-value layout)
                if (!date) {
                    for (let j = i + 1; j <= Math.min(i + 3, cells.length - 1); j++) {
                        const d = parseVietnameseDate(cells[j]);
                        if (d) { date = d; break; }
                    }
                }
            }
        }

        // Nội dung / Transaction Content
        if (/Nội dung/i.test(cell) && !description) {
            const mSelf = cell.match(/(.*?)\s*(?:Nội dung|Transaction Content)/i);
            if (mSelf && mSelf[1].trim().length > 2 && !/[\d,]+\s*VN[DĐ]/i.test(mSelf[1])) {
                description = mSelf[1].trim();
            } else {
                for (let j = i - 1; j >= Math.max(i - 3, 0); j--) {
                    const val = cells[j];
                    if (
                        val.length > 2 &&
                        !LABEL_PATTERNS.test(val) &&
                        !FIELD_LABELS.test(val) &&
                        !/[\d,]+\s*VN[DĐ]/i.test(val)
                    ) {
                        description = val;
                        break;
                    }
                }
            }
        }
    }

    // Last-resort: scan ALL cells for any valid date (catches unusual layouts
    // where date is far from "Thời gian" label or label is missing)
    if (!date) {
        for (const cell of cells) {
            const d = parseVietnameseDate(cell);
            if (d) { date = d; break; }
        }
    }

    if (amount === null) return null;

    // Use Gmail's internalDate (epoch ms) as fallback — far better than current time
    const fallbackDate = internalDate ? new Date(internalDate) : new Date();
    return { amount, description: description || 'VPBank Transaction', date: (date || fallbackDate).getTime() };
}

// ─── Unified Parser Router ───────────────────────────────────

/** Route to the correct HTML parser based on email type */
function parseFromHtml(html: string, type: EmailParserType, internalDate?: number): Partial<Transaction> | null {
    const cells = extractTableCells(html);
    if (cells.length === 0) return null;

    switch (type) {
        case 'transfer':
            return parseTransferHtml(cells);
        case 'balance_changed':
            return parseBalanceChangedHtml(cells, internalDate);
    }
}

/** Generic plain-text fallback (tries all patterns, both directions) */
function parseFromText(body: string, internalDate: string): Partial<Transaction> | null {
    const text = body.replace(/[\r\n]+/g, ' ');

    // ── Amount ──
    let amount: number | null = null;
    const changedMatch = text.match(/(?:Số tiền thay đổi|Changed Amount)[^:]*:?\s*([+-]?[\d,]+)\s*VN[DĐ]/i)
        || text.match(/([+-][\d,]+)\s*VN[DĐ]\s*(?:Số tiền thay đổi|Changed Amount)/i);
    const debitMatch = text.match(/Số tiền trích nợ[^:\d]*([\d,]+)\s*VN[DĐ]/i);
    const creditMatch = text.match(/Số tiền ghi có[^:\d]*([\d,]+)\s*VN[DĐ]/i);

    if (changedMatch) {
        const raw = parseAmount(changedMatch[1].replace(/[+-]/, ''));
        amount = changedMatch[1].startsWith('-') ? -raw : raw;
    } else if (debitMatch) {
        amount = -parseAmount(debitMatch[1]);
    } else if (creditMatch) {
        amount = parseAmount(creditMatch[1]);
    } else {
        const legacy = text.match(/([+-][\s]*[\d,]+)\s*(?:VND|VNĐ)/i);
        if (legacy) amount = parseAmount(legacy[1]);
    }
    if (amount === null) return null;

    // ── Date ──
    let date: Date | null = null;
    const dateMatch = text.match(
        /(?:Ngày.*giờ giao dịch|Transaction date|Thời gian|Time)[^:]*:?\s*(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}(?::\d{2})?)/i,
    ) || text.match(
        /(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2}(?::\d{2})?)\s*(?:Thời gian|Time)/i,
    );
    if (dateMatch) date = parseVietnameseDate(dateMatch[1]);
    if (!date) date = new Date(parseInt(internalDate, 10));

    // ── Description ──
    let description = 'VPBank Transaction';

    // Transfer email: Label -> Value
    const descMatchFwd = text.match(
        /(?:Nội dung(?:\s+chuyển\s+tiền)?|ND|Description)[:\s]+(.+?)(?:\s*(?:Loại phí|Charge|Ngày|Transaction date|Số tiền|Fee Amount|Tên người|Mã giao dịch|Thời gian|$))/i,
    );
    // Balance Changed email: Value -> Label
    const descMatchRev = text.match(
        /(?:VN[DĐ]|Amount|Changed Amount)\s+(.*?)\s*(?:Nội dung|Transaction Content)/i
    );

    let rawDesc = '';
    if (descMatchRev && descMatchRev[1]) {
        rawDesc = descMatchRev[1];
    } else if (descMatchFwd && descMatchFwd[1]) {
        rawDesc = descMatchFwd[1];
    }

    if (rawDesc) {
        const cleaned = rawDesc
            .replace(/Details of Payment/gi, '')
            .replace(/Transaction Content/gi, '')
            .replace(/\s+/g, ' ')
            .trim();
        if (cleaned.length > 0) description = cleaned;
    }

    return { amount, description, date: date.getTime() };
}

// ─── Sync Flow ───────────────────────────────────────────────

/** Sync VPBank transaction emails from Gmail → IndexedDB */
export interface SyncOptions {
    startDate?: Date;
    endDate?: Date;
    onProgress?: (msg: string) => void;
}

/** Sync VPBank transaction emails from Gmail → IndexedDB */
export async function syncEmails(accessToken: string, options?: SyncOptions): Promise<{ parsedCount: number, logs: string[] }> {
    const logs: string[] = [];
    const log = (msg: string) => {
        logs.push(msg);
        if (options?.onProgress) options.onProgress(msg);
    };

    const hasDateFilter = !!(options?.startDate && options?.endDate);

    let gmailQuery = 'from:vpbank';
    if (hasDateFilter) {
        gmailQuery += ` after:${Math.floor(options.startDate!.getTime() / 1000)} before:${Math.floor(options.endDate!.getTime() / 1000)}`;
        log(`🔎 Tìm kiếm từ ${options.startDate!.toLocaleDateString('vi-VN')} đến ${options.endDate!.toLocaleDateString('vi-VN')}...`);
    } else {
        const lastSyncSnap = await getDocs(query(db.settings, where('key', '==', 'lastSyncDate'), limit(1)));
        const lastSyncDate = lastSyncSnap.empty ? 0 : (lastSyncSnap.docs[0].data().value as number || 0);
        if (lastSyncDate > 0) {
            gmailQuery += ` after:${Math.floor(lastSyncDate / 1000)}`;
        }
        log(`🔎 Tìm kiếm các giao dịch mới từ lần đồng bộ cuối...`);
    }

    try {
        const listRes = await fetch(
            `https://content.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(gmailQuery)}&maxResults=100`,
            { headers: { Authorization: `Bearer ${accessToken}` } },
        );

        if (!listRes.ok) {
            if (listRes.status === 401) throw new Error('UNAUTHORIZED');
            throw new Error(`Failed to fetch messages: ${listRes.statusText}`);
        }

        const listData = await listRes.json();
        if (!listData.messages?.length) {
            log('✅ Không tìm thấy email giao dịch mới nào khớp điều kiện.');
            return { parsedCount: 0, logs };
        }

        let parsedCount = 0;
        log(`📩 Tìm thấy ${listData.messages.length} đoạn hội thoại email. Đang bắt đầu quét...`);

        for (const msg of listData.messages) {
            const existingSnap = await getDocs(query(db.transactions, where('emailId', '==', msg.id), limit(1)));
            if (!existingSnap.empty) {
                // To avoid spamming logs, we can skip logging existing emails or log faintly.
                // log(`⏭ Bỏ qua email đã tồn tại: ${msg.id}`);
                continue;
            }

            const msgRes = await fetch(
                `https://content.googleapis.com/gmail/v1/users/me/messages/${msg.id}`,
                { headers: { Authorization: `Bearer ${accessToken}` } },
            );
            if (!msgRes.ok) continue;

            const msgDetails = await msgRes.json();

            // ── Detect email type from Subject header ──
            const subject = getSubject(msgDetails.payload);
            const rule = detectParserRule(subject);
            if (!rule) {
                log(`⏭ Bỏ qua email (không phải giao dịch): ${subject.substring(0, 50)}${subject.length > 50 ? '...' : ''}`);
                continue; // skip unrecognized emails
            }

            const { html, text } = extractBodies(msgDetails.payload);

            // ── Parse: HTML (type-specific) → text (generic fallback) ──
            const internalDateMs = parseInt(msgDetails.internalDate, 10);
            let parsed = html ? parseFromHtml(html, rule.parser, internalDateMs) : null;
            if (!parsed) {
                const fallbackText = text || html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
                parsed = parseFromText(fallbackText, msgDetails.internalDate);
            }

            // ── Skip-pattern filter ──
            if (parsed && rule.skipPatterns?.length) {
                const desc = parsed.description || '';
                if (rule.skipPatterns.some(p => p.test(desc))) {
                    log(`⏭ Bỏ qua (giao dịch nội bộ): ${desc}`);
                    continue;
                }
            }

            if (parsed && typeof parsed.amount === 'number') {
                await addDoc(db.transactions, {
                    emailId: msg.id,
                    amount: parsed.amount,
                    description: parsed.description || '',
                    date: parsed.date || Date.now(),
                    category: null,
                    status: 'unclassified',
                });
                parsedCount++;
                log(`✅ Đã nhận diện giao dịch: ${Math.abs(parsed.amount).toLocaleString()} đ - ${parsed.description}`);
            } else {
                log(`❌ Thất bại khi bóc tách thông tin: ${subject.substring(0, 50)}`);
            }
        }

        // Only update lastSyncDate if this was an auto-sync (no custom date range)
        if (!hasDateFilter && parsedCount > 0) {
            await setDoc(doc(db.settings, 'lastSyncDate'), { key: 'lastSyncDate', value: Date.now() });
            log(`✨ Đã cập nhật mốc đồng bộ tự động.`);
        }

        log(`🎉 Quá trình hoàn tất! Đã lưu ${parsedCount} giao dịch mới vào hệ thống.`);

        return { parsedCount, logs };
    } catch (error) {
        log(`🚨 Lỗi đồng bộ: ${error instanceof Error ? error.message : 'Unknown error'}`);
        console.error('Error syncing emails:', error);
        throw error;
    }
}
