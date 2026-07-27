import React, { useState } from 'react';
import { UserProfile, Department, AgeGroup, JobRole, ShiftType } from '../types';
import { DEPARTMENTS, AGE_GROUPS } from '../constants';
import { findUserByStaffId } from '../utils/storage';
import { User, Building2, Calendar, Award, CheckCircle2, Trash2, AlertTriangle, Stethoscope, Smartphone, CreditCard, LogIn, ArrowLeft, Sun, Moon, HelpCircle, Clock, X, ShieldCheck, UserPlus, LogIn as LogInIcon } from 'lucide-react';

interface UserSetupModalProps {
  initialUser: UserProfile | null;
  initialTargetDate?: string;
  initialShiftType?: ShiftType;
  initialCustomStart?: string;
  initialCustomEnd?: string;
  onSave: (
    user: UserProfile,
    targetDate: string,
    shiftType: ShiftType,
    customStart?: string,
    customEnd?: string
  ) => void;
  onOpenAdmin: () => void;
  onDeleteProfile?: () => void;
  isInitialSetup?: boolean;
}

export const UserSetupModal: React.FC<UserSetupModalProps> = ({
  initialUser,
  initialTargetDate,
  initialShiftType = 'day',
  initialCustomStart = '09:00',
  initialCustomEnd = '18:00',
  onSave,
  onOpenAdmin,
  onDeleteProfile,
  isInitialSetup = false,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  // ステップ状態: 'welcome' (スタート選択メニュー) | 'id' (職員IDログイン) | 'profile' (新規ユーザー登録) | 'admin' (管理者認証)
  const [step, setStep] = useState<'welcome' | 'id' | 'profile' | 'admin'>('welcome');

  const [staffId, setStaffId] = useState<string>(initialUser?.staffId || '');
  const [name, setName] = useState<string>(initialUser?.name || '');
  const [role, setRole] = useState<JobRole>(initialUser?.role || '看護師');
  const [department, setDepartment] = useState<Department>(
    initialUser?.department || 'ICU'
  );
  const [ageGroup, setAgeGroup] = useState<AgeGroup>(
    initialUser?.ageGroup || '25〜29歳'
  );

  // 入力日 ＆ 勤務シフト
  const [targetDate, setTargetDate] = useState<string>(initialTargetDate || todayStr);
  const [shiftType, setShiftType] = useState<ShiftType>(initialShiftType);
  const [customStartTime, setCustomStartTime] = useState<string>(initialCustomStart);
  const [customEndTime, setCustomEndTime] = useState<string>(initialCustomEnd);

  // 管理者パスワード入力用
  const [adminPassword, setAdminPassword] = useState<string>('');

  const [errorMsg, setErrorMsg] = useState<string>('');
  const [showConfirmDelete, setShowConfirmDelete] = useState<boolean>(false);

  // 職員IDの入力＆自動検索
  const handleStaffIdChange = (val: string) => {
    const cleanId = val.replace(/\D/g, '').slice(0, 6);
    setStaffId(cleanId);
    setErrorMsg('');

    if (cleanId.length === 6) {
      const existing = findUserByStaffId(cleanId);
      if (existing) {
        setName(existing.name);
        setRole(existing.role);
        setDepartment(existing.department);
        setAgeGroup(existing.ageGroup);
      }
    }
  };

  const existingUserFound = staffId.length === 6 ? findUserByStaffId(staffId) : null;

  // ステップ1 (職員ID入力・認証) からの進行またはログイン完了
  const handleProceedFromStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffId.trim() || !/^\d{6}$/.test(staffId.trim())) {
      setErrorMsg('職員IDは半角数字6桁で入力してください。（例: 123456）');
      return;
    }
    setErrorMsg('');

    if (existingUserFound) {
      // 登録済みユーザーの場合：そのままログインを確定してタイムスタディ画面へ！
      onSave(
        {
          staffId: staffId.trim(),
          name: existingUserFound.name,
          role: existingUserFound.role,
          department: existingUserFound.department,
          ageGroup: existingUserFound.ageGroup,
          deviceId: initialUser?.deviceId,
        },
        targetDate,
        shiftType,
        customStartTime,
        customEndTime
      );
    } else {
      // 未登録IDの場合：ステップ2 (ユーザー登録) へ進む
      setStep('profile');
    }
  };

  // ステップ2 (新規ユーザー登録) の完了 ➔ タイムスタディ画面へ直接遷移！
  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffId.trim() || !/^\d{6}$/.test(staffId.trim())) {
      setErrorMsg('職員IDは半角数字6桁で入力してください。');
      return;
    }
    if (!name.trim()) {
      setErrorMsg('氏名を入力してください。');
      return;
    }
    if (shiftType === 'custom' && (!customStartTime || !customEndTime)) {
      setErrorMsg('「その他」が選択されています。勤務開始時間と終了時間を入力してください。');
      return;
    }
    setErrorMsg('');

    const newUserProfile: UserProfile = {
      staffId: staffId.trim(),
      name: name.trim(),
      role,
      department,
      ageGroup,
      deviceId: initialUser?.deviceId,
    };

    onSave(newUserProfile, targetDate, shiftType, customStartTime, customEndTime);
  };

  // 管理者パスワード認証処理 (okasaikango)
  const handleAdminAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword === 'okasaikango') {
      setErrorMsg('');
      onOpenAdmin();
    } else {
      setErrorMsg('管理者パスワードが正しくありません。');
    }
  };

  const handleConfirmDelete = () => {
    if (onDeleteProfile) {
      onDeleteProfile();
    }
    setShowConfirmDelete(false);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-card modal-setup">
        {/* ==================================================== */}
        {/* スタート選択メニュー画面 ('welcome')                 */}
        {/* ==================================================== */}
        {step === 'welcome' && (
          <div className="space-y-4">
            <div className="setup-header text-center">
              <div className="setup-icon-badge mx-auto bg-sky-100 p-3 rounded-2xl w-14 h-14 flex items-center justify-center mb-2">
                <Stethoscope className="w-8 h-8 text-sky-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">看護業務 タイムスタディ調査</h2>
              <p className="setup-sub text-xs text-slate-600 mt-1">
                ご利用の目的・利用状況に合わせて、以下のボタンを選択してください。
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 pt-2">
              {/* 🟢 1. 初めて使う（新規登録） */}
              <button
                type="button"
                onClick={() => {
                  setErrorMsg('');
                  setStep('profile');
                }}
                className="p-4 rounded-2xl border-2 border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-950 flex items-center gap-3.5 text-left transition-all duration-150 active:scale-98 shadow-sm group"
              >
                <div className="p-2.5 rounded-xl bg-emerald-600 text-white shrink-0 group-hover:scale-105 transition-transform">
                  <UserPlus className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-extrabold text-sm text-emerald-900 flex items-center gap-1.5">
                    <span>初めて使う</span>
                    <span className="text-[10px] bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full font-bold">新規登録</span>
                  </div>
                  <div className="text-xs text-emerald-700 mt-0.5">
                    職員ID・氏名・部署・職種を登録して調査を開始します
                  </div>
                </div>
              </button>

              {/* 🔵 2. 既に登録済み（ログイン） */}
              <button
                type="button"
                onClick={() => {
                  setErrorMsg('');
                  setStep('id');
                }}
                className="p-4 rounded-2xl border-2 border-sky-300 bg-sky-50 hover:bg-sky-100 text-sky-950 flex items-center gap-3.5 text-left transition-all duration-150 active:scale-98 shadow-sm group"
              >
                <div className="p-2.5 rounded-xl bg-sky-600 text-white shrink-0 group-hover:scale-105 transition-transform">
                  <LogInIcon className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-extrabold text-sm text-sky-900 flex items-center gap-1.5">
                    <span>既に登録済み</span>
                    <span className="text-[10px] bg-sky-200 text-sky-800 px-2 py-0.5 rounded-full font-bold">ログイン</span>
                  </div>
                  <div className="text-xs text-sky-700 mt-0.5">
                    登録済みの6桁の職員IDを入力してログイン・入力開始します
                  </div>
                </div>
              </button>

              {/* 🟣 3. 管理者画面へ入る */}
              <button
                type="button"
                onClick={() => {
                  setErrorMsg('');
                  setStep('admin');
                }}
                className="p-3.5 rounded-2xl border-2 border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-950 flex items-center gap-3.5 text-left transition-all duration-150 active:scale-98 shadow-sm group mt-1"
              >
                <div className="p-2 rounded-xl bg-rose-600 text-white shrink-0 group-hover:scale-105 transition-transform">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-extrabold text-xs text-rose-900 flex items-center gap-1.5">
                    <span>管理者画面へ入る</span>
                    <span className="text-[10px] bg-rose-200 text-rose-800 px-1.5 py-0.5 rounded-full font-bold">管理・分析</span>
                  </div>
                  <div className="text-[11px] text-rose-700 mt-0.5">
                    パスワードを入力して業務量集計・分析ダッシュボードを表示
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* 既に登録済み：職員ID入力・ログイン画面 ('id')       */}
        {/* ==================================================== */}
        {step === 'id' && (
          <>
            <div className="setup-header">
              <div className="flex items-center justify-between mb-2">
                <button
                  type="button"
                  className="text-xs text-sky-600 hover:text-sky-800 font-bold flex items-center gap-1 px-2 py-1 bg-sky-50 rounded-lg border border-sky-200"
                  onClick={() => setStep('welcome')}
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>メニューに戻る</span>
                </button>
              </div>
              <h2>職員ID（6桁）の入力</h2>
              <p className="setup-sub">
                登録済みの6桁の職員IDを入力してください。
              </p>
            </div>

            <form onSubmit={handleProceedFromStep1} className="setup-form">
              {errorMsg && <div className="form-error">{errorMsg}</div>}

              <div className="form-group">
                <label className="form-label">
                  <CreditCard className="w-4 h-4 text-sky-600" />
                  <span>職員ID <span className="req-badge">必須 6桁</span></span>
                </label>
                <input
                  type="text"
                  className="form-input font-mono text-center text-lg tracking-widest"
                  placeholder="例: 123456"
                  maxLength={6}
                  value={staffId}
                  onChange={(e) => handleStaffIdChange(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              {/* 2回目以降ログイン時：氏名確認・ログイン確認カード */}
              {existingUserFound ? (
                <div className="bg-sky-50 border-2 border-sky-300 text-sky-900 p-3.5 rounded-2xl shadow-sm space-y-2.5 animate-fadeIn mt-3">
                  <div className="flex items-center gap-2 font-extrabold text-sky-900 text-sm">
                    <HelpCircle className="w-5 h-5 text-sky-600 shrink-0" />
                    <span>{existingUserFound.name} さんとしてログインして入力開始してよいですか？</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-sky-100 text-xs space-y-1">
                    <div>氏名: <strong className="text-sm text-slate-900 font-extrabold">{existingUserFound.name}</strong> さん</div>
                    <div>所属: <strong>{existingUserFound.department}</strong>（{existingUserFound.role} / {existingUserFound.ageGroup}）</div>
                  </div>

                  {/* 「はい」 「違います」 ボタン */}
                  <div className="grid grid-cols-2 gap-2.5 pt-1">
                    <button
                      type="submit"
                      className="btn-primary py-2.5 text-sm font-bold flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>はい</span>
                    </button>

                    <button
                      type="button"
                      className="btn-secondary py-2.5 text-sm font-bold flex items-center justify-center gap-1.5 border border-slate-300"
                      onClick={() => {
                        setStaffId('');
                        setErrorMsg('');
                      }}
                    >
                      <X className="w-4 h-4 text-slate-500" />
                      <span>違います</span>
                    </button>
                  </div>
                </div>
              ) : staffId.length === 6 ? (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 p-2.5 rounded-xl text-xs flex items-center gap-2">
                  <User className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>職員ID６桁を半角数字で入力してください</span>
                </div>
              ) : null}

              {!existingUserFound && (
                <div className="flex flex-col gap-2 mt-3">
                  <button type="submit" className="btn-primary btn-submit-setup py-3">
                    <LogIn className="w-5 h-5" />
                    <span>次へ進む (ユーザー登録へ) →</span>
                  </button>
                </div>
              )}
            </form>
          </>
        )}

        {/* ==================================================== */}
        {/* 初めて使う：新規ユーザー登録画面 ('profile')          */}
        {/* ==================================================== */}
        {step === 'profile' && (
          <>
            <div className="setup-header">
              <div className="flex items-center justify-between mb-2">
                <button
                  type="button"
                  className="text-xs text-sky-600 hover:text-sky-800 font-bold flex items-center gap-1 px-2 py-1 bg-sky-50 rounded-lg border border-sky-200"
                  onClick={() => setStep('welcome')}
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>メニューに戻る</span>
                </button>
              </div>
              <h2>新規ユーザー登録（職員設定）</h2>
              <p className="setup-sub">
                職員ID・氏名・職種・所属部署を設定してください。
              </p>
            </div>

            <form onSubmit={handleProfileSubmit} className="setup-form">
              {errorMsg && <div className="form-error">{errorMsg}</div>}

              {/* 職員ID (6桁) ＆ 氏名 (横2列配置) */}
              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">
                    <CreditCard className="w-3.5 h-3.5 text-sky-600" />
                    <span>職員ID <span className="req-badge">必須 6桁</span></span>
                  </label>
                  <input
                    type="text"
                    className="form-input font-mono text-center"
                    placeholder="例: 123456"
                    maxLength={6}
                    value={staffId}
                    onChange={(e) => handleStaffIdChange(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    <span>氏名 <span className="req-badge">必須</span></span>
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="例: 山田 花子"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* 職種 & 所属部署 (横2列配置) */}
              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">
                    <Stethoscope className="w-3.5 h-3.5 text-sky-600" />
                    <span>職種 <span className="req-badge">必須</span></span>
                  </label>
                  <select
                    className="form-select"
                    value={role}
                    onChange={(e) => setRole(e.target.value as JobRole)}
                  >
                    <option value="看護師">看護師</option>
                    <option value="看護補助者">看護補助者</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <Building2 className="w-3.5 h-3.5 text-slate-500" />
                    <span>所属部署 <span className="req-badge">選択</span></span>
                  </label>
                  <select
                    className="form-select"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value as Department)}
                  >
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* 職種別専用項目の適用通知案内 */}
              <div className={`p-2.5 rounded-xl text-xs flex items-start gap-2 border ${
                role === '看護師'
                  ? 'bg-sky-50 border-sky-200 text-sky-900'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              }`}>
                <Stethoscope className={`w-4 h-4 shrink-0 mt-0.5 ${role === '看護師' ? 'text-sky-600' : 'text-emerald-600'}`} />
                <div>
                  <div className="font-bold">
                    【{role}】専用の入力業務マスターが自動割り振られます
                  </div>
                  <div className="text-[11px] mt-0.5 text-slate-600">
                    {role === '看護師'
                      ? 'バイタル測定・処置・点滴・カルテ入力・カンファレンスなどの看護師専用項目が表示されます。'
                      : '体位変換・清拭介助・リネン管理・メッセンジャー・オムツ交換などの看護補助者専用項目が表示されます。'}
                  </div>
                </div>
              </div>

              {/* 年齢階層 & 調査対象日 (横2列配置) */}
              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">
                    <Award className="w-3.5 h-3.5 text-slate-500" />
                    <span>年齢階層 <span className="req-badge">5歳刻み</span></span>
                  </label>
                  <select
                    className="form-select"
                    value={ageGroup}
                    onChange={(e) => setAgeGroup(e.target.value as AgeGroup)}
                  >
                    {AGE_GROUPS.map((age) => (
                      <option key={age} value={age}>
                        {age}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <Calendar className="w-3.5 h-3.5 text-sky-600" />
                    <span>入力日（調査日）</span>
                  </label>
                  <input
                    type="date"
                    className="form-input font-bold text-slate-800"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* 勤務シフト選択 (プルダウン) */}
              <div className="form-group">
                <label className="form-label">
                  <Clock className="w-4 h-4 text-sky-600" />
                  <span>勤務シフト <span className="req-badge">選択</span></span>
                </label>

                <select
                  className="form-select font-bold text-slate-800 py-2.5 text-sm"
                  value={shiftType}
                  onChange={(e) => setShiftType(e.target.value as ShiftType)}
                >
                  <option value="day">☀️ 日勤 (08:30 ～ 17:15)</option>
                  <option value="night">🌙 夜勤 (16:30 ～ 翌09:30)</option>
                  <option value="custom">⏱️ その他 (勤務開始時間・終了時間を直接入力)</option>
                </select>
              </div>

              {/* 「その他」が選択された場合：カスタム勤務時間入力フォーム */}
              {shiftType === 'custom' && (
                <div className="bg-amber-50 border-2 border-amber-300 p-3 rounded-2xl space-y-2 animate-fadeIn">
                  <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>勤務開始時間と終了時間を設定してください</span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">開始時間</label>
                      <input
                        type="time"
                        className="form-input font-mono font-bold text-center"
                        value={customStartTime}
                        onChange={(e) => setCustomStartTime(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">終了時間</label>
                      <input
                        type="time"
                        className="form-input font-mono font-bold text-center"
                        value={customEndTime}
                        onChange={(e) => setCustomEndTime(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                </div>
              )}

              <button type="submit" className="btn-primary btn-submit-setup mt-3 py-3">
                <CheckCircle2 className="w-5 h-5" />
                <span>ユーザー登録を完了してタイムスタディを開始 →</span>
              </button>

              {!isInitialSetup && onDeleteProfile && (
                <div className="delete-profile-wrapper">
                  <button
                    type="button"
                    className="btn-delete-profile"
                    onClick={() => setShowConfirmDelete(true)}
                  >
                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                    <span>登録情報・一時保存データを削除する</span>
                  </button>
                </div>
              )}
            </form>
          </>
        )}

        {/* ==================================================== */}
        {/* 管理者認証画面 ('admin')                              */}
        {/* ==================================================== */}
        {step === 'admin' && (
          <>
            <div className="setup-header">
              <div className="flex items-center justify-between mb-2">
                <button
                  type="button"
                  className="text-xs text-sky-600 hover:text-sky-800 font-bold flex items-center gap-1 px-2 py-1 bg-sky-50 rounded-lg border border-sky-200"
                  onClick={() => setStep('welcome')}
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>メニューに戻る</span>
                </button>
              </div>
              <div className="flex items-center gap-2 text-rose-900 font-bold text-lg">
                <ShieldCheck className="w-6 h-6 text-rose-600" />
                <span>管理者認証</span>
              </div>
              <p className="setup-sub">
                管理者専用の集計・分析・設定画面を開くにはパスワードを入力してください。
              </p>
            </div>

            <form onSubmit={handleAdminAuthSubmit} className="setup-form">
              {errorMsg && <div className="form-error">{errorMsg}</div>}

              <div className="form-group">
                <label className="form-label">
                  <ShieldCheck className="w-4 h-4 text-rose-600" />
                  <span>管理者パスワード</span>
                </label>
                <input
                  type="password"
                  className="form-input text-center text-lg font-mono tracking-widest"
                  placeholder="パスワードを入力"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              <button type="submit" className="btn-primary bg-rose-600 hover:bg-rose-700 py-3 mt-2">
                <ShieldCheck className="w-5 h-5" />
                <span>管理者認証を行って管理画面を開く →</span>
              </button>
            </form>
          </>
        )}

        {/* 誤操作防止の安全確認ダイアログ */}
        {showConfirmDelete && (
          <div className="confirm-delete-overlay">
            <div className="confirm-delete-card">
              <AlertTriangle className="w-8 h-8 text-amber-500 mb-2" />
              <h3>登録情報を削除しますか？</h3>
              <p>
                登録されている氏名・部署・入力途中の一時保存データが消去されます。本当によろしいですか？
              </p>
              <div className="confirm-buttons-flex">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowConfirmDelete(false)}
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  className="btn-danger"
                  onClick={handleConfirmDelete}
                >
                  削除する
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
