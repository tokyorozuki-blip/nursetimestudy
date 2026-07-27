import React, { useState } from 'react';
import { UserProfile, Department, AgeGroup, JobRole } from '../types';
import { DEPARTMENTS, AGE_GROUPS } from '../constants';
import { User, Building2, Calendar, Award, CheckCircle2, Trash2, AlertTriangle, Stethoscope, HeartHandshake, Smartphone } from 'lucide-react';

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
            調査を行う個人の職種・属性情報を入力してください。この端末（ブラウザ）ごとに登録データが独立して保存されます。
          </p>
          {initialUser?.deviceId && (
            <div className="mt-2 text-center">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                <Smartphone className="w-3.5 h-3.5 text-sky-600" />
                この端末の識別ID: <strong>{initialUser.deviceId}</strong>
              </span>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="setup-form">
          {errorMsg && <div className="form-error">{errorMsg}</div>}

          {/* 1. 氏名（全幅） */}
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

          {/* 2. 職種 & 所属部署 (横2列配置) */}
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

          {/* 3. 年齢階層 & 調査対象日 (横2列配置) */}
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
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>調査対象日</span>
              </label>
              <input
                type="date"
                className="form-input"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </div>
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
                <Trash2 className="w-3.5 h-3.5 text-red-500" />
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
