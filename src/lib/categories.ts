/**
 * Categories are stored on transactions as "<material icon name> <label>",
 * e.g. "restaurant Ăn uống". Old data may use other icon names
 * ("fastfood Ăn uống") — parseCategory handles any stored string.
 */
export interface Category {
    icon: string;
    name: string;
    /** Hue used for the icon chip; mid-tone so it reads in light and dark */
    color: string;
}

export const CATEGORIES: Category[] = [
    { icon: 'restaurant', name: 'Ăn uống', color: '#e8890c' },
    { icon: 'directions_car', name: 'Di chuyển', color: '#0ea5e9' },
    { icon: 'local_mall', name: 'Mua sắm', color: '#db2777' },
    { icon: 'sports_esports', name: 'Giải trí', color: '#10b981' },
    { icon: 'favorite', name: 'Người yêu', color: '#f43f5e' },
    { icon: 'local_hospital', name: 'Sức khoẻ', color: '#ef4444' },
    { icon: 'school', name: 'Học tập', color: '#8b5cf6' },
    { icon: 'home', name: 'Nhà ở', color: '#a16207' },
    { icon: 'attach_money', name: 'Thu nhập', color: '#16a34a' },
    { icon: 'category', name: 'Khác', color: '#64748b' },
];

const FALLBACK_COLOR = '#64748b';

export function categoryValue(c: Category): string {
    return `${c.icon} ${c.name}`;
}

/** Stored string → display info. Colors follow the name so old icon variants match. */
export function parseCategory(value: string | null | undefined): Category | null {
    if (!value) return null;
    const [icon, ...rest] = value.split(' ');
    const name = rest.join(' ') || icon;
    const known = CATEGORIES.find(c => c.name === name);
    return { icon, name, color: known?.color ?? FALLBACK_COLOR };
}
