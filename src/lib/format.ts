/** 1500000 → "1.500.000" (vi-VN grouping) */
export function formatNumber(n: number): string {
    return Math.round(n).toLocaleString('vi-VN');
}

/** -94000 → "-94.000 đ"; with `sign`, positives get a leading "+" */
export function formatVND(n: number, opts: { sign?: boolean } = {}): string {
    const prefix = n < 0 ? '-' : opts.sign && n > 0 ? '+' : '';
    return `${prefix}${formatNumber(Math.abs(n))} đ`;
}

/** Digits-only string from a money input → number (0 when empty) */
export function parseMoneyInput(raw: string): number {
    const digits = raw.replace(/\D/g, '');
    return digits ? parseInt(digits, 10) : 0;
}

/** Local "YYYY-MM-DD" for <input type="date"> (toISOString would shift to UTC) */
export function toDateInput(ts: number = Date.now()): string {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** "YYYY-MM-DD" → local midnight timestamp */
export function fromDateInput(value: string): number {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d).getTime();
}

export type PeriodId = 'all' | 'today' | 'this_week' | 'this_month' | 'last_month';

export const PERIOD_LABELS: Record<PeriodId, string> = {
    all: 'Tất cả',
    today: 'Hôm nay',
    this_week: 'Tuần này',
    this_month: 'Tháng này',
    last_month: 'Tháng trước',
};

/** Inclusive [start, end] timestamps for a named period (week starts Monday) */
export function periodRange(period: PeriodId, now = new Date()): [number, number] {
    const y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
    switch (period) {
        case 'today':
            return [new Date(y, m, d).getTime(), new Date(y, m, d + 1).getTime() - 1];
        case 'this_week': {
            const monday = d - ((now.getDay() + 6) % 7);
            return [new Date(y, m, monday).getTime(), new Date(y, m, monday + 7).getTime() - 1];
        }
        case 'this_month':
            return [new Date(y, m, 1).getTime(), new Date(y, m + 1, 1).getTime() - 1];
        case 'last_month':
            return [new Date(y, m - 1, 1).getTime(), new Date(y, m, 1).getTime() - 1];
        default:
            return [0, Infinity];
    }
}
