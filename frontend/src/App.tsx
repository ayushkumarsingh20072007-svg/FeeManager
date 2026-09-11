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
import { PaymentsPage } from './pages/PaymentsPage';
import { ReconciliationPage } from './pages/ReconciliationPage';
import { AgingPage } from './pages/AgingPage';
import { RefundsPage } from './pages/RefundsPage';
import { ApprovalsPage } from './pages/ApprovalsPage';
import { ReportsPage } from './pages/ReportsPage';
import { DatabaseLedgerPage } from './pages/DatabaseLedgerPage';
import { UsersRolesPage } from './pages/UsersRolesPage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoadingState } from './components/LoadingState';

export const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [isMobileOpen, setIsMobileOpen] = useState<boolean>(false);
  const [selectedYear, setSelectedYear] = useState<string>('2026-27');

  const initAuth = async () => {
    try {
      await ApiClient.getHealth();

      const token = AuthService.getStoredToken();
      if (token) {
        const u = await AuthService.getMe();
        setUser(u);
      } else {
        // Automatically default log in with demo accounts officer for seamless instant ERP view
        const demo = await AuthService.login('accounts@university.edu', 'password123');
        setUser(demo.user);
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
      const data = await AuthService.login(email, 'password123');
      setUser(data.user);
    } catch (e) {
      console.error('Fast switch failed', e);
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
    return <LoginPage onLoginSuccess={(u) => setUser(u)} />;
  }

  // Render the appropriate main view based on current active tab
  const renderCurrentView = () => {
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
      case 'students':
        return <StudentsPage />;
      case 'fee-management':
      case 'fee-demands':
      case 'fee-structures':
        return <FeeManagementPage />;
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
        return <ApprovalsPage />;
      case 'reports':
        return <ReportsPage />;
      case 'database-ledger':
        return <DatabaseLedgerPage />;
      case 'users-roles':
        return <UsersRolesPage />;
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
