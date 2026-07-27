import React, { useState } from 'react';
import { UserProfile, Department, AgeGroup, JobRole } from '../types';
import { DEPARTMENTS, AGE_GROUPS } from '../constants';
import { User, Building2, Calendar, Award, CheckCircle2, Trash2, AlertTriangle, Stethoscope, HeartHandshake } from 'lucide-react';

interface UserSetupModalProps {
  initialUser: UserProfile | null;
  onSave: (user: UserProfile) => void;
  onDeleteProfile?: () => void;
  isInitialSetup?: boolean;
}

export const UserSetupModal: React.FC<UserSetupModalProps> = ({
  initialUser,
  onSave,
  onDeleteProfile,
  isInitialSetup = false,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const [name, setName] = useState<string>(initialUser?.name || '');
  const [role, setRole] = useState<JobRole>(initialUser?.role || '看護師');
  const [department, setDepartment] = useState<Department>(
    initialUser?.department || 'ICU'
  );
  const [ageGroup, setAgeGroup] = useState<AgeGroup>(
    initialUser?.ageGroup || '25〜29歳'
  );
  const [targetDate, setTargetDate] = useState<string>(
    initialUser?.targetDate || todayStr
  );
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [showConfirmDelete, setShowConfirmDelete] = useState<boolean>(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('氏名を入力してください。');
      return;
    }
    setErrorMsg('');
    onSave({
      name: name.trim(),
      role,
      department,
      ageGroup,
      targetDate,
    });
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
        <div className="setup-header">
          <div className="setup-icon-badge">
            <User className="w-6 h-6 text-sky-600" />
          </div>
          <h2>{isInitialSetup ? 'ユーザー登録' : '登録情報・調査日の変更'}</h2>
          <p className="setup-sub">
            調査を行う個人の職種・属性情報を入力してください。次回以降は保存されます。
          </p>
        </div>

        <form onSubmit={handleSubmit} className="setup-form">
          {errorMsg && <div className="form-error">{errorMsg}</div>}

          {/* 職種選択 (携帯・スマートフォン操作に特化した大型タッチボタン) */}
          <div className="form-group">
            <label className="form-label">
              <Stethoscope className="w-4 h-4 text-sky-600" />
              <span>職種 <span className="req-badge">必須</span></span>
            </label>

            <div className="grid grid-cols-2 gap-3 mt-1.5">
              <button
                type="button"
                onClick={() => setRole('看護師')}
                className={`w-full py-4 px-3 rounded-2xl border-4 text-center transition-all duration-200 active:scale-95 flex items-center justify-center font-extrabold text-base select-none ${
                  role === '看護師'
                    ? 'bg-rose-600 border-rose-600 text-white shadow-2xl ring-4 ring-rose-300 scale-[1.04] z-10'
                    : 'bg-slate-100 border-slate-300 text-slate-600 hover:bg-slate-200 opacity-60 hover:opacity-90'
                }`}
              >
                看護師
              </button>

              <button
                type="button"
                onClick={() => setRole('看護補助者')}
                className={`w-full py-4 px-3 rounded-2xl border-4 text-center transition-all duration-200 active:scale-95 flex items-center justify-center font-extrabold text-base select-none ${
                  role === '看護補助者'
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-2xl ring-4 ring-emerald-300 scale-[1.04] z-10'
                    : 'bg-slate-100 border-slate-300 text-slate-600 hover:bg-slate-200 opacity-60 hover:opacity-90'
                }`}
              >
                看護補助者
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">
              <User className="w-4 h-4 text-slate-500" />
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

          <div className="form-group">
            <label className="form-label">
              <Building2 className="w-4 h-4 text-slate-500" />
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

          <div className="form-group">
            <label className="form-label">
              <Award className="w-4 h-4 text-slate-500" />
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
              <Calendar className="w-4 h-4 text-slate-500" />
              <span>調査対象日 <span className="req-badge">デフォルト本日</span></span>
            </label>
            <input
              type="date"
              className="form-input"
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
            />
          </div>

          <button type="submit" className="btn-primary btn-submit-setup">
            <CheckCircle2 className="w-5 h-5" />
            <span>タイムスタディ入力を開始する</span>
          </button>

          {!isInitialSetup && onDeleteProfile && (
            <div className="delete-profile-wrapper">
              <button
                type="button"
                className="btn-delete-profile"
                onClick={() => setShowConfirmDelete(true)}
              >
                <Trash2 className="w-4 h-4 text-red-500" />
                <span>登録情報・一時保存データを削除する</span>
              </button>
            </div>
          )}
        </form>

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
