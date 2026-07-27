import React, { useState } from 'react';
import { TimeStudyRecord, TaskItem, CategoryGroup, JobRole } from '../types';
import { DEPARTMENTS } from '../constants';
import { Dashboard } from './Dashboard';
import { exportRecordsToCSV } from '../utils/exportCsv';
import { getDeptTargets, saveDeptTargets, deleteSubmittedRecordsFromVercel } from '../utils/storage';
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
  Settings,
  Users,
  X,
  Check,
} from 'lucide-react';

interface AdminPanelProps {
  records: TimeStudyRecord[];
  tasks: TaskItem[];
  onAddTask: (newTask: TaskItem) => void;
  onDeleteTask: (taskId: string) => void;
  onClearAllRecords: () => void;
  onDeleteRecordsByDate: (dateStr: string) => void;
  onDeleteCloudRecords?: (targetDate?: string) => Promise<boolean>;
  onLogout: () => void;
  onGenerateMockData: () => void;
  onOpenEditMaster?: () => void;
  onRefreshRecords?: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  records,
  tasks,
  onAddTask,
  onDeleteTask,
  onClearAllRecords,
  onDeleteRecordsByDate,
  onDeleteCloudRecords,
  onLogout,
  onGenerateMockData,
  onOpenEditMaster,
  onRefreshRecords,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'progress' | 'master' | 'data'>('dashboard');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // 新規定型業務
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState<CategoryGroup>('直接看護業務');
  const [newTaskTargetRole, setNewTaskTargetRole] = useState<JobRole | '共通'>('看護師');
  const [newTaskDesc, setNewTaskDesc] = useState('');

  // マスタ表示・進捗の職種フィルター ＆ 表示モード ＆ 目標設定
  const [progressRoleFilter, setProgressRoleFilter] = useState<'ALL' | JobRole>('ALL');
  const [progressDisplayMode, setProgressDisplayMode] = useState<'countOnly' | 'withTarget'>('countOnly');
  const [deptTargets, setDeptTargets] = useState<Record<string, number>>(() => getDeptTargets());
  const [showTargetModal, setShowTargetModal] = useState<boolean>(false);
  const [editingTargets, setEditingTargets] = useState<Record<string, number>>({});
  const [masterRoleTab, setMasterRoleTab] = useState<'ALL' | JobRole>('ALL');

  // データ削除用日付指定
  const todayStr = new Date().toISOString().split('T')[0];
  const [deleteTargetDate, setDeleteTargetDate] = useState<string>(todayStr);

  // 削除の2段階二重確認モーダル状態
  const [dateDeleteStep, setDateDeleteStep] = useState<0 | 1 | 2>(0); // 0:なし, 1:第1段階, 2:第2段階最終決定
  const [allDeleteStep, setAllDeleteStep] = useState<0 | 1 | 2>(0);   // 0:なし, 1:第1段階, 2:第2段階最終決定

  // クラウドデータダウンロード後削除モーダル状態
  const [cloudDeleteStep, setCloudDeleteStep] = useState<0 | 1 | 2>(0); // 0:なし, 1:ダウンロード完了＆削除確認, 2:最終確証
  const [cloudDeleteMode, setCloudDeleteMode] = useState<'all' | 'date'>('all');
  const [cloudIsDeleting, setCloudIsDeleting] = useState<boolean>(false);

  // 部署別提出人数集計
  const deptProgressStats = DEPARTMENTS.map((dept) => {
    const deptRecords = records.filter(
      (r) => r.user.department === dept && (progressRoleFilter === 'ALL' || (r.user.role || '看護師') === progressRoleFilter)
    );
    const targetCount = deptTargets[dept] || 0;
    const uniqueStaffSet = new Set(deptRecords.map((r) => r.user.staffId || r.user.name));
    const submittedCount = uniqueStaffSet.size;

    return {
      department: dept,
      targetCount,
      submittedCount,
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

        <div className="flex items-center gap-2">
          {onRefreshRecords && (
            <button
              type="button"
              disabled={isSyncing}
              className={`px-3.5 py-2 text-white rounded-xl font-extrabold text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95 shrink-0 cursor-pointer ${
                isSyncing ? 'bg-sky-400 opacity-80 cursor-wait' : 'bg-sky-600 hover:bg-sky-700'
              }`}
              onClick={async () => {
                setIsSyncing(true);
                try {
                  await onRefreshRecords();
                  // ★ 同期完了時に自動でダッシュボードタブへ切り替えてリアルタイム表示更新！
                  setActiveSubTab('dashboard');
                } finally {
                  setTimeout(() => setIsSyncing(false), 400);
                }
              }}
              title="Vercelクラウドから他端末の最新提出データを即時読み込み"
            >
              <span className={isSyncing ? 'animate-spin inline-block' : ''}>🔄</span>
              <span>{isSyncing ? 'クラウド同期中...' : '最新提出データをクラウドから同期'}</span>
            </button>
          )}

          <button
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition-all active:scale-95 shrink-0 cursor-pointer"
            onClick={onLogout}
          >
            <LogOut className="w-4 h-4" />
            <span>管理者ログアウト</span>
          </button>
        </div>
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
          onRefreshRecords={onRefreshRecords}
        />
      )}

      {/* 2. 部署別提出進捗 */}
      {activeSubTab === 'progress' && (
        <div className="admin-section">
          <div className="section-title-row flex-wrap gap-3">
            <h3 className="section-title">全18部署 提出ステータス一覧</h3>

            {/* 職種表示切替 */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-semibold">職種:</span>
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

            <button
              type="button"
              className="px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-bold transition-colors flex items-center gap-1.5 border border-slate-300 ml-auto"
              onClick={() => {
                setEditingTargets({ ...deptTargets });
                setShowTargetModal(true);
              }}
            >
              <Settings className="w-3.5 h-3.5 text-slate-600" />
              <span>回答対象者数を設定</span>
            </button>

            <span className="total-submitted-badge ml-auto">
              全提出合計: <strong>{records.filter(r => progressRoleFilter === 'ALL' || (r.user.role || '看護師') === progressRoleFilter).length}</strong> 件
            </span>
          </div>

          <div className="dept-progress-grid mt-4">
            {deptProgressStats.map((stat) => (
              <div key={stat.department} className="dept-stat-card">
                <div className="dept-stat-header">
                  <span className="dept-stat-name">{stat.department}</span>
                  <div className="flex items-baseline gap-1">
                    <span className="dept-stat-count text-sky-700 font-bold text-lg">
                      {stat.submittedCount}
                    </span>
                    {stat.targetCount > 0 ? (
                      <span className="text-xs text-slate-500 font-semibold">
                        / {stat.targetCount} 名
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500 font-semibold">
                        名 提出
                      </span>
                    )}
                  </div>
                </div>

                <div className="dept-stat-footer pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span>実提出人数</span>
                  <span className={stat.submittedCount > 0 ? 'text-sky-700 font-bold' : 'text-slate-400'}>
                    {stat.submittedCount > 0 ? `${stat.submittedCount} 名完了` : '未提出'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 各部署の回答対象者数変更モーダル */}
      {showTargetModal && (
        <div className="modal-overlay">
          <div className="modal-content max-w-xl max-h-[85vh] flex flex-col p-5 bg-white rounded-xl shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Settings className="w-5 h-5 text-sky-600" />
                回答対象者数（目標人数）の設定
              </h3>
              <button
                onClick={() => setShowTargetModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 my-3">
              各部署の回答対象者数（スタッフ数）を任意で設定できます。未入力または「0」にすると実提出人数のみが表示されます。
            </p>

            <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 gap-3 my-2">
              {DEPARTMENTS.map((dept) => (
                <div key={dept} className="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-200">
                  <span className="text-xs font-bold text-slate-700">{dept}</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min="0"
                      max="200"
                      placeholder="任意"
                      className="w-16 px-2 py-1 text-xs border border-slate-300 rounded font-mono font-bold text-right"
                      value={editingTargets[dept] || ''}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setEditingTargets((prev) => ({
                          ...prev,
                          [dept]: isNaN(val) || val < 0 ? 0 : val,
                        }));
                      }}
                    />
                    <span className="text-xs text-slate-500">名</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
              <button
                type="button"
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                onClick={() => setShowTargetModal(false)}
              >
                キャンセル
              </button>
              <button
                type="button"
                className="px-4 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-lg flex items-center gap-1 shadow-sm"
                onClick={() => {
                  setDeptTargets(editingTargets);
                  saveDeptTargets(editingTargets);
                  setShowTargetModal(false);
                  alert('回答対象者数の設定を更新しました。');
                }}
              >
                <Check className="w-4 h-4" />
                設定を保存
              </button>
            </div>
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

            {/* ★ クラウドデータダウンロード ＆ クラウドDB削除 */}
            <div className="data-card border-2 border-purple-300 bg-purple-50/40">
              <Download className="w-6 h-6 text-purple-600 mb-2" />
              <h4 className="text-purple-900 font-extrabold">クラウドDBからダウンロード後に削除</h4>
              <p className="text-slate-600 text-xs">
                クラウドDB（Vercel）上の提出データをCSV形式でダウンロードして保存した後、クラウド上のデータを消去します（確認ダイアログ付き）。
              </p>

              <div className="flex flex-col gap-2 mt-4">
                <button
                  type="button"
                  className="px-3.5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer"
                  onClick={() => {
                    if (records.length === 0) {
                      alert('ダウンロード・削除対象の提出データが存在しません。');
                      return;
                    }
                    exportRecordsToCSV(records, `全看護師_クラウドタイムスタディ一括データ_${todayStr}.csv`);
                    setCloudDeleteMode('all');
                    setCloudDeleteStep(1);
                  }}
                >
                  <Download className="w-4 h-4" />
                  <span>全件CSVをダウンロード後にクラウド削除</span>
                </button>

                <button
                  type="button"
                  className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all active:scale-95 cursor-pointer"
                  onClick={() => {
                    if (dateTargetRecordsCount === 0) {
                      alert(`対象日 (${deleteTargetDate}) の提出データは存在しません。`);
                      return;
                    }
                    const targetRecs = records.filter((r) => r.user.targetDate === deleteTargetDate);
                    exportRecordsToCSV(targetRecs, `看護タイムスタディ_${deleteTargetDate}_データ.csv`);
                    setCloudDeleteMode('date');
                    setCloudDeleteStep(1);
                  }}
                >
                  <Calendar className="w-4 h-4" />
                  <span>指定日 ({deleteTargetDate}) をDL後にクラウド削除</span>
                </button>
              </div>
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

      {/* ★ クラウドデータダウンロード後削除: 第1段階確認モーダル */}
      {cloudDeleteStep === 1 && (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="setup-header">
              <Check className="w-10 h-10 text-emerald-500 mx-auto mb-2 bg-emerald-100 p-2 rounded-full" />
              <h2>【確認: 1/2】CSVデータのダウンロードが完了しました</h2>
              <p className="setup-sub">
                {cloudDeleteMode === 'all'
                  ? `全件データ (計 ${records.length} 件) のCSVファイルをダウンロードしました。`
                  : `指定日 (${deleteTargetDate}) のデータ (計 ${dateTargetRecordsCount} 件) のCSVファイルをダウンロードしました。`}
                <br />
                <strong className="text-purple-700">クラウドDB上のデータを削除してもよろしいですか？</strong>
              </p>
            </div>
            <div className="modal-buttons-flex">
              <button className="btn-secondary" onClick={() => setCloudDeleteStep(0)}>
                キャンセル (削除せず保持)
              </button>
              <button className="btn-primary bg-purple-600 hover:bg-purple-700" onClick={() => setCloudDeleteStep(2)}>
                次へ進む (クラウド削除の最終確認へ)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ★ クラウドデータダウンロード後削除: 第2段階最終決定モーダル */}
      {cloudDeleteStep === 2 && (
        <div className="modal-overlay">
          <div className="modal-card border-purple-600 border-2">
            <div className="setup-header">
              <Trash2 className="w-12 h-12 text-purple-600 mx-auto mb-2 animate-bounce" />
              <h2 className="text-purple-900">【最終確定: 2/2】本当にクラウド上のデータを消去しますか？</h2>
              <p className="setup-sub text-purple-800 font-bold">
                {cloudDeleteMode === 'all'
                  ? `クラウドDB上の全 ${records.length} 件のデータが完全消去されます。`
                  : `クラウドDB上の ${deleteTargetDate} の全 ${dateTargetRecordsCount} 件のデータが完全消去されます。`}
                <br />
                ※手元にダウンロードされたCSVファイルは安全に保存されています。
              </p>
            </div>
            <div className="modal-buttons-flex">
              <button className="btn-secondary" disabled={cloudIsDeleting} onClick={() => setCloudDeleteStep(0)}>
                中止して保護する
              </button>
              <button
                className="btn-danger font-bold bg-purple-700 hover:bg-purple-800"
                disabled={cloudIsDeleting}
                onClick={async () => {
                  setCloudIsDeleting(true);
                  try {
                    const targetDateParam = cloudDeleteMode === 'date' ? deleteTargetDate : undefined;
                    let success = false;
                    if (onDeleteCloudRecords) {
                      success = await onDeleteCloudRecords(targetDateParam);
                    } else {
                      success = await deleteSubmittedRecordsFromVercel(targetDateParam);
                      if (onRefreshRecords) await onRefreshRecords();
                    }
                    if (success) {
                      alert('クラウドDB上のデータ削除が正常に完了しました。');
                    }
                  } catch (err: any) {
                    alert(`削除処理中にエラーが発生しました: ${err?.message || err}`);
                  } finally {
                    setCloudIsDeleting(false);
                    setCloudDeleteStep(0);
                  }
                }}
              >
                {cloudIsDeleting ? 'クラウド削除を実行中...' : '【実行】クラウドDB上のデータを完全削除する'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
