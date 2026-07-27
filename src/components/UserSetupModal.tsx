import React, { useState, useEffect } from 'react';
import { UserProfile, Department, AgeGroup, JobRole, ShiftType } from '../types';
import { DEPARTMENTS, AGE_GROUPS } from '../constants';
import { findUserByStaffId, fetchUsersFromVercel } from '../utils/storage';
import {
  User,
  Building2,
  Calendar,
  Award,
  CheckCircle2,
  Trash2,
  AlertTriangle,
  Stethoscope,
  CreditCard,
  LogIn,
  ArrowLeft,
  HelpCircle,
  Clock,
  X,
  ShieldCheck,
  UserPlus,
  LogIn as LogInIcon,
  ChevronRight,
} from 'lucide-react';

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

/** ステップ進捗インジケーター（共通化） */
const StepProgress: React.FC<{ currentStep: 1 | 2 | 3 }> = ({ currentStep }) => (
  <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 font-semibold">
    <span>ステップ進捗</span>
    <div className="flex items-center gap-1.5">
      <span className={`px-2.5 py-0.5 rounded-full ${currentStep === 1 ? 'bg-sky-600 text-white font-bold' : 'bg-slate-200 text-slate-600'}`}>
        1/3 職員ID
      </span>
      <span>→</span>
      <span className={`px-2.5 py-0.5 rounded-full ${currentStep === 2 ? 'bg-sky-600 text-white font-bold' : 'bg-slate-200 text-slate-600'}`}>
        2/3 ユーザー登録
      </span>
      <span>→</span>
      <span className={`px-2.5 py-0.5 rounded-full ${currentStep === 3 ? 'bg-sky-600 text-white font-bold' : 'bg-slate-200 text-slate-600'}`}>
        3/3 調査日・勤務
      </span>
    </div>
  </div>
);

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

  // ステップ状態: 'welcome' | 'id' | 'profile' | 'shift' | 'admin' | 'edit_id' | 'edit_profile'
  const [step, setStep] = useState<'welcome' | 'id' | 'profile' | 'shift' | 'admin' | 'edit_id' | 'edit_profile'>('welcome');

  const [staffId, setStaffId] = useState<string>(initialUser?.staffId || '');
  const [name, setName] = useState<string>(initialUser?.name || '');
  const [role, setRole] = useState<JobRole>(initialUser?.role || '看護師');
  const [department, setDepartment] = useState<Department>(
    initialUser?.department || 'ICU'
  );
  const [ageGroup, setAgeGroup] = useState<AgeGroup>(
    initialUser?.ageGroup || '25〜29歳'
  );

  // 変更・削除用ID入力ステート
  const [editStaffId, setEditStaffId] = useState<string>(initialUser?.staffId || '');
  const [editTargetUser, setEditTargetUser] = useState<UserProfile | null>(initialUser);

  // 入力日 ＆ 勤務シフト
  const [targetDate, setTargetDate] = useState<string>(initialTargetDate || todayStr);
  const [shiftType, setShiftType] = useState<ShiftType>(initialShiftType);
  const [customStartTime, setCustomStartTime] = useState<string>(initialCustomStart);
  const [customEndTime, setCustomEndTime] = useState<string>(initialCustomEnd);

  // 管理者パスワード入力用
  const [adminPassword, setAdminPassword] = useState<string>('');

  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [showConfirmDelete, setShowConfirmDelete] = useState<boolean>(false);

  // モーダル起動時に Vercel クラウドから全端末の最新登録IDを非同期取得
  useEffect(() => {
    fetchUsersFromVercel();
  }, []);

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

  // 変更・削除用 職員ID検索
  const handleEditStaffIdChange = (val: string) => {
    const cleanId = val.replace(/\D/g, '').slice(0, 6);
    setEditStaffId(cleanId);
    setErrorMsg('');

    if (cleanId.length === 6) {
      const found = findUserByStaffId(cleanId);
      if (found) {
        setEditTargetUser(found);
        setName(found.name);
        setRole(found.role);
        setDepartment(found.department);
        setAgeGroup(found.ageGroup);
      } else {
        setEditTargetUser(null);
      }
    } else {
      setEditTargetUser(null);
    }
  };

  const existingUserFound = staffId.length === 6 ? findUserByStaffId(staffId) : null;

  // 【ステップ 1/3】 (職員ID入力) からの進行・ログイン確認
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

  // 【ステップ 2/3】 (ユーザー登録) の完了 ➔ ステップ3へ進む
  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('氏名を入力してください。');
      return;
    }
    setErrorMsg('');
    setStep('shift');
  };

  // 【ステップ 3/3】 (調査日 ＆ 勤務シフト選択) の完了 ➔ タイムスタディ画面へ入る！
  const handleFinalStartStudy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetDate) {
      setErrorMsg('調査対象日を選択してください。');
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
          <div className="flex flex-col items-center text-center space-y-4 py-1 w-full">
            <div className="setup-header text-center mb-1">
              <div className="setup-icon-badge mx-auto bg-sky-100 p-3 rounded-2xl w-14 h-14 flex items-center justify-center mb-2 shadow-xs">
                <Stethoscope className="w-8 h-8 text-sky-600" />
              </div>
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">看護業務 タイムスタディ調査</h2>
              <p className="setup-sub text-xs text-slate-500 mt-1">
                ご利用目的に合わせて以下のボタンを選択してください
              </p>
              {successMsg && (
                <div className="mt-2 bg-emerald-50 border border-emerald-300 text-emerald-800 p-2.5 rounded-xl text-xs font-extrabold animate-fadeIn">
                  {successMsg}
                </div>
              )}
            </div>

            <div className="flex flex-col space-y-3.5 w-full max-w-[420px] mx-auto pt-2">
              {/* 🟢 1. 新規登録 */}
              <button
                type="button"
                onClick={() => {
                  setErrorMsg('');
                  setStep('id');
                }}
                className="w-full h-[72px] px-5 py-3.5 rounded-2xl border-2 border-emerald-200 bg-emerald-50/80 hover:bg-emerald-100/80 text-emerald-950 flex items-center justify-between gap-4 text-left transition-all duration-150 active:scale-98 shadow-2xs group cursor-pointer shrink-0"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white shrink-0 flex items-center justify-center shadow-xs">
                    <UserPlus className="w-6 h-6" />
                  </div>
                  <div className="font-black text-[19px] sm:text-xl text-emerald-950 tracking-tight whitespace-nowrap">新規登録</div>
                </div>
                <ChevronRight className="w-6 h-6 text-emerald-500 group-hover:translate-x-1 transition-transform shrink-0" />
              </button>

              {/* 🔵 2. 既に登録済み */}
              <button
                type="button"
                onClick={() => {
                  setErrorMsg('');
                  setStep('id');
                }}
                className="w-full h-[72px] px-5 py-3.5 rounded-2xl border-2 border-sky-200 bg-sky-50/80 hover:bg-sky-100/80 text-sky-950 flex items-center justify-between gap-4 text-left transition-all duration-150 active:scale-98 shadow-2xs group cursor-pointer shrink-0"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-sky-600 text-white shrink-0 flex items-center justify-center shadow-xs">
                    <LogInIcon className="w-6 h-6" />
                  </div>
                  <div className="font-black text-[19px] sm:text-xl text-sky-950 tracking-tight whitespace-nowrap">既に登録済み</div>
                </div>
                <ChevronRight className="w-6 h-6 text-sky-500 group-hover:translate-x-1 transition-transform shrink-0" />
              </button>

              {/* ⚙️ 3. 登録の変更・削除 */}
              <button
                type="button"
                onClick={() => {
                  setErrorMsg('');
                  setSuccessMsg('');
                  setStep('edit_id');
                }}
                className="w-full h-[72px] px-5 py-3.5 rounded-2xl border-2 border-slate-300 bg-slate-50/90 hover:bg-slate-100 text-slate-900 flex items-center justify-between gap-4 text-left transition-all duration-150 active:scale-98 shadow-2xs group cursor-pointer shrink-0"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-slate-700 text-white shrink-0 flex items-center justify-center shadow-xs">
                    <User className="w-6 h-6" />
                  </div>
                  <div className="font-black text-[19px] sm:text-xl text-slate-900 tracking-tight whitespace-nowrap">登録の変更・削除</div>
                </div>
                <ChevronRight className="w-6 h-6 text-slate-400 group-hover:translate-x-1 transition-transform shrink-0" />
              </button>

              {/* 🟣 4. 管理者画面 */}
              <button
                type="button"
                onClick={() => {
                  setErrorMsg('');
                  setStep('admin');
                }}
                className="w-full h-[72px] px-5 py-3.5 rounded-2xl border-2 border-rose-200 bg-rose-50/80 hover:bg-rose-100/80 text-rose-950 flex items-center justify-between gap-4 text-left transition-all duration-150 active:scale-98 shadow-2xs group cursor-pointer shrink-0"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-rose-600 text-white shrink-0 flex items-center justify-center shadow-xs">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div className="font-black text-xl text-rose-950 tracking-tight whitespace-nowrap">管理者画面</div>
                </div>
                <ChevronRight className="w-6 h-6 text-rose-500 group-hover:translate-x-1 transition-transform shrink-0" />
              </button>
            </div>
          </div>
        )}

        {/* ==================================================== */}
        {/* 【ステップ 1/3】: 職員ID（6桁）の入力                */}
        {/* ==================================================== */}
        {step === 'id' && (
          <>
            <div className="setup-header">
              <div className="flex items-center justify-between mb-2">
                <button
                  type="button"
                  className="text-xs text-sky-600 hover:text-sky-800 font-bold flex items-center gap-1 px-2.5 py-1 bg-sky-50 rounded-lg border border-sky-200"
                  onClick={() => setStep('welcome')}
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>戻る</span>
                </button>
              </div>
              <h2>職員ID（6桁）の入力</h2>
              <p className="setup-sub">
                職員ID６桁を半角数字で入力してください
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
                  <div className="flex items-center gap-2 font-extrabold text-sky-900 text-sm leading-snug">
                    <HelpCircle className="w-5 h-5 text-sky-600 shrink-0" />
                    <span>すでに同じ職員IDで登録があります。こちらの登録情報でタイムスタディ入力へ移行してよいですか？</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-sky-100 text-xs space-y-1">
                    <div>氏名: <strong className="text-sm text-slate-900 font-extrabold">{existingUserFound.name}</strong> さん</div>
                    <div>所属: <strong>{existingUserFound.department}</strong>（{existingUserFound.role} / {existingUserFound.ageGroup}）</div>
                  </div>

                  {/* 「はい」「違います」ボタン */}
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
                  <span>新規の職員IDです。「次へ進む」を押してユーザー登録を行ってください。</span>
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

            <StepProgress currentStep={1} />
          </>
        )}

        {/* ==================================================== */}
        {/* 【ステップ 2/3】: ユーザー登録 (氏名・職種・所属・年齢) */}
        {/* ==================================================== */}
        {step === 'profile' && (
          <>
            <div className="setup-header">
              <div className="flex items-center justify-between mb-2">
                <button
                  type="button"
                  className="text-xs text-sky-600 hover:text-sky-800 font-bold flex items-center gap-1 px-2.5 py-1 bg-sky-50 rounded-lg border border-sky-200"
                  onClick={() => setStep('id')}
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>戻る</span>
                </button>
              </div>
              <h2>ユーザー登録 (プロフィール設定)</h2>
              <p className="setup-sub">
                職員ID: <strong className="font-mono text-sky-700">{staffId}</strong> の氏名・職種・所属部署・年齢を設定してください。
              </p>
            </div>

            <form onSubmit={handleProfileSubmit} className="setup-form">
              {errorMsg && <div className="form-error">{errorMsg}</div>}

              {/* 氏名 (全幅) */}
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

              {/* 年齢階層 */}
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

              <button type="submit" className="btn-primary btn-submit-setup mt-3 py-3">
                <CheckCircle2 className="w-5 h-5" />
                <span>次へ進む (調査日・勤務シフト選択へ) →</span>
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

            <StepProgress currentStep={2} />
          </>
        )}

        {/* ==================================================== */}
        {/* 【ステップ 3/3】: 調査日 ＆ 勤務シフト（時間枠）の選択 */}
        {/* ==================================================== */}
        {step === 'shift' && (
          <>
            <div className="setup-header">
              <div className="flex items-center justify-between mb-2">
                <button
                  type="button"
                  className="text-xs text-sky-600 hover:text-sky-800 font-bold flex items-center gap-1 px-2.5 py-1 bg-sky-50 rounded-lg border border-sky-200"
                  onClick={() => setStep('profile')}
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>戻る</span>
                </button>
              </div>
              <h2>調査日 ＆ 勤務シフト（時間枠）の選択</h2>
              <p className="setup-sub">
                登録ユーザー: <strong className="text-slate-900">{name} さん</strong>（職員ID: <span className="font-mono text-sky-700">{staffId}</span>）
              </p>
            </div>

            <form onSubmit={handleFinalStartStudy} className="setup-form">
              {errorMsg && <div className="form-error">{errorMsg}</div>}

              {/* 調査対象日の選択 */}
              <div className="form-group">
                <label className="form-label">
                  <Calendar className="w-4 h-4 text-sky-600" />
                  <span>入力日（調査対象日） <span className="req-badge">日付選択</span></span>
                </label>
                <input
                  type="date"
                  className="form-input font-bold text-slate-800 text-base"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  required
                />
              </div>

              {/* 勤務シフト選択 (プルダウン) */}
              <div className="form-group">
                <label className="form-label">
                  <Clock className="w-4 h-4 text-sky-600" />
                  <span>勤務シフト <span className="req-badge">プルダウン選択</span></span>
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
                <span>
                  タイムスタディ入力を開始する (
                  {shiftType === 'day'
                    ? '日勤 8:30-17:15'
                    : shiftType === 'night'
                    ? '夜勤 16:30-翌9:30'
                    : `カスタム ${customStartTime}-${customEndTime}`}
                  )
                </span>
              </button>
            </form>

            <StepProgress currentStep={3} />
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
                  className="text-xs text-sky-600 hover:text-sky-800 font-bold flex items-center gap-1 px-2.5 py-1 bg-sky-50 rounded-lg border border-sky-200"
                  onClick={() => setStep('welcome')}
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>戻る</span>
                </button>
              </div>
              <div className="flex items-center justify-center gap-2 text-rose-900 font-bold text-lg">
                <ShieldCheck className="w-6 h-6 text-rose-600" />
                <span>管理者認証</span>
              </div>
              <p className="setup-sub text-center">
                管理者専用の集計・分析画面を開くにはパスワードを入力してください。
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

        {/* ==================================================== */}
        {/* 変更・削除用：職員ID入力画面 ('edit_id')             */}
        {/* ==================================================== */}
        {step === 'edit_id' && (
          <>
            <div className="setup-header">
              <div className="flex items-center justify-between mb-2">
                <button
                  type="button"
                  className="text-xs text-slate-600 hover:text-slate-800 font-bold flex items-center gap-1 px-2.5 py-1 bg-slate-100 rounded-lg border border-slate-300"
                  onClick={() => setStep('welcome')}
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>戻る</span>
                </button>
              </div>
              <h2>変更・削除したい職員IDの入力</h2>
              <p className="setup-sub">
                変更・削除したい職員ID番号（6桁）を入力してください
              </p>
            </div>

            <div className="setup-form">
              {errorMsg && <div className="form-error">{errorMsg}</div>}
              {successMsg && <div className="form-success bg-emerald-50 border border-emerald-300 text-emerald-800 p-3 rounded-xl text-xs font-bold text-center mb-3">{successMsg}</div>}

              <div className="form-group">
                <label className="form-label">
                  <CreditCard className="w-4 h-4 text-slate-700" />
                  <span>職員ID <span className="req-badge">必須 6桁</span></span>
                </label>
                <input
                  type="text"
                  className="form-input font-mono text-center text-lg tracking-widest"
                  placeholder="例: 123456"
                  maxLength={6}
                  value={editStaffId}
                  onChange={(e) => handleEditStaffIdChange(e.target.value)}
                  autoFocus
                  required
                />
              </div>

              {/* 職員IDが入力され登録ユーザーが見つかった場合 */}
              {editTargetUser ? (
                <div className="bg-slate-50 border-2 border-slate-300 text-slate-900 p-4 rounded-2xl shadow-sm space-y-3 animate-fadeIn mt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-500">【該当登録データ】</span>
                    <span className="text-xs font-mono font-bold bg-sky-100 text-sky-800 px-2 py-0.5 rounded">
                      ID: {editTargetUser.staffId}
                    </span>
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs space-y-1.5">
                    <div>氏名: <strong className="text-base text-slate-900 font-extrabold">{editTargetUser.name}</strong> さん</div>
                    <div>所属部署: <strong className="text-slate-800">{editTargetUser.department}</strong></div>
                    <div>職種 / 年齢: <strong className="text-slate-800">{editTargetUser.role} / {editTargetUser.ageGroup}</strong></div>
                  </div>

                  {/* 3つのボタン（変更 / 削除 / 戻る） */}
                  <div className="grid grid-cols-3 gap-2 pt-2">
                    {/* ✏️ 1. 変更 */}
                    <button
                      type="button"
                      className="py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-extrabold rounded-xl flex items-center justify-center gap-1 shadow-sm active:scale-98 cursor-pointer"
                      onClick={() => setStep('edit_profile')}
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>変更</span>
                    </button>

                    {/* 🗑️ 2. 削除 */}
                    <button
                      type="button"
                      className="py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold rounded-xl flex items-center justify-center gap-1 shadow-sm active:scale-98 cursor-pointer"
                      onClick={() => setShowConfirmDelete(true)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>削除</span>
                    </button>

                    {/* ↩️ 3. 戻る */}
                    <button
                      type="button"
                      className="py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl flex items-center justify-center gap-1 active:scale-98 cursor-pointer"
                      onClick={() => setStep('welcome')}
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>戻る</span>
                    </button>
                  </div>
                </div>
              ) : editStaffId.length === 6 ? (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-xl text-xs font-bold text-center mt-3">
                  入力された職員ID ({editStaffId}) の登録情報は見つかりませんでした。
                </div>
              ) : null}

              {!editTargetUser && (
                <div className="mt-4">
                  <button
                    type="button"
                    className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs flex items-center justify-center gap-1"
                    onClick={() => setStep('welcome')}
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>初期画面へ戻る</span>
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* ==================================================== */}
        {/* 登録情報の変更設定画面 ('edit_profile')             */}
        {/* ==================================================== */}
        {step === 'edit_profile' && (
          <>
            <div className="setup-header">
              <div className="flex items-center justify-between mb-2">
                <button
                  type="button"
                  className="text-xs text-sky-600 hover:text-sky-800 font-bold flex items-center gap-1 px-2.5 py-1 bg-sky-50 rounded-lg border border-sky-200"
                  onClick={() => setStep('edit_id')}
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>戻る</span>
                </button>
              </div>
              <h2>登録情報の変更</h2>
              <p className="setup-sub">
                職員ID: <strong className="font-mono text-sky-700">{editStaffId}</strong> の登録内容を変更・更新してください。
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!name.trim()) {
                  setErrorMsg('氏名を入力してください。');
                  return;
                }
                const updatedProfile: UserProfile = {
                  staffId: editStaffId,
                  name: name.trim(),
                  role,
                  department,
                  ageGroup,
                  deviceId: initialUser?.deviceId,
                };
                saveUserProfile(updatedProfile);
                setSuccessMsg(`職員ID: ${editStaffId} の登録情報を更新しました。`);
                setEditTargetUser(updatedProfile);
                setStep('welcome');
              }}
              className="setup-form"
            >
              {errorMsg && <div className="form-error">{errorMsg}</div>}

              {/* 氏名 (全幅) */}
              <div className="form-group">
                <label className="form-label">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span>氏名 <span className="req-badge">必須</span></span>
                </label>
                <input
                  type="text"
                  className="form-input font-extrabold text-slate-800"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              {/* 職種 & 所属部署 (横2列配置) */}
              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">
                    <Stethoscope className="w-3.5 h-3.5 text-sky-600" />
                    <span>職種 <span className="req-badge">変更可能</span></span>
                  </label>
                  <select
                    className="form-select font-bold"
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
                    <span>所属部署 <span className="req-badge">変更可能</span></span>
                  </label>
                  <select
                    className="form-select font-bold"
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

              {/* 年齢階層 */}
              <div className="form-group">
                <label className="form-label">
                  <Award className="w-3.5 h-3.5 text-slate-500" />
                  <span>年齢階層 <span className="req-badge">変更可能</span></span>
                </label>
                <select
                  className="form-select font-bold"
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

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  className="btn-secondary py-3 text-xs font-bold"
                  onClick={() => setStep('edit_id')}
                >
                  キャンセル (戻る)
                </button>

                <button type="submit" className="btn-primary py-3 text-xs font-extrabold shadow-md">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>変更を保存する →</span>
                </button>
              </div>
            </form>
          </>
        )}

        {/* 誤操作防止の安全確認ダイアログ */}
        {showConfirmDelete && (
          <div className="confirm-delete-overlay">
            <div className="confirm-delete-card p-6 text-center space-y-3">
              <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto mb-1 animate-bounce" />
              <h3 className="text-lg font-extrabold text-slate-900">登録情報を本当に削除してよいですか？</h3>
              <p className="text-xs text-slate-600 leading-relaxed bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                職員ID: <strong className="font-mono text-rose-700">{editStaffId || staffId}</strong> の登録プロフィールおよび入力途中の一時保存データが消去されます。
              </p>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  className="btn-secondary py-2.5 font-bold text-xs"
                  onClick={() => setShowConfirmDelete(false)}
                >
                  いいえ (戻る)
                </button>
                <button
                  type="button"
                  className="btn-danger py-2.5 font-extrabold text-xs bg-rose-600 hover:bg-rose-700"
                  onClick={() => {
                    handleConfirmDelete();
                    setSuccessMsg('登録情報を削除しました。');
                    setEditTargetUser(null);
                    setStep('welcome');
                  }}
                >
                  はい (削除する)
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
