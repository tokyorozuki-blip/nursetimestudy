import React, { useState, useRef } from 'react';
import { TaskItem, TaskCategory, JobRole } from '../types';
import { PRESET_TASKS } from '../constants';
import { exportTaskMasterToCSV, parseTaskMasterCSV } from '../utils/taskCsv';
import { Plus, Trash2, RotateCcw, Check, X, Edit2, Download, Upload } from 'lucide-react';

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
  const [statusMsg, setStatusMsg] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // CSVファイルのアップロード・反映
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const csvText = event.target?.result as string;
      if (!csvText) return;

      const { tasks: parsedTasks, errors } = parseTaskMasterCSV(csvText);
      if (parsedTasks.length === 0) {
        alert(errors[0] || 'CSVファイルの解析に失敗しました。');
        return;
      }

      setTasks(parsedTasks);
      const msg = `✅ CSVファイルから全${parsedTasks.length}件の業務マスターを読み込んで反映しました！${
        errors.length > 0 ? ` (注記: ${errors.join(', ')})` : ''
      }`;
      setStatusMsg(msg);
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  };

  // デフォルト初期状態にリセット
  const handleResetToPreset = () => {
    if (window.confirm('定型業務の編集内容を初期状態にリセットしますか？')) {
      setTasks(PRESET_TASKS);
      setStatusMsg('初期設定業務マスタにリセットしました。');
    }
  };

  const filteredTasks = tasks.filter((t) => t.targetRole === activeRole || !t.targetRole);
  const directTasks = filteredTasks.filter((t) => t.category === '直接看護業務');
  const indirectTasks = filteredTasks.filter((t) => t.category === '間接看護業務');
  const otherTasks = filteredTasks.filter((t) => t.category === 'その他・管理業務');

  return (
    <div className="modal-overlay">
      <div className="modal-card max-w-2xl w-full p-6 max-h-[90vh] flex flex-col space-y-4 animate-scaleUp">
        {/* 非表示のファイルインプット */}
        <input
          type="file"
          ref={fileInputRef}
          accept=".csv"
          className="hidden"
          onChange={handleFileUpload}
        />

        {/* ヘッダー */}
        <div className="flex items-center justify-between border-b pb-3">
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-sky-600" />
              <span>定型業務マスターの変更・編集</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              各コマで選択する定型業務の「名前」「色テーマ」を変更・追加・CSV出力／一括取込が可能です
            </p>
          </div>
          <button
            type="button"
            className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 cursor-pointer"
            onClick={onClose}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CSV 一括出力 ＆ CSV アップロード ＆ デフォルト復元操作バー */}
        <div className="flex items-center justify-between gap-2 bg-sky-50 border border-sky-200 p-2.5 rounded-2xl flex-wrap">
          <div className="text-xs font-bold text-sky-900 flex items-center gap-1.5">
            <span>📄 業務一括操作・管理</span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              className="py-1.5 px-3 rounded-xl bg-white hover:bg-sky-100 text-sky-800 font-extrabold text-xs border border-sky-300 shadow-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
              onClick={() => exportTaskMasterToCSV(tasks)}
            >
              <Download className="w-3.5 h-3.5 text-sky-600" />
              <span>CSV出力</span>
            </button>
            <button
              type="button"
              className="py-1.5 px-3 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs shadow-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>修正CSVの取込・反映</span>
            </button>
            <button
              type="button"
              className="py-1.5 px-3 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 font-extrabold text-xs border border-amber-300 shadow-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
              onClick={handleResetToPreset}
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
              <span>デフォルト初期業務に戻す</span>
            </button>
          </div>
        </div>

        {statusMsg && (
          <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-2.5 rounded-xl text-xs font-bold text-center animate-fadeIn">
            {statusMsg}
          </div>
        )}

        {/* タブ切り替え（看護師 / 看護補助者） */}
        <div className="flex items-center justify-between gap-3 bg-slate-100 p-1.5 rounded-2xl">
          <div className="flex items-center gap-1.5 w-full">
            <button
              type="button"
              className={`flex-1 py-2 px-3 rounded-xl font-extrabold text-xs transition-all cursor-pointer ${
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
              className={`flex-1 py-2 px-3 rounded-xl font-extrabold text-xs transition-all cursor-pointer ${
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
              onClick={() => setShowAddForm(true)}
              className="w-full py-2.5 border-2 border-dashed border-sky-300 bg-sky-50/50 hover:bg-sky-50 text-sky-700 font-extrabold rounded-2xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>「{activeRole}」用の新しい定型業務を追加する</span>
            </button>
          ) : (
            <form onSubmit={handleAddTask} className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-800">新規業務の追加 ({activeRole})</span>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  キャンセル
                </button>
              </div>

              <div className="space-y-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">業務名称</label>
                  <input
                    type="text"
                    required
                    placeholder="例: リハビリ同行、書類整理など"
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-sky-500 bg-white"
                    value={newTaskName}
                    onChange={(e) => setNewTaskName(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">業務カテゴリ</label>
                    <select
                      className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 bg-white font-bold"
                      value={newTaskCategory}
                      onChange={(e) => setNewTaskCategory(e.target.value as TaskCategory)}
                    >
                      <option value="直接看護業務">直接看護業務</option>
                      <option value="間接看護業務">間接看護業務</option>
                      <option value="その他・管理業務">その他・管理業務</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">カラーテーマ</label>
                    <select
                      className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 bg-white font-bold"
                      value={newTaskColorIdx}
                      onChange={(e) => setNewTaskColorIdx(Number(e.target.value))}
                    >
                      {COLOR_PRESETS.map((p, idx) => (
                        <option key={idx} value={idx}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-sky-600 hover:bg-sky-700 text-white font-extrabold rounded-xl text-xs flex items-center justify-center gap-1 shadow-xs cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>追加する</span>
              </button>
            </form>
          )}

          {/* 🟦 1. 直接看護業務 */}
          <div className="space-y-2">
            <div className="text-xs font-black text-sky-800 flex items-center gap-1.5 bg-sky-50 px-2.5 py-1 rounded-lg border border-sky-200">
              <span className="w-2 h-2 rounded-full bg-sky-500 inline-block"></span>
              <span>直接看護業務 ({directTasks.length}件)</span>
            </div>
            <div className="space-y-1.5">
              {directTasks.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-2 p-2 bg-white rounded-xl border border-slate-200 hover:border-slate-300">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/10"
                      style={{ backgroundColor: t.color }}
                    ></span>
                    <input
                      type="text"
                      className="flex-1 font-bold text-xs text-slate-800 border-b border-transparent hover:border-slate-300 focus:border-sky-500 focus:outline-none px-1 py-0.5"
                      value={t.name}
                      onChange={(e) => handleTaskNameChange(t.id, e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteTask(t.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
                    title="この業務を削除"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 🟩 2. 間接看護業務 */}
          <div className="space-y-2">
            <div className="text-xs font-black text-emerald-800 flex items-center gap-1.5 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
              <span>間接看護業務 ({indirectTasks.length}件)</span>
            </div>
            <div className="space-y-1.5">
              {indirectTasks.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-2 p-2 bg-white rounded-xl border border-slate-200 hover:border-slate-300">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/10"
                      style={{ backgroundColor: t.color }}
                    ></span>
                    <input
                      type="text"
                      className="flex-1 font-bold text-xs text-slate-800 border-b border-transparent hover:border-slate-300 focus:border-sky-500 focus:outline-none px-1 py-0.5"
                      value={t.name}
                      onChange={(e) => handleTaskNameChange(t.id, e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteTask(t.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
                    title="この業務を削除"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 🟧 3. その他・管理業務 */}
          <div className="space-y-2">
            <div className="text-xs font-black text-purple-800 flex items-center gap-1.5 bg-purple-50 px-2.5 py-1 rounded-lg border border-purple-200">
              <span className="w-2 h-2 rounded-full bg-purple-500 inline-block"></span>
              <span>その他・管理業務 ({otherTasks.length}件)</span>
            </div>
            <div className="space-y-1.5">
              {otherTasks.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-2 p-2 bg-white rounded-xl border border-slate-200 hover:border-slate-300">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0 border border-black/10"
                      style={{ backgroundColor: t.color }}
                    ></span>
                    <input
                      type="text"
                      className="flex-1 font-bold text-xs text-slate-800 border-b border-transparent hover:border-slate-300 focus:border-sky-500 focus:outline-none px-1 py-0.5"
                      value={t.name}
                      onChange={(e) => handleTaskNameChange(t.id, e.target.value)}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteTask(t.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
                    title="この業務を削除"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* フッターアクション */}
        <div className="flex items-center justify-between pt-3 border-t">
          <button
            type="button"
            className="px-3 py-2 text-xs text-slate-500 hover:text-slate-800 font-bold flex items-center gap-1 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
            onClick={handleResetToPreset}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>初期マスタにリセット</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              onClick={onClose}
            >
              キャンセル
            </button>
            <button
              type="button"
              className="px-5 py-2 text-xs font-extrabold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow-xs flex items-center gap-1.5 active:scale-95 cursor-pointer"
              onClick={() => {
                onSaveTasks(tasks);
                onClose();
              }}
            >
              <Check className="w-4 h-4" />
              <span>設定内容を保存して確定</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
