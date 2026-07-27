import React from 'react';
import { UserProfile } from '../types';
import { Clock, User, Calendar, Building2, Lock, ShieldCheck, BarChart3, Edit3, Smartphone } from 'lucide-react';

interface HeaderProps {
  activeTab: 'input' | 'admin';
  setActiveTab: (tab: 'input' | 'admin') => void;
  user: UserProfile | null;
  targetDate: string;
  onChangeTargetDate: (date: string) => void;
  shiftType?: ShiftType;
  onEditUser: () => void;
  onLogoutUser?: () => void;
  onOpenAdmin: () => void;
  isAdminAuthenticated: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  user,
  targetDate,
  onChangeTargetDate,
  shiftType = 'day',
  onEditUser,
  onLogoutUser,
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
            <div className="flex items-center gap-1.5">
              <button className="user-profile-badge" onClick={onEditUser} title="登録属性の変更">
                <User className="w-4 h-4 text-sky-600" />
                <div className="user-info-text">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {user.staffId && (
                      <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono font-bold border border-slate-200">
                        ID:{user.staffId}
                      </span>
                    )}
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

              {onLogoutUser && (
                <button
                  type="button"
                  className="p-2 text-slate-300 hover:text-white bg-white/10 hover:bg-white/20 rounded-lg transition-colors flex items-center gap-1 text-xs"
                  onClick={onLogoutUser}
                  title="別の職員IDでログイン（ログアウト）"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">切替</span>
                </button>
              )}
            </div>
          ) : (
            <button className="user-profile-badge" onClick={onEditUser}>
              <User className="w-4 h-4 text-sky-600" />
              <span>職員ID ログイン</span>
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
        <div className="target-date-bar flex-wrap gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Calendar className="w-4 h-4 text-sky-600 shrink-0" />
            <span className="font-semibold text-xs text-sky-900 shrink-0">対象調査日:</span>
            <input
              type="date"
              className="bg-white border border-sky-300 text-sky-900 font-bold text-xs px-2 py-0.5 rounded outline-none focus:ring-2 focus:ring-sky-400"
              value={targetDate}
              onChange={(e) => onChangeTargetDate(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2 ml-auto flex-wrap">
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 ${
              shiftType === 'night'
                ? 'bg-purple-100 text-purple-800 border border-purple-200'
                : 'bg-amber-100 text-amber-800 border border-amber-200'
            }`}>
              {shiftType === 'night' ? '🌙 夜勤 (16:30-翌9:30)' : '☀️ 日勤 (8:30-17:15)'}
            </span>

            {user.deviceId && (
              <div className="flex items-center gap-1 text-[11px] text-sky-700 bg-sky-100/80 px-2 py-0.5 rounded-full font-medium shrink-0">
                <Smartphone className="w-3 h-3 text-sky-600" />
                <span>端末管理: {user.deviceId}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
