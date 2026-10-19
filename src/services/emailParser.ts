import type { Transaction } from '../db';
import type { EmailParserType } from './emailConfig';

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
export function decodeBase64Url(data: string): string {
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
export function extractBodies(payload: any): { html: string; text: string } {
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
export function getSubject(payload: any): string {
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
    let beneficiary: string | undefined;

    for (let i = 0; i < cells.length; i++) {
        const cell = cells[i];

        // Tên người hưởng → next cell has beneficiary name (not the "Kính gửi" account holder)
        if (/Tên người hưởng/i.test(cell) && !beneficiary) {
            const val = cells[i + 1];
            if (val && !LABEL_PATTERNS.test(val) && !FIELD_LABELS.test(val)) beneficiary = val;
        }

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

    return { amount, description: description || 'VPBank Transaction', date: (date || new Date()).getTime(), beneficiary };
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
export function parseFromHtml(html: string, type: EmailParserType, internalDate?: number): Partial<Transaction> | null {
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
export function parseFromText(body: string, internalDate: string): Partial<Transaction> | null {
    const text = body.replace(/[\r\n]+/g, ' ');

    // ── Amount ──
    let amount: number | null = null;
    const changedMatch = text.match(/(?:Số tiền thay đổi|Changed Amount)[^:]*:?\s*([+-]?[\d,]+)\s*VN[DĐ]/i)
        || text.match(/([+-][\d,]+)\s*VN[DĐ]\s*(?:Số tiền thay đổi|Changed Amount)/i);
    const debitMatch = text.match(/Số tiền trích nợ[^\d]*([\d,]+)\s*VN[DĐ]/i);
    const creditMatch = text.match(/Số tiền ghi có[^\d]*([\d,]+)\s*VN[DĐ]/i);

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

    // ── Beneficiary (transfer emails only) ──
    const beneficiaryMatch = text.match(/Tên người hưởng[:\s]+(.+?)\s*(?:Beneficiary Name|Loại phí|$)/i);
    const beneficiary = beneficiaryMatch?.[1].trim() || undefined;

    return { amount, description, date: date.getTime(), beneficiary };
}
