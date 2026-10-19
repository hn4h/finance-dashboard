import { db } from '../db';
import { detectParserRule, isSelfBeneficiary } from './emailConfig';
import { extractBodies, getSubject, parseFromHtml, parseFromText } from './emailParser';
import { getDocs, query, where, limit, addDoc, setDoc, doc } from 'firebase/firestore';

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

            // ── Self-transfer filter (moving money to own secondary account) ──
            if (parsed && isSelfBeneficiary(parsed.beneficiary)) {
                log(`⏭ Bỏ qua (chuyển tài khoản phụ): ${Math.abs(parsed.amount ?? 0).toLocaleString()} đ - ${parsed.beneficiary}`);
                continue;
            }

            if (parsed && typeof parsed.amount === 'number') {
                await addDoc(db.transactions, {
                    emailId: msg.id,
                    amount: parsed.amount,
                    description: parsed.description || '',
                    ...(parsed.beneficiary ? { beneficiary: parsed.beneficiary } : {}),
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
