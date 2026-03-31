// ─── VPBank Email Parser Configuration ───────────────────────
//
// Each subject maps to a parser type that determines how the
// email body is parsed (different templates have different layouts).
//
// Parser types:
//   transfer        — "Thông báo giao dịch" style: labels BEFORE values in HTML table
//   balance_changed — "Biến động số dư" style: values BEFORE labels in HTML table

export type EmailParserType = 'transfer' | 'balance_changed';

export interface EmailSubjectRule {
    /** Substring to match in the email subject (case-insensitive) */
    pattern: string;
    /** Which parser logic to apply */
    parser: EmailParserType;
    /**
     * If the parsed description matches ANY of these patterns, the transaction
     * is skipped (not saved). Used to filter out internal transfers, credit
     * card payments, etc.
     */
    skipPatterns?: RegExp[];
}

/**
 * Add new subjects here when VPBank introduces new email templates.
 * Order matters — first match wins.
 */
export const EMAIL_SUBJECT_RULES: EmailSubjectRule[] = [
    {
        pattern: 'Transfer successful',
        parser: 'transfer',
        // Skip credit-card payment transfers (not real expenses)
        skipPatterns: [/thanh\s*to[aá]n\s*th[eẻ]\s*t[íi]n\s*d[uụ]ng/i],
    },
    {
        pattern: 'VPBank xin thong bao bien dong so du The tin dung cua Quy khach',
        parser: 'balance_changed',
        // Skip positive balance changes caused by payment top-ups from main account
        // Description pattern: VPB + digits (e.g. VPB2603212010054165)
        skipPatterns: [/^VPB\d+$/i],
    },
    {
        pattern: 'VPBank - Thông báo biến động số dư',
        parser: 'balance_changed',
    },
];

/** Match an email subject against rules. Returns null if no rule matches (email will be skipped). */
export function detectParserRule(subject: string): EmailSubjectRule | null {
    const lower = subject.toLowerCase();
    for (const rule of EMAIL_SUBJECT_RULES) {
        if (lower.includes(rule.pattern.toLowerCase())) {
            return rule;
        }
    }
    return null;
}
