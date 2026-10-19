import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import ClassifyPage from './components/ClassifyPage';
import Analytics from './components/Analytics';
import HistoryPage from './components/HistoryPage';
import FinancePage from './components/FinancePage';
import SyncPage from './components/SyncPage';
import MorePage from './components/MorePage';
import UpdatePrompt from './components/UpdatePrompt';
import { useRoute } from './lib/router';
import { useTheme } from './lib/theme';

export default function App() {
    const { page, navigate } = useRoute();
    const { pref, setPref } = useTheme();
    const backToMore = () => navigate('more');

    const renderPage = () => {
        switch (page) {
            case 'classify':
                return <ClassifyPage onNavigate={navigate} />;
            case 'history':
                return <HistoryPage />;
            case 'analytics':
                return <Analytics onNavigate={navigate} />;
            case 'more':
                return <MorePage onNavigate={navigate} theme={pref} onThemeChange={setPref} />;
            case 'finance':
                return <FinancePage onBack={backToMore} />;
            case 'sync':
                return <SyncPage onBack={backToMore} onNavigate={navigate} />;
            default:
                return <Dashboard onNavigate={navigate} />;
        }
    };

    return (
        <Layout currentPage={page} onNavigate={navigate} theme={pref} onThemeChange={setPref}>
            {renderPage()}
            <UpdatePrompt />
        </Layout>
    );
}
