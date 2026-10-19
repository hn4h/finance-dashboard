import { useCallback, useEffect, useState } from 'react';

export type ThemePref = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'theme';
// Keep in sync with --bg in src/index.css and the inline script in index.html
const THEME_COLORS = { light: '#f5f7fa', dark: '#0b0e14' };

const darkQuery = () => window.matchMedia('(prefers-color-scheme: dark)');

function readPref(): ThemePref {
    try {
        const v = localStorage.getItem(STORAGE_KEY);
        return v === 'light' || v === 'dark' ? v : 'system';
    } catch {
        return 'system';
    }
}

function apply(pref: ThemePref) {
    const dark = pref === 'dark' || (pref === 'system' && darkQuery().matches);
    document.documentElement.classList.toggle('dark', dark);
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? THEME_COLORS.dark : THEME_COLORS.light);
}

export function useTheme() {
    const [pref, setPrefState] = useState<ThemePref>(readPref);

    useEffect(() => {
        apply(pref);
        if (pref !== 'system') return;
        const mq = darkQuery();
        const onChange = () => apply('system');
        mq.addEventListener('change', onChange);
        return () => mq.removeEventListener('change', onChange);
    }, [pref]);

    const setPref = useCallback((next: ThemePref) => {
        try {
            if (next === 'system') localStorage.removeItem(STORAGE_KEY);
            else localStorage.setItem(STORAGE_KEY, next);
        } catch { /* storage unavailable — theme still applies for this session */ }
        setPrefState(next);
    }, []);

    return { pref, setPref };
}
