import React, { useState } from 'react';
import { TaskItem, TaskCategory, JobRole } from '../types';
import { PRESET_TASKS } from '../constants';
import { Plus, Trash2, RotateCcw, Check, X, Edit2, Palette } from 'lucide-react';

interface TaskMasterEditModalProps {
  currentTasks: TaskItem[];
  onSaveTasks: (updatedTasks: TaskItem[]) => void;
  onClose: () => void;
}

const COLOR_PRESETS = [
  { color: '#0284c7', badgeBg: '#e0f2fe', label: 'スカイブルー' },
  { color: '#0f766e', badgeBg: '#ccfbf1', label: 'エメラルド' },
  { color: '#15803d', badgeBg: '#dcfce7', label: 'グリーン' },
  { color: '#d97706', badgeBg: '#fef3c7', label: 'アンバー' },
  { color: '#4338ca', badgeBg: '#e0e7ff', label: 'インディゴ' },
  { color: '#9333ea', badgeBg: '#f3e8ff', label: 'パープル' },
  { color: '#e11d48', badgeBg: '#ffe4e6', label: 'ローズ' },
  { color: '#475569', badgeBg: '#f1f5f9', label: 'スレート' },
];

export const TaskMasterEditModal: React.FC<TaskMasterEditModalProps> = ({
  currentTasks,
  onSaveTasks,
  onClose,
}) => {
  const [tasks, setTasks] = useState<TaskItem[]>(
    currentTasks && currentTasks.length > 0 ? currentTasks : PRESET_TASKS
  );
  const [activeRole, setActiveRole] = useState<JobRole>('看護師');

  // 新規追加フォーム
  const [showAddForm, setShowAddForm] = useState<boolean>(false);
  const [newTaskName, setNewTaskName] = useState<string>('');
  const [newTaskCategory, setNewTaskCategory] = useState<TaskCategory>('直接看護業務');
  const [newTaskColorIdx, setNewTaskColorIdx] = useState<number>(0);

  // 業務名の編集
  const handleTaskNameChange = (id: string, newName: string) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === id ? { ...t, name: newName } : t))
    );
  };

  // カラーの編集
  const handleTaskColorChange = (id: string, colorIdx: number) => {
    const selectedColor = COLOR_PRESETS[colorIdx];
    setTasks((prev) =>
      prev.map((t) =>
        t.id === id
          ? { ...t, color: selectedColor.color, badgeBg: selectedColor.badgeBg }
          : t
      )
    );
  };

  // 業務の削除
  const handleDeleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  // 新規定型業務の追加
  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskName.trim()) return;

    const selectedColor = COLOR_PRESETS[newTaskColorIdx];
    const newTask: TaskItem = {
      id: `custom-${Date.now()}`,
      name: newTaskName.trim(),
      category: newTaskCategory,
      color: selectedColor.color,
      badgeBg: selectedColor.badgeBg,
      description: 'カスタム登録定型業務',
      targetRole: activeRole,
    };

    setTasks((prev) => [...prev, newTask]);
    setNewTaskName('');
    setShowAddForm(false);
  };

  // デフォルト初期状態にリセット
  const handleResetToPreset = () => {
    if (window.confirm('定型業務の編集内容を初期状態にリセットしますか？')) {
      setTasks(PRESET_TASKS);
    }
  };

  const filteredTasks = tasks.filter((t) => t.targetRole === activeRole);
  const directTasks = filteredTasks.filter((t) => t.category === '直接看護業務');
  const indirectTasks = filteredTasks.filter((t) => t.category === '間接看護業務');
  const otherTasks = filteredTasks.filter((t) => t.category === 'その他・管理業務');

  return (
    <div className="modal-overlay">
      <div className="modal-card max-w-2xl w-full p-6 max-h-[90vh] flex flex-col space-y-4 animate-scaleUp">
        {/* ヘッダー */}
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-sky-600" />
              <span>定型業務マスターの変更・編集</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              各コマで選択する定型業務の「名前」「色テーマ」を変更・追加・削除できます
            </p>
          </div>
          <button
            type="button"
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* タブ切り替え（看護師 / 看護補助者） */}
        <div className="flex items-center justify-between gap-3 bg-slate-100 p-1.5 rounded-2xl">
          <div className="flex items-center gap-1.5 w-full">
            <button
              type="button"
              className={`flex-1 py-2 px-3 rounded-xl font-extrabold text-xs transition-all ${
                activeRole === '看護師'
                  ? 'bg-white text-sky-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              onClick={() => setActiveRole('看護師')}
            >
              🩺 看護師用 定型業務 ({filteredTasks.length}件)
            </button>
            <button
              type="button"
              className={`flex-1 py-2 px-3 rounded-xl font-extrabold text-xs transition-all ${
                activeRole === '看護補助者'
                  ? 'bg-white text-emerald-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              onClick={() => setActiveRole('看護補助者')}
            >
              🤝 看護補助者用 定型業務 ({filteredTasks.length}件)
            </button>
          </div>
        </div>

        {/* リスト表示領域 */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-4 text-left">
          {/* 追加ボタン */}
          {!showAddForm ? (
            <button
              type="button"
              className="w-full py-2.5 rounded-xl border-2 border-dashed border-sky-300 bg-sky-50/50 hover:bg-sky-100/50 text-sky-800 font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all"
              onClick={() => setShowAddForm(true)}
            >
              <Plus className="w-4 h-4 text-sky-600" />
              <span>＋ 新しい定型業務を追加する ({activeRole}用)</span>
            </button>
          ) : (
            /* 新規追加フォーム */
            <form onSubmit={handleAddTask} className="bg-sky-50 border-2 border-sky-300 p-3.5 rounded-2xl space-y-3">
              <div className="text-xs font-extrabold text-sky-900 flex items-center justify-between">
                <span>新しい定型業務の追加 ({activeRole})</span>
                <button
                  type="button"
                  className="text-slate-400 hover:text-slate-700 text-xs"
                  onClick={() => setShowAddForm(false)}
                >
                  キャンセル
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">業務名</label>
                  <input
                    type="text"
                    className="form-input text-xs font-bold"
                    placeholder="例: リハビリ同行"
                    value={newTaskName}
                    onChange={(e) => setNewTaskName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-700 block mb-1">区分カテゴリ</label>
                  <select
                    className="form-select text-xs font-bold"
                    value={newTaskCategory}
                    onChange={(e) => setNewTaskCategory(e.target.value as TaskCategory)}
                  >
                    <option value="直接看護業務">直接看護業務</option>
                    <option value="間接看護業務">間接看護業務</option>
                    <option value="その他・管理業務">その他・管理業務</option>
                  </select>
                </div>
              </div>

              {/* テーマカラー選択 */}
              <div>
                <label className="text-[11px] font-bold text-slate-700 block mb-1">カラーテーマ</label>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {COLOR_PRESETS.map((preset, idx) => (
                    <button
                      key={preset.label}
                      type="button"
                      className={`w-6 h-6 rounded-full border-2 transition-transform ${
                        newTaskColorIdx === idx ? 'scale-110 border-slate-900 shadow-xs' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: preset.color }}
                      onClick={() => setNewTaskColorIdx(idx)}
                      title={preset.label}
                    />
                  ))}
                </div>
              </div>

              <button type="submit" className="w-full py-2 bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs rounded-xl shadow-xs">
                追加を保存する
              </button>
            </form>
          )}

          {/* 直接看護業務 */}
          <div className="space-y-2">
            <div className="text-xs font-extrabold text-sky-800 bg-sky-100/70 px-2.5 py-1 rounded-lg border border-sky-200 inline-block">
              🟦 直接看護業務
            </div>
            <div className="space-y-1.5">
              {directTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between gap-2 bg-white border border-slate-200 p-2.5 rounded-xl hover:border-slate-300"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0"
                      style={{ backgroundColor: task.color }}
                    />
                    <input
                      type="text"
                      className="form-input text-xs font-bold text-slate-900 border-none bg-transparent hover:bg-slate-50 focus:bg-white p-1 rounded min-w-0 flex-1"
                      value={task.name}
                      onChange={(e) => handleTaskNameChange(task.id, e.target.value)}
                    />
                  </div>

                  {/* カラー選択ドロップダウン / 削除ボタン */}
                  <div className="flex items-center gap-1 shrink-0">
                    <select
                      className="text-[11px] font-bold p-1 rounded border border-slate-200 bg-slate-50 text-slate-700 cursor-pointer"
                      onChange={(e) => handleTaskColorChange(task.id, Number(e.target.value))}
                    >
                      {COLOR_PRESETS.map((p, idx) => (
                        <option key={p.label} value={idx}>
                          {p.label}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                      onClick={() => handleDeleteTask(task.id)}
                      title="この定型業務を削除"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 間接看護業務 */}
          <div className="space-y-2 pt-2">
            <div className="text-xs font-extrabold text-emerald-800 bg-emerald-100/70 px-2.5 py-1 rounded-lg border border-emerald-200 inline-block">
              🟩 間接看護業務
            </div>
            <div className="space-y-1.5">
              {indirectTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between gap-2 bg-white border border-slate-200 p-2.5 rounded-xl hover:border-slate-300"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0"
                      style={{ backgroundColor: task.color }}
                    />
                    <input
                      type="text"
                      className="form-input text-xs font-bold text-slate-900 border-none bg-transparent hover:bg-slate-50 focus:bg-white p-1 rounded min-w-0 flex-1"
                      value={task.name}
                      onChange={(e) => handleTaskNameChange(task.id, e.target.value)}
                    />
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <select
                      className="text-[11px] font-bold p-1 rounded border border-slate-200 bg-slate-50 text-slate-700 cursor-pointer"
                      onChange={(e) => handleTaskColorChange(task.id, Number(e.target.value))}
                    >
                      {COLOR_PRESETS.map((p, idx) => (
                        <option key={p.label} value={idx}>
                          {p.label}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                      onClick={() => handleDeleteTask(task.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* その他・管理業務 */}
          <div className="space-y-2 pt-2">
            <div className="text-xs font-extrabold text-purple-800 bg-purple-100/70 px-2.5 py-1 rounded-lg border border-purple-200 inline-block">
              🟧 その他・管理業務
            </div>
            <div className="space-y-1.5">
              {otherTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between gap-2 bg-white border border-slate-200 p-2.5 rounded-xl hover:border-slate-300"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0"
                      style={{ backgroundColor: task.color }}
                    />
                    <input
                      type="text"
                      className="form-input text-xs font-bold text-slate-900 border-none bg-transparent hover:bg-slate-50 focus:bg-white p-1 rounded min-w-0 flex-1"
                      value={task.name}
                      onChange={(e) => handleTaskNameChange(task.id, e.target.value)}
                    />
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <select
                      className="text-[11px] font-bold p-1 rounded border border-slate-200 bg-slate-50 text-slate-700 cursor-pointer"
                      onChange={(e) => handleTaskColorChange(task.id, Number(e.target.value))}
                    >
                      {COLOR_PRESETS.map((p, idx) => (
                        <option key={p.label} value={idx}>
                          {p.label}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                      onClick={() => handleDeleteTask(task.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* フッターアクション */}
        <div className="border-t pt-3 flex items-center justify-between gap-3">
          <button
            type="button"
            className="text-xs text-slate-500 hover:text-slate-800 font-bold flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100"
            onClick={handleResetToPreset}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>初期状態にリセット</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl"
              onClick={onClose}
            >
              キャンセル
            </button>
            <button
              type="button"
              className="py-2.5 px-5 bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
              onClick={() => {
                onSaveTasks(tasks);
                onClose();
              }}
            >
              <Check className="w-4 h-4" />
              <span>変更を保存する</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
