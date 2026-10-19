import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseFromHtml, parseFromText } from './emailParser';
import { isSelfBeneficiary } from './emailConfig';

const transferHtml = readFileSync(new URL('./__fixtures__/transfer-email.html', import.meta.url), 'utf-8');

describe('parseFromHtml (transfer)', () => {
    it('extracts amount, date, description and beneficiary', () => {
        const parsed = parseFromHtml(transferHtml, 'transfer');
        expect(parsed).toMatchObject({
            amount: -94000,
            description: 'NGUYEN LE HAI ANH chuyen tien',
            beneficiary: 'MAI HONG THUY',
            date: new Date(2026, 9, 19, 12, 28, 1).getTime(),
        });
    });

    it('does not mistake the account holder for the beneficiary', () => {
        const html = transferHtml.replace('MAI HONG THUY', 'NGUYEN LE HAI ANH');
        expect(parseFromHtml(html, 'transfer')?.beneficiary).toBe('NGUYEN LE HAI ANH');

        const withoutBeneficiary = transferHtml.replace('MAI HONG THUY', '');
        expect(parseFromHtml(withoutBeneficiary, 'transfer')?.beneficiary).toBeUndefined();
    });
});

describe('parseFromText', () => {
    it('extracts beneficiary from plain text', () => {
        const text = transferHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        expect(parseFromText(text, '0')?.beneficiary).toBe('MAI HONG THUY');
    });
});

describe('isSelfBeneficiary', () => {
    it('matches own name regardless of case, diacritics and spacing', () => {
        expect(isSelfBeneficiary('NGUYEN LE HAI ANH')).toBe(true);
        expect(isSelfBeneficiary('Nguyễn Lê Hải Anh')).toBe(true);
        expect(isSelfBeneficiary('  nguyen  le hai   anh ')).toBe(true);
    });

    it('does not match other people or missing names', () => {
        expect(isSelfBeneficiary('MAI HONG THUY')).toBe(false);
        expect(isSelfBeneficiary('NGUYEN LE HAI')).toBe(false);
        expect(isSelfBeneficiary(undefined)).toBe(false);
    });
});
