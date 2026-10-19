import { describe, expect, it } from 'vitest';
import { parseCategory } from './categories';
import { formatVND, fromDateInput, parseMoneyInput, periodRange, toDateInput } from './format';

describe('formatVND', () => {
    it('groups with dots and signs on request', () => {
        expect(formatVND(-94000)).toBe('-94.000 đ');
        expect(formatVND(1500000, { sign: true })).toBe('+1.500.000 đ');
        expect(formatVND(0, { sign: true })).toBe('0 đ');
    });
});

describe('money and date inputs', () => {
    it('parses grouped digits', () => {
        expect(parseMoneyInput('1.500.000')).toBe(1500000);
        expect(parseMoneyInput('')).toBe(0);
    });

    it('round-trips local dates without a UTC shift', () => {
        const ts = new Date(2026, 9, 19, 0, 30).getTime();
        expect(toDateInput(ts)).toBe('2026-10-19');
        expect(fromDateInput('2026-10-19')).toBe(new Date(2026, 9, 19).getTime());
    });
});

describe('periodRange', () => {
    const now = new Date(2026, 9, 19, 15, 0); // Monday 19/10/2026

    it('starts weeks on Monday', () => {
        expect(periodRange('this_week', now)).toEqual([new Date(2026, 9, 19).getTime(), new Date(2026, 9, 26).getTime() - 1]);
        const sunday = new Date(2026, 9, 25, 9, 0);
        expect(periodRange('this_week', sunday)[0]).toBe(new Date(2026, 9, 19).getTime());
    });

    it('handles month boundaries', () => {
        expect(periodRange('last_month', now)).toEqual([new Date(2026, 8, 1).getTime(), new Date(2026, 9, 1).getTime() - 1]);
        expect(periodRange('this_month', new Date(2026, 0, 5))[0]).toBe(new Date(2026, 0, 1).getTime());
    });
});

describe('parseCategory', () => {
    it('reads current and legacy stored values', () => {
        expect(parseCategory('restaurant Ăn uống')).toMatchObject({ icon: 'restaurant', name: 'Ăn uống', color: '#e8890c' });
        expect(parseCategory('fastfood Ăn uống')).toMatchObject({ icon: 'fastfood', name: 'Ăn uống', color: '#e8890c' });
        expect(parseCategory('directions_car Đi lại')).toMatchObject({ name: 'Đi lại', color: '#64748b' });
        expect(parseCategory(null)).toBeNull();
    });
});
