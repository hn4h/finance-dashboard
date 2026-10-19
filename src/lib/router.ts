import { useCallback, useEffect, useState } from 'react';

/** Hash-based routing (`#/history`) so iOS swipe-back and reload keep the current page. */
export type PageId = 'dashboard' | 'classify' | 'history' | 'analytics' | 'more' | 'finance' | 'sync';

const PAGES: PageId[] = ['dashboard', 'classify', 'history', 'analytics', 'more', 'finance', 'sync'];

function readHash(): PageId {
    const id = window.location.hash.replace(/^#\/?/, '') as PageId;
    return PAGES.includes(id) ? id : 'dashboard';
}

export function useRoute() {
    const [page, setPage] = useState<PageId>(readHash);

    useEffect(() => {
        const onChange = () => {
            setPage(readHash());
            window.scrollTo(0, 0);
        };
        window.addEventListener('hashchange', onChange);
        return () => window.removeEventListener('hashchange', onChange);
    }, []);

    const navigate = useCallback((to: PageId) => {
        const hash = to === 'dashboard' ? '#/' : `#/${to}`;
        if (window.location.hash !== hash) window.location.hash = hash;
    }, []);

    return { page, navigate };
}
