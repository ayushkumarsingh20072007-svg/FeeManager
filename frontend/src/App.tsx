import React, { useEffect, useState } from 'react';
import { UserProfile } from './types';
import { AuthService } from './services/auth';
import { ApiClient } from './services/api';
import { VignanHeader } from './components/VignanHeader';
import { Sidebar } from './components/Sidebar';
import { RobotHero } from './components/RobotHero';
import { ChatInterface } from './components/ChatInterface';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { StudentsPage } from './pages/StudentsPage';
import { FeeManagementPage } from './pages/FeeManagementPage';
import { FeeDemandsPage } from './pages/FeeDemandsPage';
import { FeeStructuresPage } from './pages/FeeStructuresPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { ReconciliationPage } from './pages/ReconciliationPage';
import { AgingPage } from './pages/AgingPage';
import { RefundsPage } from './pages/RefundsPage';
import { ApprovalsPage } from './pages/ApprovalsPage';
import { ReportsPage } from './pages/ReportsPage';
import { DatabaseLedgerPage } from './pages/DatabaseLedgerPage';
import { UsersRolesPage } from './pages/UsersRolesPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { IntegrationsPage } from './pages/IntegrationsPage';
import { SettingsPage } from './pages/SettingsPage';
import { StudentPortalPage } from './pages/StudentPortalPage';
import { LoadingState } from './components/LoadingState';

export const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);
  const [selectedYear, setSelectedYear] = useState<string>('2026-27');
  const [resetNotification, setResetNotification] = useState<string | null>(null);

  const initAuth = async () => {
    try {
      await ApiClient.getHealth();

      // On browser reload/refresh, automatically reset demo student approval states so live demo is fresh for evaluator
      try {
        await ApiClient.post('/integrations/demo-reset');
      } catch (dErr) {
        console.warn('Demo reset on init:', dErr);
      }

      const token = AuthService.getStoredToken();
      if (token) {
        const u = await AuthService.getMe();
        setUser(u);
        if (u.role === 'STUDENT') {
          setCurrentTab('student-dashboard');
        }
      }
    } catch (err) {
      console.warn('Session initialization', err);
      AuthService.logout();
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initAuth();
  }, []);

  const handleLogout = () => {
    AuthService.logout();
    setUser(null);
  };

  const handleSwitchUser = async (email: string) => {
    try {
      const studentPasswordMap: Record<string, string> = {
        'aravind.k@student.edu': 'STU1001',
        'priya.s@student.edu': 'STU1002',
        'meera.i@student.edu': 'STU1014',
      };
      const pw = studentPasswordMap[email] || 'password123';
      const data = await AuthService.login(email, pw);
      setUser(data.user);
      if (data.user.role === 'STUDENT') {
        setCurrentTab('student-dashboard');
      } else {
        setCurrentTab('dashboard');
      }
    } catch (e) {
      console.error('Fast switch failed', e);
    }
  };

  const handleResetDemo = async () => {
    try {
      await ApiClient.post('/integrations/demo-reset');
      setResetNotification('Demo State Reset: Priya Sharma (fees due) and Meera Iyer (attendance shortage) are now in fresh locked states!');
      setTimeout(() => setResetNotification(null), 5000);
      if (user) {
        const u = await AuthService.getMe();
        setUser(u);
      }
    } catch (e) {
      console.error('Demo reset failed', e);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#edf3fd] flex items-center justify-center text-blue-900">
        <LoadingState message="Initializing Vignan's Agentic AI Day 2026 Assistant..." />
      </div>
    );
  }

  if (!user) {
    return (
      <LoginPage
        onLoginSuccess={(u) => {
          setUser(u);
          if (u.role === 'STUDENT') {
            setCurrentTab('student-dashboard');
          } else {
            setCurrentTab('dashboard');
          }
        }}
      />
    );
  }

  // Render the appropriate main view based on current active tab & authenticated role
  const renderCurrentView = () => {
    // If student is logged in, strictly render the Student Portal view
    if (user.role === 'STUDENT') {
      if (currentTab === 'ai-assistant') {
        return (
          <div className="flex-1 flex flex-col max-w-6xl w-full mx-auto shadow-md border-x border-blue-200/60 bg-white">
            <RobotHero />
            <ChatInterface
              user={user}
              onOpenLedgerTab={() => setCurrentTab('student-ledger')}
            />
          </div>
        );
      }
      return (
        <StudentPortalPage
          user={user}
          activeTab={currentTab}
          onSelectTab={(tab) => setCurrentTab(tab)}
        />
      );
    }

    // Finance Department / Administrative ERP Views
    switch (currentTab) {
      case 'dashboard':
        return <DashboardPage user={user} onNavigate={(tab) => setCurrentTab(tab)} />;
      case 'ai-assistant':
        return (
          <div className="flex-1 flex flex-col max-w-6xl w-full mx-auto shadow-md border-x border-blue-200/60 bg-white">
            <RobotHero />
            <ChatInterface
              user={user}
              onOpenLedgerTab={() => setCurrentTab('database-ledger')}
            />
          </div>
        );
      case 'programs':
      case 'students':
        return <StudentsPage />;
      case 'fee-management':
        return <FeeManagementPage onNavigate={(tab) => setCurrentTab(tab)} />;
      case 'fee-demands':
        return <FeeDemandsPage />;
      case 'fee-structures':
        return <FeeStructuresPage />;
      case 'payments':
        return <PaymentsPage />;
      case 'reconciliation':
      case 'accounting':
        return <ReconciliationPage />;
      case 'aging':
        return <AgingPage />;
      case 'refunds':
        return <RefundsPage />;
      case 'approvals':
      case 'counsellor-desk':
        return <ApprovalsPage initialTab={currentTab === 'counsellor-desk' ? 'counsellor-desk' : 'financial-approvals'} />;
      case 'reports':
        return <ReportsPage />;
      case 'database-ledger':
        return <DatabaseLedgerPage />;
      case 'users-roles':
        return <UsersRolesPage />;
      case 'integrations':
        return <IntegrationsPage user={user} />;
      case 'audit-logs':
        return (
          <div className="p-4 sm:p-6 max-w-7xl mx-auto">
            <AuditLogsPage />
          </div>
        );
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardPage user={user} onNavigate={(tab) => setCurrentTab(tab)} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] flex flex-col font-sans text-slate-800">
      {/* 1. Official Header matching Vignan's template with drawer & collapse controls */}
      <VignanHeader
        user={user}
        onLogout={handleLogout}
        onSwitchUser={handleSwitchUser}
        onResetDemo={handleResetDemo}
        onToggleSidebar={() => {
          // On mobile, toggle mobile drawer; on desktop, toggle collapse
          if (window.innerWidth < 768) {
            setIsMobileOpen((prev) => !prev);
          } else {
            setIsCollapsed((prev) => !prev);
          }
        }}
        selectedYear={selectedYear}
        onSelectYear={(yr) => setSelectedYear(yr)}
      />

      {/* Evaluator Demo Reset Toast Notice */}
      {resetNotification && (
        <div className="bg-gradient-to-r from-amber-600 via-amber-700 to-slate-900 text-white px-4 py-2 text-xs font-bold flex items-center justify-between shadow-md animate-in slide-in-from-top-2 duration-200 sticky top-14 z-30">
          <div className="flex items-center gap-2">
            <span className="text-base">🔄</span>
            <span>{resetNotification}</span>
          </div>
          <button
            onClick={() => setResetNotification(null)}
            className="text-white/80 hover:text-white text-xs px-2 py-0.5 rounded-sm hover:bg-white/20 cursor-pointer ml-4 transition-colors"
          >
            Dismiss ✕
          </button>
        </div>
      )}

      {/* 2. Main Layout with Sidebar & Content View */}
      <div className="flex-1 flex w-full">
        {/* Collapsible / Drawer Left Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(id) => setCurrentTab(id)}
          user={user}
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed((prev) => !prev)}
          isMobileOpen={isMobileOpen}
          onCloseMobile={() => setIsMobileOpen(false)}
          onLogout={handleLogout}
        />

        {/* Dynamic Main Workspace Area */}
        <main className="flex-1 overflow-y-auto min-h-[calc(100vh-3.5rem)] pb-12">
          {renderCurrentView()}
        </main>
      </div>
    </div>
  );
};
