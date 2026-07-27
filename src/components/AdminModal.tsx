import React, { useState } from 'react';
import { Lock, KeyRound, AlertCircle, CheckCircle2 } from 'lucide-react';

interface AdminModalProps {
  onSuccess: () => void;
  onClose: () => void;
}

export const AdminModal: React.FC<AdminModalProps> = ({ onSuccess, onClose }) => {
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'okasaikango') {
      setErrorMsg('');
      onSuccess();
    } else {
      setErrorMsg('パスワードが正しくありません。');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card modal-admin-auth" onClick={(e) => e.stopPropagation()}>
        <div className="setup-header">
          <div className="setup-icon-badge bg-purple-100">
            <Lock className="w-6 h-6 text-purple-700" />
          </div>
          <h2>管理者認証</h2>
          <p className="setup-sub">
            看護部管理画面へアクセスするには管理者パスワードを入力してください。
          </p>
        </div>

        <form onSubmit={handleSubmit} className="setup-form">
          {errorMsg && (
            <div className="form-error">
              <AlertCircle className="w-4 h-4 inline-icon" />
              {errorMsg}
            </div>
          )}

          <div className="form-group">
            <label className="form-label">
              <KeyRound className="w-4 h-4 text-slate-500" />
              <span>パスワード</span>
            </label>
            <input
              type="password"
              className="form-input"
              placeholder="管理者パスワードを入力"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              required
            />
          </div>

          <div className="modal-buttons-flex">
            <button type="button" className="btn-secondary" onClick={onClose}>
              キャンセル
            </button>
            <button type="submit" className="btn-primary">
              <CheckCircle2 className="w-4 h-4" />
              認証する
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
