import React, { useState, useEffect } from 'react';
import { TimeSlot, TaskItem, JobRole } from '../types';
import { Check, X, Clock, AlertCircle } from 'lucide-react';

interface TaskSelectModalProps {
  slot?: TimeSlot | null;
  batchInfo?: { title: string; slotIds: string[]; initialTaskIds: string[] } | null;
  tasks: TaskItem[];
  userRole?: JobRole;
  onSave?: (slotId: string, taskIds: string[]) => void;
  onSaveBatch?: (slotIds: string[], taskIds: string[]) => void;
  onClose: () => void;
  onOpenEditMaster?: () => void;
}

export const TaskSelectModal: React.FC<TaskSelectModalProps> = ({
  slot,
  batchInfo,
  tasks,
  userRole = '看護師',
  onSave,
  onSaveBatch,
  onClose,
  onOpenEditMaster,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [warningMsg, setWarningMsg] = useState<string>('');

  useEffect(() => {
    if (batchInfo) {
      setSelectedIds([...batchInfo.initialTaskIds]);
      setWarningMsg('');
    } else if (slot) {
      setSelectedIds([...slot.selectedTaskIds]);
      setWarningMsg('');
    }
  }, [slot, batchInfo]);

  if (!slot && !batchInfo) return null;

  const titleText = batchInfo ? batchInfo.title : slot ? `${slot.startTime} - ${slot.endTime}` : '';

  const toggleTask = (taskId: string) => {
    setWarningMsg('');
    if (selectedIds.includes(taskId)) {
      setSelectedIds(selectedIds.filter((id) => id !== taskId));
    } else {
      if (selectedIds.length >= 3) {
        setWarningMsg('選択できる業務は最大3つまでです。');
        return;
      }
      setSelectedIds([...selectedIds, taskId]);
    }
  };

  const handleConfirm = () => {
    if (batchInfo && onSaveBatch) {
      onSaveBatch(batchInfo.slotIds, selectedIds);
    } else if (slot && onSave) {
      onSave(slot.id, selectedIds);
    }
  };

  // 職種に応じた定型業務の絞り込み
  const availableTasks = tasks.filter(
    (t) => !t.targetRole || t.targetRole === '共通' || t.targetRole === userRole
  );

  // 定型業務のグループ分け
  const directTasks = availableTasks.filter((t) => t.category === '直接看護業務');
  const indirectTasks = availableTasks.filter((t) => t.category === '間接看護業務');
  const otherTasks = availableTasks.filter((t) => t.category === 'その他・管理業務');

  return (
    <div className="task-flow-overlay" onClick={onClose}>
      <div className="task-flow-sheet" onClick={(e) => e.stopPropagation()}>
        {/* ユーザー指定: 上部固定ヘッダー (キャンセル/対象時間/決定ボタン) */}
        <div className="task-flow-header">
          <button className="btn-flow-cancel" onClick={onClose}>
            <X className="w-5 h-5" />
            <span>キャンセル</span>
          </button>

          <div className="flow-title">
            <Clock className="w-4 h-4 text-sky-600 inline-icon" />
            <span>{titleText}</span>
          </div>

          <button className="btn-flow-confirm" onClick={handleConfirm}>
            <Check className="w-5 h-5" />
            <span>決定 ({selectedIds.length}/3)</span>
          </button>
        </div>

        {/* サブインフォバー */}
        <div className="flow-sub-bar flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
              userRole === '看護補助者' ? 'bg-emerald-100 text-emerald-800' : 'bg-sky-100 text-sky-800'
            }`}>
              {userRole}
            </span>
            <span className="text-xs text-slate-500 font-bold">
              {batchInfo
                ? '【1時間一括設定】この時間帯の全コマへまとめて反映されます'
                : 'あてはまる業務を選択してください（複数選択可）'}
            </span>
          </div>
        </div>
        {warningMsg && (
            <div className="flow-warning">
              <AlertCircle className="w-4 h-4" />
              <span>{warningMsg}</span>
            </div>
          )}

        {/* 業務選択ボディ (カテゴリ別リスト) */}
        <div className="task-flow-body">
          {/* 🟦 直接看護業務 */}
          <section className="task-category-section">
            <h3 className="category-title text-sky-700">
              <span className="cat-badge bg-sky-500"></span>
              直接看護業務 (患者へのケア・処置)
            </h3>
            <div className="task-grid">
              {directTasks.map((task) => {
                const isSelected = selectedIds.includes(task.id);
                return (
                  <button
                    key={task.id}
                    className={`task-chip ${isSelected ? 'selected' : ''}`}
                    onClick={() => toggleTask(task.id)}
                    style={{
                      borderColor: isSelected ? task.color : '#e2e8f0',
                      backgroundColor: isSelected ? task.badgeBg : '#ffffff',
                    }}
                  >
                    <div className="chip-check">
                      {isSelected ? (
                        <Check className="w-4 h-4" style={{ color: task.color }} />
                      ) : (
                        <span className="chip-empty"></span>
                      )}
                    </div>
                    <div className="chip-content">
                      <span className="chip-name" style={{ color: isSelected ? task.color : '#1e293b' }}>
                        {task.name}
                      </span>
                      <span className="chip-desc">{task.description}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 🟩 間接看護業務 */}
          <section className="task-category-section">
            <h3 className="category-title text-emerald-700">
              <span className="cat-badge bg-emerald-500"></span>
              間接看護業務 (カルテ・準備・会議)
            </h3>
            <div className="task-grid">
              {indirectTasks.map((task) => {
                const isSelected = selectedIds.includes(task.id);
                return (
                  <button
                    key={task.id}
                    className={`task-chip ${isSelected ? 'selected' : ''}`}
                    onClick={() => toggleTask(task.id)}
                    style={{
                      borderColor: isSelected ? task.color : '#e2e8f0',
                      backgroundColor: isSelected ? task.badgeBg : '#ffffff',
                    }}
                  >
                    <div className="chip-check">
                      {isSelected ? (
                        <Check className="w-4 h-4" style={{ color: task.color }} />
                      ) : (
                        <span className="chip-empty"></span>
                      )}
                    </div>
                    <div className="chip-content">
                      <span className="chip-name" style={{ color: isSelected ? task.color : '#1e293b' }}>
                        {task.name}
                      </span>
                      <span className="chip-desc">{task.description}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 🟧 その他・管理業務 */}
          <section className="task-category-section">
            <h3 className="category-title text-purple-700">
              <span className="cat-badge bg-purple-500"></span>
              その他・管理業務 (移動・環境整備・休憩等)
            </h3>
            <div className="task-grid">
              {otherTasks.map((task) => {
                const isSelected = selectedIds.includes(task.id);
                return (
                  <button
                    key={task.id}
                    className={`task-chip ${isSelected ? 'selected' : ''}`}
                    onClick={() => toggleTask(task.id)}
                    style={{
                      borderColor: isSelected ? task.color : '#e2e8f0',
                      backgroundColor: isSelected ? task.badgeBg : '#ffffff',
                    }}
                  >
                    <div className="chip-check">
                      {isSelected ? (
                        <Check className="w-4 h-4" style={{ color: task.color }} />
                      ) : (
                        <span className="chip-empty"></span>
                      )}
                    </div>
                    <div className="chip-content">
                      <span className="chip-name" style={{ color: isSelected ? task.color : '#1e293b' }}>
                        {task.name}
                      </span>
                      <span className="chip-desc">{task.description}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};
