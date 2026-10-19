import { useState } from 'react';
import GoalsTab from './GoalsTab';
import IncomeTab from './IncomeTab';
import PageHeader from './ui/PageHeader';
import SegmentedControl from './ui/SegmentedControl';

type TabId = 'income' | 'goals';

export default function FinancePage({ onBack }: { onBack: () => void }) {
    const [tab, setTab] = useState<TabId>('income');

    return (
        <>
            <PageHeader title="Tài chính" subtitle="Nguồn thu nhập và mục tiêu tài chính" onBack={onBack} />
            <SegmentedControl
                className="mb-4 md:max-w-xs"
                options={[{ value: 'income', label: 'Thu nhập' }, { value: 'goals', label: 'Mục tiêu' }]}
                value={tab}
                onChange={setTab}
            />
            {tab === 'income' ? <IncomeTab /> : <GoalsTab />}
        </>
    );
}
