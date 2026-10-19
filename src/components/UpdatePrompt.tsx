/// <reference types="vite-plugin-pwa/react" />
import { useRegisterSW } from 'virtual:pwa-register/react';
import Button from './ui/Button';
import Icon from './ui/Icon';

const CHECK_INTERVAL_MS = 60 * 60 * 1000;

/**
 * iOS home-screen apps rarely reload on their own, so new versions can sit
 * unnoticed. Check hourly and offer a one-tap reload when an update is ready.
 */
export default function UpdatePrompt() {
    const { needRefresh: [needRefresh, setNeedRefresh], updateServiceWorker } = useRegisterSW({
        onRegisteredSW(_url, registration) {
            if (registration) setInterval(() => registration.update(), CHECK_INTERVAL_MS);
        },
    });

    if (!needRefresh) return null;

    return (
        <div className="fixed z-[60] inset-x-4 top-[calc(0.75rem+var(--safe-top))] md:inset-x-auto md:right-6 md:top-6 md:w-96 flex items-center gap-3 bg-surface rounded-2xl px-4 py-3 shadow-2xl border animate-pop-in">
            <Icon name="sync" className="text-primary shrink-0" />
            <p className="flex-1 text-sm font-medium">Đã có phiên bản mới.</p>
            <Button variant="ghost" onClick={() => setNeedRefresh(false)}>Để sau</Button>
            <Button onClick={() => updateServiceWorker(true)}>Tải lại</Button>
        </div>
    );
}
