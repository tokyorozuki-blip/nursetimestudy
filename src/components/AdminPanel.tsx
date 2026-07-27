import React, { useState } from 'react';
import { TimeStudyRecord, TaskItem, CategoryGroup, JobRole } from '../types';
import { DEPARTMENTS } from '../constants';
import { Dashboard } from './Dashboard';
import { exportRecordsToCSV } from '../utils/exportCsv';
import {
  ShieldCheck,
  Building2,
  ListPlus,
  Trash2,
  Download,
  Plus,
  AlertTriangle,
  Lock,
  LogOut,
  BarChart3,
  Calendar,
  Filter,
  Stethoscope,
  HeartHandshake,
} from 'lucide-react';

interface AdminPanelProps {
  records: TimeStudyRecord[];
  tasks: TaskItem[];
  onAddTask: (newTask: TaskItem) => void;
  onDeleteTask: (taskId: string) => void;
  onClearAllRecords: () => void;
  onDeleteRecordsByDate: (dateStr: string) => void;
  onLogout: () => void;
  onGenerateMockData: () => void;
  onOpenEditMaster?: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  records,
  tasks,
  onAddTask,
  onDeleteTask,
  onClearAllRecords,
  onDeleteRecordsByDate,
  onLogout,
  onGenerateMockData,
  onOpenEditMaster,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'progress' | 'master' | 'data'>('dashboard');

  // 新規定型業務
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState<CategoryGroup>('直接看護業務');
  const [newTaskTargetRole, setNewTaskTargetRole] = useState<JobRole | '共通'>('看護師');
  const [newTaskDesc, setNewTaskDesc] = useState('');

  // マスタ表示・進捗の職種フィルター
  const [progressRoleFilter, setProgressRoleFilter] = useState<'ALL' | JobRole>('ALL');
  const [masterRoleTab, setMasterRoleTab] = useState<'ALL' | JobRole>('ALL');

  // データ削除用日付指定
  const todayStr = new Date().toISOString().split('T')[0];
  const [deleteTargetDate, setDeleteTargetDate] = useState<string>(todayStr);

  // 削除の2段階二重確認モーダル状態
  const [dateDeleteStep, setDateDeleteStep] = useState<0 | 1 | 2>(0); // 0:なし, 1:第1段階, 2:第2段階最終決定
  const [allDeleteStep, setAllDeleteStep] = useState<0 | 1 | 2>(0);   // 0:なし, 1:第1段階, 2:第2段階最終決定

  // 部署別進捗
  const deptProgressStats = DEPARTMENTS.map((dept) => {
    const deptRecords = records.filter(
      (r) => r.user.department === dept && (progressRoleFilter === 'ALL' || (r.user.role || '看護師') === progressRoleFilter)
    );
    const targetCount = dept === 'ICU' || dept === 'HCU' ? 25 : 35;
    const submittedCount = deptRecords.length;
    const percent = Math.min(100, Math.round((submittedCount / targetCount) * 100));

    return {
      department: dept,
      targetCount,
      submittedCount,
      percent,
    };
  });

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskName.trim()) return;

    let color = '#0284c7';
    let badgeBg = '#e0f2fe';

    if (newTaskCategory === '間接看護業務') {
      color = '#10b981';
      badgeBg = '#d1fae5';
    } else if (newTaskCategory === 'その他・管理業務') {
      color = '#a855f7';
      badgeBg = '#f3e8ff';
    }

    const newTask: TaskItem = {
      id: `custom-${Date.now()}`,
      name: newTaskName.trim(),
      category: newTaskCategory,
      color,
      badgeBg,
      description: newTaskDesc.trim() || 'カスタム追加された業務項目',
      targetRole: newTaskTargetRole,
    };

    onAddTask(newTask);
    setNewTaskName('');
    setNewTaskDesc('');
    alert(`新しい定型業務「${newTask.name}」（対象: ${newTaskTargetRole}）を追加しました。`);
  };

  // 日付指定削除対象の件数
  const dateTargetRecordsCount = records.filter((r) => r.user.targetDate === deleteTargetDate).length;

  // 日付指定削除 最終実行
  const handleFinalDeleteByDate = () => {
    onDeleteRecordsByDate(deleteTargetDate);
    setDateDeleteStep(0);
  };

  // 全件削除 最終実行
  const handleFinalDeleteAll = () => {
    onClearAllRecords();
    setAllDeleteStep(0);
  };

  return (
    <div className="admin-panel-container">
      {/* 管理画面ヘッダー */}
      <div className="admin-header">
        <div className="admin-title-group">
          <div className="admin-badge">
            <ShieldCheck className="w-5 h-5 text-purple-700" />
          </div>
          <div>
            <h2 className="admin-title">看護部 管理者専用コンソール</h2>
            <p className="admin-sub">パスワード認証済み (okasaikango)</p>
          </div>
        </div>

        <button
          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition-all active:scale-95 shrink-0"
          onClick={onLogout}
        >
          <LogOut className="w-4 h-4" />
          <span>管理者ログアウト（初期画面に戻る）</span>
        </button>
      </div>

      {/* サブタブ */}
      <div className="admin-tabs">
        <button
          className={`admin-tab ${activeSubTab === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('dashboard')}
        >
          <BarChart3 className="w-4 h-4" />
          <span>集計・分析ダッシュボード</span>
        </button>

        <button
          className={`admin-tab ${activeSubTab === 'progress' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('progress')}
        >
          <Building2 className="w-4 h-4" />
          <span>18部署別 提出進捗</span>
        </button>

        <button
          className={`admin-tab ${activeSubTab === 'master' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('master')}
        >
          <ListPlus className="w-4 h-4" />
          <span>定型業務マスタ編集</span>
        </button>

        <button
          className={`admin-tab ${activeSubTab === 'data' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('data')}
        >
          <Lock className="w-4 h-4" />
          <span>データ管理・2段階削除</span>
        </button>
      </div>

      {/* 1. 集計・分析ダッシュボード */}
      {activeSubTab === 'dashboard' && (
        <Dashboard
          records={records}
          onGenerateMockData={onGenerateMockData}
        />
      )}

      {/* 2. 部署別提出進捗 */}
      {activeSubTab === 'progress' && (
        <div className="admin-section">
          <div className="section-title-row flex-wrap gap-3">
            <h3 className="section-title">全18部署 提出ステータス一覧 (約600名対象)</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-semibold">職種表示切替:</span>
              <div className="inline-flex rounded-md shadow-sm border border-slate-200 bg-white p-0.5">
                <button
                  className={`px-2.5 py-1 text-xs rounded font-bold transition-all ${
                    progressRoleFilter === 'ALL'
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  onClick={() => setProgressRoleFilter('ALL')}
                >
                  全体
                </button>
                <button
                  className={`px-2.5 py-1 text-xs rounded font-bold transition-all ${
                    progressRoleFilter === '看護師'
                      ? 'bg-sky-600 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  onClick={() => setProgressRoleFilter('看護師')}
                >
                  看護師
                </button>
                <button
                  className={`px-2.5 py-1 text-xs rounded font-bold transition-all ${
                    progressRoleFilter === '看護補助者'
                      ? 'bg-emerald-600 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  onClick={() => setProgressRoleFilter('看護補助者')}
                >
                  看護補助者
                </button>
              </div>
            </div>
            <span className="total-submitted-badge ml-auto">
              全提出合計: <strong>{records.filter(r => progressRoleFilter === 'ALL' || (r.user.role || '看護師') === progressRoleFilter).length}</strong> 件
            </span>
          </div>

          <div className="dept-progress-grid">
            {deptProgressStats.map((stat) => (
              <div key={stat.department} className="dept-stat-card">
                <div className="dept-stat-header">
                  <span className="dept-stat-name">{stat.department}</span>
                  <span className="dept-stat-count">
                    {stat.submittedCount} / {stat.targetCount} 名
                  </span>
                </div>
                <div className="dept-progress-bg">
                  <div
                    className="dept-progress-fill"
                    style={{ width: `${stat.percent}%` }}
                  ></div>
                </div>
                <div className="dept-stat-footer">
                  <span>進捗率: {stat.percent}%</span>
                  <span className={stat.percent >= 80 ? 'text-emerald-600 font-bold' : 'text-amber-600'}>
                    {stat.percent >= 100 ? '提出完了' : stat.percent >= 80 ? '順調' : '要入力促し'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. 定型業務マスター管理 */}
      {activeSubTab === 'master' && (
        <div className="admin-section space-y-4">
          <div className="section-title-row flex items-center justify-between">
            <h3 className="section-title">定型業務マスターの一括登録・編集管理</h3>
            {onOpenEditMaster && (
              <button
                type="button"
                className="py-2 px-3.5 bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer"
                onClick={onOpenEditMaster}
              >
                <span>✏️ 全定型業務マスターの自由変更・色編集ダイアログを開く</span>
              </button>
            )}
          </div>

          <form onSubmit={handleCreateTask} className="master-add-card">
            <h4>＋ 新しい定型業務項目を追加</h4>
            <div className="master-form-grid">
              <div className="form-group">
                <label className="form-label">対象職種</label>
                <select
                  className="form-select font-bold"
                  value={newTaskTargetRole}
                  onChange={(e) => setNewTaskTargetRole(e.target.value as JobRole)}
                >
                  <option value="看護師">🩺 看護師専用</option>
                  <option value="看護補助者">🤝 看護補助者専用</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">業務名</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="例: オンラインカンファレンス"
                  value={newTaskName}
                  onChange={(e) => setNewTaskName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">業務カテゴリ</label>
                <select
                  className="form-select"
                  value={newTaskCategory}
                  onChange={(e) => setNewTaskCategory(e.target.value as CategoryGroup)}
                >
                  <option value="直接看護業務">🟦 直接看護業務</option>
                  <option value="間接看護業務">🟩 間接看護業務</option>
                  <option value="その他・管理業務">🟧 その他・管理業務</option>
                </select>
              </div>

              <div className="form-group full-width">
                <label className="form-label">補足・説明</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="業務内容の具体的な説明"
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                />
              </div>
            </div>
            <button type="submit" className="btn-primary btn-add-master">
              <Plus className="w-4 h-4" />
              定型業務マスタに追加する
            </button>
          </form>

          <div className="master-list-card">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h4 className="m-0">現在登録されている定型業務 ({tasks.length} 項目)</h4>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-semibold">職種絞り込み:</span>
                <div className="inline-flex rounded-md border border-slate-200 bg-white p-0.5">
                  <button
                    type="button"
                    className={`px-2.5 py-1 text-xs rounded font-bold transition-all ${
                      masterRoleTab === 'ALL'
                        ? 'bg-purple-700 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    onClick={() => setMasterRoleTab('ALL')}
                  >
                    すべて ({tasks.length})
                  </button>
                  <button
                    type="button"
                    className={`px-2.5 py-1 text-xs rounded font-bold transition-all ${
                      masterRoleTab === '看護師'
                        ? 'bg-sky-600 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    onClick={() => setMasterRoleTab('看護師')}
                  >
                    看護師用 ({tasks.filter(t => !t.targetRole || t.targetRole === '看護師' || t.targetRole === '共通').length})
                  </button>
                  <button
                    type="button"
                    className={`px-2.5 py-1 text-xs rounded font-bold transition-all ${
                      masterRoleTab === '看護補助者'
                        ? 'bg-emerald-600 text-white'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                    onClick={() => setMasterRoleTab('看護補助者')}
                  >
                    看護補助者用 ({tasks.filter(t => t.targetRole === '看護補助者' || t.targetRole === '共通').length})
                  </button>
                </div>
              </div>
            </div>

            <div className="master-items-table">
              {tasks
                .filter((t) => masterRoleTab === 'ALL' || !t.targetRole || t.targetRole === '共通' || t.targetRole === masterRoleTab)
                .map((task) => (
                  <div key={task.id} className="master-item-row">
                    <div className="master-item-info">
                      <span
                        className="master-cat-chip"
                        style={{ backgroundColor: task.badgeBg, color: task.color }}
                      >
                        {task.category}
                      </span>
                      <span className={`text-[11px] px-2 py-0.5 rounded font-bold ${
                        task.targetRole === '看護補助者'
                          ? 'bg-emerald-100 text-emerald-800'
                          : task.targetRole === '共通'
                          ? 'bg-slate-100 text-slate-700'
                          : 'bg-sky-100 text-sky-800'
                      }`}>
                        {task.targetRole || '看護師'}
                      </span>
                      <strong className="master-item-name">{task.name}</strong>
                      <span className="master-item-desc">{task.description}</span>
                    </div>
                    <button
                      className="btn-delete-task"
                      onClick={() => onDeleteTask(task.id)}
                      title="この定型業務を削除"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. データ管理・日付別削除 & 全データ削除 (二重安全確認) */}
      {activeSubTab === 'data' && (
        <div className="admin-section">
          <div className="section-title-row">
            <h3 className="section-title">調査データの一元管理 ＆ 2段階安全削除</h3>
          </div>

          <div className="data-control-grid">
            {/* 全件CSVダウンロード */}
            <div className="data-card">
              <Download className="w-6 h-6 text-sky-600 mb-2" />
              <h4>全件CSVデータバックアップ</h4>
              <p>集計されたすべてのタイムスタディデータをCSV出力します。</p>
              <button
                className="btn-primary mt-4"
                onClick={() => exportRecordsToCSV(records, '全看護師_タイムスタディ一括データ.csv')}
              >
                全件CSVダウンロード
              </button>
            </div>

            {/* ★ 1. 日付指定データの削除 (2段階二重確認) */}
            <div className="data-card warning-card">
              <Calendar className="w-6 h-6 text-amber-600 mb-2" />
              <h4>日付を指定してデータを削除</h4>
              <p>選択した特定の調査対象日の提出データのみをまとめて削除します。</p>

              <div className="form-group my-3 w-full">
                <label className="form-label text-xs">削除対象日を選択</label>
                <input
                  type="date"
                  className="form-input"
                  value={deleteTargetDate}
                  onChange={(e) => setDeleteTargetDate(e.target.value)}
                />
              </div>

              <div className="text-xs text-slate-500 mb-3">
                対象日 ({deleteTargetDate}) のデータ件数: <strong>{dateTargetRecordsCount}</strong> 件
              </div>

              <button
                className="btn-warning-delete w-full"
                onClick={() => {
                  if (dateTargetRecordsCount === 0) {
                    alert(`${deleteTargetDate} のデータは存在しません。`);
                    return;
                  }
                  setDateDeleteStep(1); // 第1段階へ
                }}
              >
                <Trash2 className="w-4 h-4" />
                <span>指定した日付 ({deleteTargetDate}) のデータを削除</span>
              </button>
            </div>

            {/* ★ 2. 本当にすべてのデータを削除 (2段階二重確認) */}
            <div className="data-card danger-card">
              <AlertTriangle className="w-6 h-6 text-red-600 mb-2" />
              <h4>本当にすべてのデータを一括削除</h4>
              <p>現在蓄積されているすべての提出データ（全 {records.length} 件）を消去し初期化します。</p>
              <button
                className="btn-danger mt-4 w-full"
                onClick={() => setAllDeleteStep(1)} // 第1段階へ
              >
                <Trash2 className="w-4 h-4" />
                <span>【完全消去】すべてのデータを削除する</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ★ 日付指定削除: 第1段階確認モーダル */}
      {dateDeleteStep === 1 && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="setup-header">
              <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-2" />
              <h2>【確認: 1/2】日付指定データの削除</h2>
              <p className="setup-sub">
                対象日: <strong>{deleteTargetDate}</strong> のデータ (計 {dateTargetRecordsCount} 件) を削除します。
              </p>
            </div>
            <div className="modal-buttons-flex">
              <button className="btn-secondary" onClick={() => setDateDeleteStep(0)}>
                キャンセル
              </button>
              <button className="btn-primary bg-amber-600" onClick={() => setDateDeleteStep(2)}>
                次へ進む (最終確認)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ★ 日付指定削除: 第2段階最終決定モーダル */}
      {dateDeleteStep === 2 && (
        <div className="modal-overlay">
          <div className="modal-card border-red-500 border-2">
            <div className="setup-header">
              <Trash2 className="w-10 h-10 text-red-600 mx-auto mb-2 animate-bounce" />
              <h2 className="text-red-600">【最終確定: 2/2】本当に削除してよろしいですか？</h2>
              <p className="setup-sub text-red-700 font-bold">
                {deleteTargetDate} の全 {dateTargetRecordsCount} 件のデータが完全に削除されます。この操作は復元できません！
              </p>
            </div>
            <div className="modal-buttons-flex">
              <button className="btn-secondary" onClick={() => setDateDeleteStep(0)}>
                中止して戻る
              </button>
              <button className="btn-danger font-bold" onClick={handleFinalDeleteByDate}>
                【実行】{deleteTargetDate} のデータを完全削除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ★ 全データ一括削除: 第1段階確認モーダル */}
      {allDeleteStep === 1 && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="setup-header">
              <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-2" />
              <h2>【確認: 1/2】すべてのデータの完全消去</h2>
              <p className="setup-sub">
                システム内に保存されているすべてのタイムスタディ提出データ (計 {records.length} 件) をリセット・削除します。
              </p>
            </div>
            <div className="modal-buttons-flex">
              <button className="btn-secondary" onClick={() => setAllDeleteStep(0)}>
                キャンセル
              </button>
              <button className="btn-danger" onClick={() => setAllDeleteStep(2)}>
                次へ進む (最終確認へ)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ★ 全データ一括削除: 第2段階最終決定モーダル */}
      {allDeleteStep === 2 && (
        <div className="modal-overlay">
          <div className="modal-card border-red-600 border-2">
            <div className="setup-header">
              <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-2 animate-pulse" />
              <h2 className="text-red-600">【最終危険警告: 2/2】本当にすべてのデータを削除しますか？</h2>
              <p className="setup-sub text-red-800 font-bold">
                600名規模の全データベースが完全に消去されます。元に戻すことは一切できません。
              </p>
            </div>
            <div className="modal-buttons-flex">
              <button className="btn-secondary" onClick={() => setAllDeleteStep(0)}>
                中止して保護する
              </button>
              <button className="btn-danger font-bold bg-red-700" onClick={handleFinalDeleteAll}>
                【完全実行】すべての調査データを即座に削除する
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
