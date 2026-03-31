import { useState } from 'react';
import Layout, { type PageId } from './components/Layout';
import Dashboard from './components/Dashboard';
import ClassifyPage from './components/ClassifyPage';
import Analytics from './components/Analytics';
import HistoryPage from './components/HistoryPage';
import FinancePage from './components/FinancePage';
import SyncPage from './components/SyncPage';

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageId>('dashboard');

  // if (!accessToken) {
  //   return <LoginButton />;
  // }

  const renderPage = () => {
    switch (currentPage) {
      case 'sync':
        return <SyncPage />;
      case 'classify':
        return <ClassifyPage />;
      case 'history':
        return <HistoryPage onNavigate={setCurrentPage} />;
      case 'finance':
        return <FinancePage />;
      case 'analytics':
        return (
          <div className="p-6 md:p-10 min-w-0 max-w-[1200px] mx-auto">
            <section className="mb-10">
              <h2 className="text-[32px] font-black tracking-tight text-on-background mb-2">Phân tích chi tiêu</h2>
              <p className="text-outline font-medium">Biểu đồ và thống kê chi tiêu theo danh mục</p>
            </section>
            <Analytics />
          </div>
        );
      default:
        return <Dashboard onNavigate={setCurrentPage} />;
    }
  };

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
}
