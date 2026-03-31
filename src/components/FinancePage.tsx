import { useState } from 'react';
import IncomeTab from './IncomeTab';
import GoalsTab from './GoalsTab';

type TabId = 'income' | 'goals';

export default function FinancePage() {
    const [activeTab, setActiveTab] = useState<TabId>('income');

    const tabs: { id: TabId; icon: string; label: string }[] = [
        { id: 'income', icon: 'account_balance_wallet', label: 'Thu nhập' },
        { id: 'goals', icon: 'flag', label: 'Mục tiêu' },
    ];

    return (
        <div className="p-6 md:p-10 min-w-0 max-w-[1200px] mx-auto">
            {/* Page Header */}
            <section className="mb-8">
                <h2 className="text-[32px] font-black tracking-tight text-on-background mb-2">Tài chính cá nhân</h2>
                <p className="text-outline font-medium">Quản lý nguồn thu nhập và mục tiêu tài chính</p>
            </section>

            {/* Tab Switcher */}
            <div className="flex gap-2 mb-8 bg-surface-container-low p-1.5 rounded-xl w-fit">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold transition-all duration-200 cursor-pointer ${activeTab === tab.id
                            ? 'bg-surface-container-lowest text-primary shadow-sm'
                            : 'text-outline hover:text-on-surface'
                            }`}
                    >
                        <span className="material-symbols-outlined text-[20px]">{tab.icon}</span>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            {activeTab === 'income' ? <IncomeTab /> : <GoalsTab />}
        </div>
    );
}
