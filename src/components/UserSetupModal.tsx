import React, { useState } from 'react';
import { UserProfile, Department, AgeGroup, JobRole, ShiftType } from '../types';
import { DEPARTMENTS, AGE_GROUPS } from '../constants';
import { findUserByStaffId } from '../utils/storage';
import { User, Building2, Calendar, Award, CheckCircle2, Trash2, AlertTriangle, Stethoscope, Smartphone, CreditCard, LogIn, ArrowLeft, Sun, Moon, HelpCircle, Clock } from 'lucide-react';

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
  onDeleteProfile,
  isInitialSetup = false,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  // ステップ状態: 'id' (ステップ1) -> 'profile' (ステップ2) -> 'shift' (ステップ3)
  const [step, setStep] = useState<'id' | 'profile' | 'shift'>('id');

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

  // ステップ1 (職員ID入力) からの進行・確認
  const handleProceedFromStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffId.trim() || !/^\d{6}$/.test(staffId.trim())) {
      setErrorMsg('職員IDは半角数字6桁で入力してください。（例: 123456）');
      return;
    }
    setErrorMsg('');

    if (existingUserFound) {
      // 登録済みの場合：名前確認カードを経てステップ3(shift)へ
      setStep('shift');
    } else {
      // 未登録IDの場合：ステップ2(profile)へ
      setStep('profile');
    }
  };

  // ステップ2 (ユーザー登録) の完了
  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('氏名を入力してください。');
      return;
    }
    setErrorMsg('');
    setStep('shift');
  };

  // ステップ3 (調査日 ＆ 勤務シフト選択) の完了 ＝ 入力開始！
  const handleFinalStartStudy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetDate) {
      setErrorMsg('調査対象日を選択してください。');
      return;
    }

    if (shiftType === 'custom') {
      if (!customStartTime || !customEndTime) {
        setErrorMsg('「その他」が選択されています。勤務開始時間と終了時間を両方入力してください。');
        return;
      }
    }

    const currentUser: UserProfile = {
      staffId: staffId.trim(),
      name: name.trim(),
      role,
      department,
      ageGroup,
      deviceId: initialUser?.deviceId,
    };

    onSave(currentUser, targetDate, shiftType, customStartTime, customEndTime);
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
        {/* ステップ1: 職員IDの登録・入力 (1/3)                   */}
        {/* ==================================================== */}
        {step === 'id' && (
          <>
            <div className="setup-header">
              <div className="setup-icon-badge">
                <CreditCard className="w-6 h-6 text-sky-600" />
              </div>
              <h2>職員ID（6桁）の入力</h2>
              <p className="setup-sub">
                はじめに6桁の職員IDを登録・指定してください。
              </p>
              {initialUser?.deviceId && (
                <div className="mt-1.5 text-center">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                    <Smartphone className="w-3 h-3 text-sky-600" />
                    この端末の識別ID: <strong>{initialUser.deviceId}</strong>
                  </span>
                </div>
              )}
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

              {/* 2回目以降ログイン時：氏名確認カード */}
              {existingUserFound ? (
                <div className="bg-sky-50 border-2 border-sky-300 text-sky-900 p-3.5 rounded-2xl shadow-sm space-y-2 animate-fadeIn">
                  <div className="flex items-center gap-2 font-extrabold text-sky-900 text-sm">
                    <HelpCircle className="w-5 h-5 text-sky-600 shrink-0" />
                    <span>【氏名確認】以下の内容でお間違いありませんか？</span>
                  </div>
                  <div className="bg-white p-2.5 rounded-xl border border-sky-100 text-xs space-y-1">
                    <div>氏名: <strong className="text-sm text-slate-900 font-extrabold">{existingUserFound.name}</strong> さん</div>
                    <div>所属: <strong>{existingUserFound.department}</strong>（{existingUserFound.role} / {existingUserFound.ageGroup}）</div>
                  </div>
                  <div className="text-[11px] text-sky-700">
                    ※お名前に間違いがなければ「はい」を押して次へお進みください。
                  </div>
                </div>
              ) : staffId.length === 6 ? (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 p-2.5 rounded-xl text-xs flex items-center gap-2">
                  <User className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>新規の職員IDです。「次へ進む」を押してユーザー登録を行ってください。</span>
                </div>
              ) : null}

              <div className="flex flex-col gap-2 mt-2">
                <button type="submit" className="btn-primary btn-submit-setup">
                  <LogIn className="w-5 h-5" />
                  <span>
                    {existingUserFound
                      ? 'はい（この名前で入力に進む） →'
                      : '次へ進む (ユーザー登録へ) →'}
                  </span>
                </button>

                {existingUserFound && (
                  <button
                    type="button"
                    className="btn-secondary text-xs py-2"
                    onClick={() => setStep('profile')}
                  >
                    <span>いいえ（氏名・所属部署の情報を修正・更新する）</span>
                  </button>
                )}
              </div>
            </form>
          </>
        )}

        {/* ==================================================== */}
        {/* ステップ2: 氏名・職種・所属部署・年齢の設定 (2/3)     */}
        {/* ==================================================== */}
        {step === 'profile' && (
          <>
            <div className="setup-header">
              <div className="flex items-center justify-between mb-2">
                <button
                  type="button"
                  className="text-xs text-sky-600 hover:text-sky-800 font-bold flex items-center gap-1 px-2 py-1 bg-sky-50 rounded-lg border border-sky-200"
                  onClick={() => setStep('id')}
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>戻る</span>
                </button>
              </div>
              <h2>氏名・職種・所属部署・年齢の設定</h2>
              <p className="setup-sub">
                職員ID: <strong className="font-mono text-sky-700">{staffId}</strong> のプロフィール情報を設定してください。
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

              <button type="submit" className="btn-primary btn-submit-setup">
                <CheckCircle2 className="w-5 h-5" />
                <span>ユーザー登録を保存して次へ (調査日選択へ) →</span>
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
        {/* ステップ3: 入力日（調査日） ＆ 勤務シフト選択 (3/3)   */}
        {/* ==================================================== */}
        {step === 'shift' && (
          <>
            <div className="setup-header">
              <div className="flex items-center justify-between mb-2">
                <button
                  type="button"
                  className="text-xs text-sky-600 hover:text-sky-800 font-bold flex items-center gap-1 px-2 py-1 bg-sky-50 rounded-lg border border-sky-200"
                  onClick={() => setStep('profile')}
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>戻る</span>
                </button>
              </div>
              <h2>調査日 ＆ 勤務シフト（時間枠）の選択</h2>
              <p className="setup-sub">
                ログイン中: <strong className="text-slate-900">{name} さん</strong>（職員ID: <span className="font-mono text-sky-700">{staffId}</span>）
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
                  <p className="text-[10px] text-amber-800">
                    指定された時間帯（{customStartTime} ～ {customEndTime}）の15分刻み入力枠を自動生成します。
                  </p>
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
          </>
        )}

        {/* ==================================================== */}
        {/* 📌 ステップ進行表示（画面下部に配置）                */}
        {/* ==================================================== */}
        <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 font-semibold">
          <span>ステップ進捗</span>
          <div className="flex items-center gap-1.5">
            <span className={`px-2.5 py-0.5 rounded-full ${step === 'id' ? 'bg-sky-600 text-white font-bold' : 'bg-slate-200 text-slate-600'}`}>
              1/3 職員ID
            </span>
            <span>→</span>
            <span className={`px-2.5 py-0.5 rounded-full ${step === 'profile' ? 'bg-sky-600 text-white font-bold' : 'bg-slate-200 text-slate-600'}`}>
              2/3 ユーザー登録
            </span>
            <span>→</span>
            <span className={`px-2.5 py-0.5 rounded-full ${step === 'shift' ? 'bg-sky-600 text-white font-bold' : 'bg-slate-200 text-slate-600'}`}>
              3/3 調査日・勤務
            </span>
          </div>
        </div>

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
