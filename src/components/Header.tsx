import React from 'react';
import { UserProfile } from '../types';
import { Clock, User, Calendar, Building2, Lock, ShieldCheck, BarChart3, Edit3 } from 'lucide-react';

interface HeaderProps {
  activeTab: 'input' | 'admin';
  setActiveTab: (tab: 'input' | 'admin') => void;
  user: UserProfile | null;
  onEditUser: () => void;
  onOpenAdmin: () => void;
  isAdminAuthenticated: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  user,
  onEditUser,
  onOpenAdmin,
  isAdminAuthenticated,
}) => {
  return (
    <header className="app-header">
      <div className="header-top">
        <div className="brand-logo">
          <div className="logo-icon">
            <Clock className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="title-main">看護部 タイムスタディ</h1>
            <p className="title-sub">業務時間・行動調査システム</p>
          </div>
        </div>

        <div className="header-right-actions">
          {user ? (
            <button className="user-profile-badge" onClick={onEditUser} title="登録属性の変更・削除">
              <User className="w-4 h-4 text-sky-600" />
              <div className="user-info-text">
                <div className="flex items-center gap-1.5">
                  <span className="user-name">{user.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${user.role === '看護補助者' ? 'bg-emerald-100 text-emerald-800' : 'bg-sky-100 text-sky-800'}`}>
                    {user.role || '看護師'}
                  </span>
                </div>
                <span className="user-dept">
                  <Building2 className="inline-icon" />
                  {user.department} ({user.ageGroup})
                </span>
              </div>
              <Edit3 className="w-3.5 h-3.5 text-slate-400 ml-1" />
            </button>
          ) : (
            <button className="user-profile-badge" onClick={onEditUser}>
              <User className="w-4 h-4 text-sky-600" />
              <span>ユーザー未登録</span>
            </button>
          )}

          <button
            className={`btn-admin-login-badge ${isAdminAuthenticated ? 'authenticated' : ''}`}
            onClick={onOpenAdmin}
            title="管理者ログイン（パスワード保護）"
          >
            {isAdminAuthenticated ? (
              <>
                <ShieldCheck className="w-4 h-4 text-purple-600" />
                <span>管理コンソール</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 text-amber-600" />
                <span>管理者ログイン</span>
              </>
            )}
          </button>
        </div>
      </div>

      <nav className="header-nav">
        <button
          className={`nav-tab ${activeTab === 'input' ? 'active' : ''}`}
          onClick={() => setActiveTab('input')}
        >
          <Clock className="w-4 h-4" />
          <span>タイムスタディ入力（{user ? user.role : '看護部'}）</span>
        </button>

        {isAdminAuthenticated && (
          <button
            className={`nav-tab ${activeTab === 'admin' ? 'active' : ''}`}
            onClick={() => setActiveTab('admin')}
          >
            <BarChart3 className="w-4 h-4 text-purple-300" />
            <span>管理画面（集計・分析・設定）</span>
          </button>
        )}
      </nav>

      {user && activeTab === 'input' && (
        <div className="target-date-bar">
          <Calendar className="w-4 h-4 text-sky-600" />
          <span>対象調査日: <strong>{user.targetDate}</strong></span>
        </div>
      )}
    </header>
  );
};
