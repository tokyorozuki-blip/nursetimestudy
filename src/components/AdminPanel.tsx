import React, { useState, useMemo, useEffect, useRef } from 'react';
import { TimeStudyRecord, TaskItem, CategoryGroup, JobRole, UserProfile, Department, AgeGroup } from '../types';
import { DEPARTMENTS, AGE_GROUPS, PRESET_TASKS } from '../constants';
import { Dashboard } from './Dashboard';
import { exportRecordsToCSV } from '../utils/exportCsv';
import { exportTaskMasterToCSV, parseTaskMasterCSV, readCsvFileText } from '../utils/taskCsv';
import {
  getDeptTargets,
  saveDeptTargets,
  deleteSubmittedRecordsFromVercel,
  getAllRegisteredUsers,
  fetchUsersFromVercel,
  saveUserProfile,
  saveUserToVercel,
  deleteUserProfileByStaffId,
  deleteUserFromVercel,
} from '../utils/storage';
import {
  ShieldCheck,
  Building2,
  ListPlus,
  Trash2,
  Download,
  Upload,
  RotateCcw,
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
  Edit,
  Search,
  RefreshCw,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  UserCheck,
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
  onSaveTasks?: (updatedTasks: TaskItem[]) => void;
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
  onSaveTasks,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'dashboard' | 'progress' | 'master' | 'users' | 'data'>('dashboard');
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // 登録ユーザー一覧管理ステート
  const [registeredUsers, setRegisteredUsers] = useState<UserProfile[]>(() => getAllRegisteredUsers());
  const [userSearchText, setUserSearchText] = useState<string>('');
  const [userNameFilter, setUserNameFilter] = useState<string>('');
  const [userDeptFilter, setUserDeptFilter] = useState<string>('ALL');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('ALL');
  const [userDateSort, setUserDateSort] = useState<'desc' | 'asc'>('desc'); // 'desc': 最新順, 'asc': 古い順
  const [userIsSyncing, setUserIsSyncing] = useState<boolean>(false);

  // ユーザー編集モーダルステート
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [editUserName, setEditUserName] = useState<string>('');
  const [editUserRole, setEditUserRole] = useState<JobRole>('看護師');
  const [editUserDept, setEditUserDept] = useState<Department>('ICU');
  const [editUserAge, setEditUserAge] = useState<AgeGroup>('25〜29歳');

  // ユーザー削除確認モーダルステート
  const [deletingUser, setDeletingUser] = useState<UserProfile | null>(null);

  // 業務マスター直接CSV取込用
  const masterFileInputRef = useRef<HTMLInputElement>(null);

  const handleAdminCsvUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const csvText = await readCsvFileText(file);
      if (!csvText || !csvText.trim()) {
        alert('CSVファイルが空か、正常に読み込めませんでした。');
        return;
      }

      const { tasks: parsedTasks, errors } = parseTaskMasterCSV(csvText);
      if (parsedTasks.length === 0) {
        alert(errors[0] || 'CSVファイルの解析に失敗しました。有効な定型業務データが見つかりません。');
        return;
      }

      if (
        window.confirm(
          `CSVファイルから全 ${parsedTasks.length} 件の定型業務マスターを検出しました。現在の業務マスターを上書き保存しますか？`
        )
      ) {
        if (onSaveTasks) {
          onSaveTasks(parsedTasks);
        }
        alert(
          `✅ CSVファイルから全 ${parsedTasks.length} 件の業務マスターを取り込み、保存完了しました！${
            errors.length > 0 ? `\n(注記: ${errors.join(', ')})` : ''
          }`
        );
      }
    } catch (err: any) {
      console.error('Master CSV Import Error:', err);
      alert(`CSVファイルの取り込み中にエラーが発生しました: ${err?.message || err}`);
    } finally {
      e.target.value = '';
    }
  };

  // クラウド＆ローカルから最新の登録ユーザーリストを再取得（提出レコード内のユーザーも補完マージ）
  const refreshRegisteredUsers = async () => {
    setUserIsSyncing(true);
    try {
      const fetched = await fetchUsersFromVercel();
      const userMap = new Map<string, UserProfile>();

      // 各職員IDに対応する最古提出日時・端末IDの自動抽出マップ
      const firstSubmitMap = new Map<string, string>();
      const deviceIdMap = new Map<string, string>();

      records.forEach((r) => {
        if (r.user && r.user.staffId) {
          if (r.submittedAt) {
            const prev = firstSubmitMap.get(r.user.staffId);
            if (!prev || r.submittedAt < prev) {
              firstSubmitMap.set(r.user.staffId, r.submittedAt);
            }
          }
          if (r.user.deviceId && r.user.deviceId.trim() !== '') {
            deviceIdMap.set(r.user.staffId, r.user.deviceId);
          }
        }
      });

      // 1. 登録済みユーザーリストを追加 (createdAt / deviceId が無い場合は補完)
      if (Array.isArray(fetched)) {
        fetched.forEach((u) => {
          if (u && u.staffId && u.staffId.trim() !== '' && u.name && u.name.trim() !== '') {
            const fallbackCreated = firstSubmitMap.get(u.staffId) || u.createdAt;
            const fallbackDevice = u.deviceId || deviceIdMap.get(u.staffId) || `DEV-${u.staffId.slice(-4)}`;
            userMap.set(u.staffId, {
              ...u,
              deviceId: fallbackDevice,
              createdAt: u.createdAt || fallbackCreated,
            });
          }
        });
      }

      // 2. 提出された集計レコード内のユーザー情報もマージ補完
      records.forEach((r) => {
        if (
          r.user &&
          r.user.staffId &&
          r.user.staffId.trim() !== '' &&
          r.user.name &&
          r.user.name.trim() !== '' &&
          r.user.name !== '名前未設定'
        ) {
          const existing = userMap.get(r.user.staffId);
          const createdDate =
            existing?.createdAt ||
            r.user.createdAt ||
            firstSubmitMap.get(r.user.staffId) ||
            r.submittedAt;
          const devId =
            existing?.deviceId ||
            r.user.deviceId ||
            deviceIdMap.get(r.user.staffId) ||
            `DEV-${r.user.staffId.slice(-4)}`;

          if (!existing) {
            userMap.set(r.user.staffId, {
              staffId: r.user.staffId,
              name: r.user.name,
              role: r.user.role || '看護師',
              department: r.user.department || 'ICU',
              ageGroup: r.user.ageGroup || '30〜34歳',
              deviceId: devId,
              createdAt: createdDate,
            });
          } else {
            let isUpdated = false;
            const updatedUser = { ...existing };
            if (!updatedUser.createdAt && createdDate) {
              updatedUser.createdAt = createdDate;
              isUpdated = true;
            }
            if (!updatedUser.deviceId && devId) {
              updatedUser.deviceId = devId;
              isUpdated = true;
            }
            if (isUpdated) {
              userMap.set(r.user.staffId, updatedUser);
            }
          }
        }
      });

      const mergedList = Array.from(userMap.values());
      setRegisteredUsers(mergedList);
    } catch (err) {
      console.error('Failed to refresh users:', err);
    } finally {
      setUserIsSyncing(false);
    }
  };

  // 管理画面起動時および「ユーザー登録状況・一覧管理」タブ選択時に自動でクラウドDBから最新登録ユーザー情報を自動取得・同期
  useEffect(() => {
    refreshRegisteredUsers();
  }, []);

  useEffect(() => {
    if (activeSubTab === 'users') {
      refreshRegisteredUsers();
    }
  }, [activeSubTab]);

  // 登録ユーザーの絞り込み一覧（氏名フィルター・登録日時ソート順適用・無効データ完全除外）
  const filteredUsersList = useMemo(() => {
    return registeredUsers
      .filter((u) => u && u.staffId && u.staffId.trim() !== '' && u.name && u.name.trim() !== '')
      .filter((u) => {
        const matchRole = userRoleFilter === 'ALL' || (u.role || '看護師') === userRoleFilter;
        const matchDept = userDeptFilter === 'ALL' || (u.department || '未設定') === userDeptFilter;
        const matchName =
          !userNameFilter.trim() ||
          (u.name && u.name.toLowerCase().includes(userNameFilter.trim().toLowerCase()));
        const matchSearch =
          !userSearchText.trim() ||
          (u.name && u.name.toLowerCase().includes(userSearchText.trim().toLowerCase())) ||
          (u.staffId && u.staffId.includes(userSearchText.trim()));
        return matchRole && matchDept && matchName && matchSearch;
      })
      .sort((a, b) => {
        const dateA = a.createdAt || '';
        const dateB = b.createdAt || '';
        if (userDateSort === 'desc') {
          return dateB.localeCompare(dateA);
        } else {
          return dateA.localeCompare(dateB);
        }
      });
  }, [registeredUsers, userRoleFilter, userDeptFilter, userNameFilter, userSearchText, userDateSort]);

  // 編集ダイアログを開く
  const handleOpenEditUser = (u: UserProfile) => {
    setEditingUser(u);
    setEditUserName(u.name || '');
    setEditUserRole(u.role || '看護師');
    setEditUserDept(u.department || 'ICU');
    setEditUserAge(u.ageGroup || '25〜29歳');
  };

  // 編集の保存処理
  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !editUserName.trim()) return;

    const updatedUser: UserProfile = {
      ...editingUser,
      name: editUserName.trim(),
      role: editUserRole,
      department: editUserDept,
      ageGroup: editUserAge,
    };

    saveUserProfile(updatedUser);
    await saveUserToVercel(updatedUser);
    setEditingUser(null);
    await refreshRegisteredUsers();
    alert(`職員ID: ${updatedUser.staffId} (${updatedUser.name} さん) の登録情報を更新しました。`);
  };

  // ユーザーの完全削除処理
  const handleConfirmDeleteUser = async () => {
    if (!deletingUser) return;

    deleteUserProfileByStaffId(deletingUser.staffId);
    await deleteUserFromVercel(deletingUser.staffId);
    setDeletingUser(null);
    await refreshRegisteredUsers();
    alert(`職員ID: ${deletingUser.staffId} のユーザー登録情報を完全削除しました。`);
  };

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

  // データ削除用日付指定 (JSTローカル本日日付をデフォルトセット)
  const getTodayJST = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const todayStr = getTodayJST();
  const [deleteTargetDate, setDeleteTargetDate] = useState<string>(todayStr);

  // 削除の2段階二重確認モーダル状態
  const [dateDeleteStep, setDateDeleteStep] = useState<0 | 1 | 2>(0); // 0:なし, 1:第1段階, 2:第2段階最終決定
  const [allDeleteStep, setAllDeleteStep] = useState<0 | 1 | 2>(0);   // 0:なし, 1:第1段階, 2:第2段階最終決定

  // クラウドデータダウンロード後削除モーダル状態
  const [cloudDeleteStep, setCloudDeleteStep] = useState<0 | 1 | 2>(0); // 0:なし, 1:ダウンロード完了＆削除確認, 2:最終確証
  const [cloudDeleteMode, setCloudDeleteMode] = useState<'all' | 'date'>('all');
  const [cloudIsDeleting, setCloudIsDeleting] = useState<boolean>(false);
  const [isCloudDateModalOpen, setIsCloudDateModalOpen] = useState<boolean>(false);
  const [selectedCloudDate, setSelectedCloudDate] = useState<string>(deleteTargetDate || todayStr);

  // 提出データが存在する全対象日のユニークリスト（新しい順）
  const availableDates = useMemo(() => {
    const datesSet = new Set<string>();
    records.forEach((r) => {
      if (r.user && r.user.targetDate) {
        datesSet.add(r.user.targetDate);
      }
    });
    return Array.from(datesSet).sort((a, b) => b.localeCompare(a));
  }, [records]);

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

  // 日付指定削除 最終実行 (CSVバックアップ出力選択対応)
  const handleFinalDeleteByDate = (exportBackup: boolean = true) => {
    if (exportBackup) {
      const targetRecs = records.filter((r) => r.user.targetDate === deleteTargetDate);
      if (targetRecs.length > 0) {
        exportRecordsToCSV(targetRecs, `看護タイムスタディ_${deleteTargetDate}_削除前バックアップ.csv`);
      }
    }
    onDeleteRecordsByDate(deleteTargetDate);
    setDateDeleteStep(0);
  };

  // 全件削除 最終実行 (CSVバックアップ出力選択対応)
  const handleFinalDeleteAll = (exportBackup: boolean = true) => {
    if (exportBackup && records.length > 0) {
      exportRecordsToCSV(records, `全看護師_タイムスタディ一括データ_削除前バックアップ_${todayStr}.csv`);
    }
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
            <h2 className="admin-title">看護部 管理者専用画面</h2>
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
          className={`admin-tab ${activeSubTab === 'users' ? 'active' : ''}`}
          onClick={() => {
            setActiveSubTab('users');
            refreshRegisteredUsers();
          }}
        >
          <Users className="w-4 h-4" />
          <span>ユーザー登録状況・一覧管理</span>
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
          <div className="section-title-row flex items-center justify-between flex-wrap gap-2">
            <h3 className="section-title">定型業務マスターの一括登録・編集管理</h3>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                className="py-2 px-3 bg-white hover:bg-slate-50 text-slate-700 font-extrabold text-xs rounded-xl border border-slate-300 shadow-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                onClick={() => exportTaskMasterToCSV(tasks)}
              >
                <Download className="w-3.5 h-3.5 text-sky-600" />
                <span>登録業務をCSV出力</span>
              </button>
              <button
                type="button"
                className="py-2 px-3 bg-amber-50 hover:bg-amber-100 text-amber-900 font-extrabold text-xs rounded-xl border border-amber-300 shadow-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                onClick={() => {
                  if (window.confirm('登録されている業務変更内容を破棄し、標準の初期デフォルト業務マスターに戻しますか？')) {
                    if (onSaveTasks) {
                      onSaveTasks(PRESET_TASKS);
                      alert('標準の初期デフォルト業務マスターにリセット・保存しました。');
                    } else if (onOpenEditMaster) {
                      onOpenEditMaster();
                    }
                  }
                }}
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                <span>デフォルト初期業務に戻す</span>
              </button>
              <input
                type="file"
                ref={masterFileInputRef}
                accept=".csv"
                className="hidden"
                onChange={handleAdminCsvUpload}
              />
              <button
                type="button"
                className="py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                onClick={() => masterFileInputRef.current?.click()}
              >
                <Upload className="w-3.5 h-3.5 text-white" />
                <span>登録業務CSVを取込</span>
              </button>
              {onOpenEditMaster && (
                <button
                  type="button"
                  className="py-2 px-3.5 bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs rounded-xl shadow-xs flex items-center gap-1.5 cursor-pointer transition-all active:scale-95"
                  onClick={onOpenEditMaster}
                >
                  <span>✏️ 業務マスター一括編集・修正CSVの取込ダイアログを開く</span>
                </button>
              )}
            </div>
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

      {/* 4. ユーザー登録状況・一覧管理 (編集・削除機能付き) */}
      {activeSubTab === 'users' && (
        <div className="admin-section space-y-4">
          <div className="section-title-row flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="section-title">登録済み職員・ユーザープロファイル一元管理</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                全端末から登録された職員プロファイルの閲覧・編集・削除が行えます。
              </p>
            </div>

            <button
              type="button"
              disabled={userIsSyncing}
              className={`px-3.5 py-2 text-white rounded-xl font-extrabold text-xs flex items-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer ${
                userIsSyncing ? 'bg-sky-400 opacity-80 cursor-wait' : 'bg-sky-600 hover:bg-sky-700'
              }`}
              onClick={refreshRegisteredUsers}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${userIsSyncing ? 'animate-spin' : ''}`} />
              <span>{userIsSyncing ? 'ユーザー情報を同期中...' : '最新ユーザー情報をクラウドから同期'}</span>
            </button>
          </div>

          {/* KPIカード（登録者数・看護師数・看護補助者数） */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-sky-50 border border-sky-200 p-3.5 rounded-xl flex items-center justify-between shadow-2xs">
              <div>
                <div className="text-xs font-bold text-sky-800">全登録職員数</div>
                <div className="text-2xl font-black text-sky-900 mt-0.5">{registeredUsers.length} <span className="text-xs font-bold">名</span></div>
              </div>
              <Users className="w-8 h-8 text-sky-500 opacity-80" />
            </div>

            <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl flex items-center justify-between shadow-2xs">
              <div>
                <div className="text-xs font-bold text-emerald-800">看護師 登録数</div>
                <div className="text-2xl font-black text-emerald-900 mt-0.5">
                  {registeredUsers.filter((u) => (u.role || '看護師') === '看護師').length} <span className="text-xs font-bold">名</span>
                </div>
              </div>
              <Stethoscope className="w-8 h-8 text-emerald-500 opacity-80" />
            </div>

            <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl flex items-center justify-between shadow-2xs">
              <div>
                <div className="text-xs font-bold text-amber-800">看護補助者 登録数</div>
                <div className="text-2xl font-black text-amber-900 mt-0.5">
                  {registeredUsers.filter((u) => u.role === '看護補助者').length} <span className="text-xs font-bold">名</span>
                </div>
              </div>
              <HeartHandshake className="w-8 h-8 text-amber-500 opacity-80" />
            </div>
          </div>

          {/* フィルター＆検索バー */}
          <div className="filter-bar">
            <div className="filter-item">
              <Filter className="w-4 h-4 text-slate-500" />
              <label>職種絞り込み:</label>
              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
              >
                <option value="ALL">全職種 (全体)</option>
                <option value="看護師">看護師</option>
                <option value="看護補助者">看護補助者</option>
              </select>
            </div>

            <div className="filter-item">
              <Building2 className="w-4 h-4 text-slate-500" />
              <label>部署絞り込み:</label>
              <select
                value={userDeptFilter}
                onChange={(e) => setUserDeptFilter(e.target.value)}
              >
                <option value="ALL">全18部署 (全体)</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-item">
              <UserCheck className="w-4 h-4 text-slate-500" />
              <label>氏名絞り込み:</label>
              <input
                type="text"
                className="bg-white border border-slate-300 text-xs px-2 py-1 rounded outline-none focus:border-sky-500"
                placeholder="氏名を入力..."
                value={userNameFilter}
                onChange={(e) => setUserNameFilter(e.target.value)}
              />
            </div>

            <div className="filter-item">
              <ArrowUpDown className="w-4 h-4 text-slate-500" />
              <label>登録日時ソート:</label>
              <select
                value={userDateSort}
                onChange={(e) => setUserDateSort(e.target.value as 'desc' | 'asc')}
              >
                <option value="desc">新しい順 (降順 ⬇)</option>
                <option value="asc">古い順 (昇順 ⬆)</option>
              </select>
            </div>

            <div className="filter-item search-item">
              <Search className="w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="職員ID(6桁)で検索..."
                value={userSearchText}
                onChange={(e) => setUserSearchText(e.target.value)}
              />
            </div>

            <div className="filter-count ml-auto">
              該当件数: <strong>{filteredUsersList.length}</strong> / 全 {registeredUsers.length} 名
            </div>
          </div>

          {/* 登録ユーザーテーブル */}
          <div className="table-card">
            <div className="table-responsive">
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>職員ID</th>
                    <th>氏名</th>
                    <th>職種</th>
                    <th>所属部署</th>
                    <th>年齢階層</th>
                    <th
                      className="cursor-pointer select-none hover:bg-sky-50/80 transition-colors"
                      onClick={() => setUserDateSort((prev) => (prev === 'desc' ? 'asc' : 'desc'))}
                      title="クリックで登録日時の降順/昇順切り替え"
                    >
                      <div className="flex items-center gap-1">
                        <span>登録日時</span>
                        {userDateSort === 'desc' ? (
                          <ArrowDown className="w-3.5 h-3.5 text-sky-600 font-bold" />
                        ) : (
                          <ArrowUp className="w-3.5 h-3.5 text-sky-600 font-bold" />
                        )}
                      </div>
                    </th>
                    <th>端末ID</th>
                    <th className="text-center">操作 (編集・削除)</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsersList.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-8 text-slate-400 text-xs">
                        該当する登録ユーザーは見つかりませんでした。
                      </td>
                    </tr>
                  ) : (
                    filteredUsersList.map((u) => (
                      <tr key={u.staffId}>
                        <td className="font-mono font-bold text-sky-800">{u.staffId}</td>
                        <td className="font-bold text-slate-900">{u.name} さん</td>
                        <td>
                          <span
                            className={`text-xs px-2.5 py-0.5 rounded font-bold ${
                              u.role === '看護補助者'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-sky-100 text-sky-800'
                            }`}
                          >
                            {u.role || '看護師'}
                          </span>
                        </td>
                        <td>
                          <span className="dept-tag">{u.department || '未設定'}</span>
                        </td>
                        <td className="text-xs text-slate-600">{u.ageGroup || '未設定'}</td>
                        <td className="text-xs text-slate-500 font-mono">{u.createdAt || '-'}</td>
                        <td className="text-xs text-slate-400 font-mono">{u.deviceId || '-'}</td>
                        <td>
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              className="px-2.5 py-1 bg-sky-100 hover:bg-sky-200 text-sky-800 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                              onClick={() => handleOpenEditUser(u)}
                            >
                              <Edit className="w-3.5 h-3.5" />
                              <span>編集</span>
                            </button>

                            <button
                              type="button"
                              className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                              onClick={() => setDeletingUser(u)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>削除</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 5. データ管理・日付別削除 & 全データ削除 (二重安全確認) */}
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
                    if (records.length === 0) {
                      alert('ダウンロード・削除対象の提出データが存在しません。');
                      return;
                    }
                    setSelectedCloudDate(todayStr); // 本日の日付をデフォルトで取得
                    setIsCloudDateModalOpen(true);
                  }}
                >
                  <Calendar className="w-4 h-4" />
                  <span>指定日を選択してDL後にクラウド削除...</span>
                </button>
              </div>
            </div>

            {/* ★ 1. 日付指定データの削除 (2段階二重確認) */}
            <div className="data-card warning-card">
              <Calendar className="w-6 h-6 text-amber-600 mb-2" />
              <h4>日付を指定してデータを削除</h4>
              <p>選択した特定の調査対象日の提出データのみをまとめて削除します。</p>

              <div className="form-group my-3 w-full">
                <div className="flex items-center justify-between mb-1">
                  <label className="form-label text-xs">削除対象日を選択</label>
                  <button
                    type="button"
                    onClick={() => setDeleteTargetDate(todayStr)}
                    className="text-[11px] font-bold text-amber-800 hover:text-amber-950 bg-amber-100 hover:bg-amber-200 px-2 py-0.5 rounded border border-amber-300 transition-colors cursor-pointer"
                  >
                    本日 ({todayStr}) に設定
                  </button>
                </div>
                <input
                  type="date"
                  className="form-input text-base font-bold text-center"
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
          <div className="modal-card max-w-lg">
            <div className="setup-header">
              <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-2" />
              <h2>【確認: 1/2】日付指定データの削除とCSVバックアップ確認</h2>
              <p className="setup-sub">
                対象日: <strong>{deleteTargetDate}</strong> のデータ (計 {dateTargetRecordsCount} 件) を削除します。
                <br />
                <strong className="text-slate-800 mt-1 block">削除を行う前に、データのバックアップCSVを出力（ダウンロード）しますか？</strong>
              </p>
            </div>
            <div className="flex flex-col gap-2.5 mt-4">
              <button
                type="button"
                className="py-3 px-4 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                onClick={async () => {
                  const targetRecs = records.filter((r) => r.user.targetDate === deleteTargetDate);
                  if (targetRecs.length > 0) {
                    const saved = await exportRecordsToCSV(targetRecs, `看護タイムスタディ_${deleteTargetDate}_削除前バックアップ.csv`);
                    if (!saved) return;
                  }
                  setDateDeleteStep(2);
                }}
              >
                <Download className="w-4 h-4" />
                <span>CSVバックアップを出力して最終確認へ進む (推奨)</span>
              </button>

              <button
                type="button"
                className="py-3 px-4 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                onClick={() => setDateDeleteStep(2)}
              >
                <AlertTriangle className="w-4 h-4" />
                <span>バックアップなしで最終確認へ進む</span>
              </button>

              <button type="button" className="btn-secondary py-2.5 text-xs font-semibold" onClick={() => setDateDeleteStep(0)}>
                キャンセル (削除を中止)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ★ 日付指定削除: 第2段階最終決定モーダル */}
      {dateDeleteStep === 2 && (
        <div className="modal-overlay">
          <div className="modal-card border-red-500 border-2 max-w-lg">
            <div className="setup-header">
              <Trash2 className="w-10 h-10 text-red-600 mx-auto mb-2 animate-bounce" />
              <h2 className="text-red-600">【最終確定: 2/2】本当に削除してよろしいですか？</h2>
              <p className="setup-sub text-red-700 font-bold">
                {deleteTargetDate} の全 {dateTargetRecordsCount} 件のデータが削除されます。この操作は復元できません！
              </p>
            </div>
            <div className="flex flex-col gap-2.5 mt-4">
              <button
                type="button"
                className="py-3 px-4 bg-sky-700 hover:bg-sky-800 text-white rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                onClick={() => handleFinalDeleteByDate(true)}
              >
                <Download className="w-4 h-4" />
                <span>【CSVバックアップ出力 ＆ 実行】{deleteTargetDate} のデータを削除</span>
              </button>

              <button
                type="button"
                className="py-3 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                onClick={() => handleFinalDeleteByDate(false)}
              >
                <Trash2 className="w-4 h-4" />
                <span>【バックアップ出力なしで実行】{deleteTargetDate} のデータを完全削除</span>
              </button>

              <button type="button" className="btn-secondary py-2.5 text-xs font-semibold" onClick={() => setDateDeleteStep(0)}>
                中止して戻る
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ★ 全データ一括削除: 第1段階確認モーダル */}
      {allDeleteStep === 1 && (
        <div className="modal-overlay">
          <div className="modal-card max-w-lg">
            <div className="setup-header">
              <AlertTriangle className="w-10 h-10 text-red-500 mx-auto mb-2" />
              <h2>【確認: 1/2】すべてのデータの完全消去とCSVバックアップ確認</h2>
              <p className="setup-sub">
                全提出データ (計 {records.length} 件) をリセット・完全削除します。
                <br />
                <strong className="text-slate-800 mt-1 block">削除を行う前に、全データのバックアップCSVを出力（ダウンロード）しますか？</strong>
              </p>
            </div>
            <div className="flex flex-col gap-2.5 mt-4">
              <button
                type="button"
                className="py-3 px-4 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                onClick={async () => {
                  if (records.length > 0) {
                    const saved = await exportRecordsToCSV(records, `全看護師_タイムスタディ一括データ_削除前バックアップ_${todayStr}.csv`);
                    if (!saved) return;
                  }
                  setAllDeleteStep(2);
                }}
              >
                <Download className="w-4 h-4" />
                <span>全件バックアップCSVを出力して最終確認へ進む (推奨)</span>
              </button>

              <button
                type="button"
                className="py-3 px-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                onClick={() => setAllDeleteStep(2)}
              >
                <AlertTriangle className="w-4 h-4" />
                <span>バックアップなしで最終確認へ進む</span>
              </button>

              <button type="button" className="btn-secondary py-2.5 text-xs font-semibold" onClick={() => setAllDeleteStep(0)}>
                キャンセル (削除を中止)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ★ 全データ一括削除: 第2段階最終決定モーダル */}
      {allDeleteStep === 2 && (
        <div className="modal-overlay">
          <div className="modal-card border-red-600 border-2 max-w-lg">
            <div className="setup-header">
              <AlertTriangle className="w-12 h-12 text-red-600 mx-auto mb-2 animate-pulse" />
              <h2 className="text-red-600">【最終危険警告: 2/2】本当にすべてのデータを削除しますか？</h2>
              <p className="setup-sub text-red-800 font-bold">
                全 {records.length} 件のデータが完全消去されます。この操作は復元できません！
              </p>
            </div>
            <div className="flex flex-col gap-2.5 mt-4">
              <button
                type="button"
                className="py-3 px-4 bg-sky-700 hover:bg-sky-800 text-white rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                onClick={() => handleFinalDeleteAll(true)}
              >
                <Download className="w-4 h-4" />
                <span>【全件CSVバックアップ出力 ＆ 実行】全データを削除</span>
              </button>

              <button
                type="button"
                className="py-3 px-4 bg-red-700 hover:bg-red-800 text-white rounded-xl font-extrabold text-xs flex items-center justify-center gap-2 shadow-sm cursor-pointer"
                onClick={() => handleFinalDeleteAll(false)}
              >
                <Trash2 className="w-4 h-4" />
                <span>【バックアップ出力なしで実行】全データを即座に完全消去</span>
              </button>

              <button type="button" className="btn-secondary py-2.5 text-xs font-semibold" onClick={() => setAllDeleteStep(0)}>
                中止して保護する
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

      {/* 📅 クラウドDB用：削除対象日付選択モーダル */}
      {isCloudDateModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card max-w-md p-6 bg-white rounded-2xl shadow-2xl">
            <div className="setup-header text-center mb-4">
              <Calendar className="w-10 h-10 text-indigo-600 mx-auto mb-2 bg-indigo-50 p-2 rounded-xl" />
              <h3 className="text-xl font-black text-slate-900">削除したい調査対象日の選択</h3>
              <p className="setup-sub text-xs text-slate-600 mt-1 font-medium">
                CSVをダウンロード保存した後にクラウドDBから削除する対象日を選択してください。
              </p>
            </div>

            <div className="space-y-4 my-4">
              <div className="form-group">
                <div className="flex items-center justify-between mb-1">
                  <label className="form-label text-xs font-bold text-slate-700">
                    削除対象日
                  </label>
                  <button
                    type="button"
                    onClick={() => setSelectedCloudDate(todayStr)}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded border border-indigo-200 transition-colors cursor-pointer"
                  >
                    本日 ({todayStr}) に設定
                  </button>
                </div>
                <input
                  type="date"
                  className="form-input text-base font-bold text-center"
                  value={selectedCloudDate}
                  onChange={(e) => setSelectedCloudDate(e.target.value)}
                />
              </div>

              {/* データが存在する対象日のクイック選択チップ一覧 */}
              {availableDates.length > 0 && (
                <div>
                  <div className="text-[11px] font-bold text-slate-500 mb-1.5">データが存在する対象日一覧から選択:</div>
                  <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1 bg-slate-50 border border-slate-200 rounded-xl">
                    {availableDates.map((d) => {
                      const count = records.filter((r) => r.user.targetDate === d).length;
                      const isSelected = selectedCloudDate === d;
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setSelectedCloudDate(d)}
                          className={`text-xs font-bold px-2.5 py-1.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:bg-indigo-50 hover:border-indigo-300'
                          }`}
                        >
                          <span>{d}</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${isSelected ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-600'}`}>
                            {count}件
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 選択日付の件数情報表示 */}
              <div className="bg-indigo-50 border border-indigo-200 p-3 rounded-xl text-xs text-center font-bold text-indigo-950">
                選択中: <span className="font-mono text-sm text-indigo-700">{selectedCloudDate}</span>
                <span className="mx-1">➔</span>
                対象件数: <span className="text-sm font-black text-rose-600">{records.filter((r) => r.user.targetDate === selectedCloudDate).length}</span> 件
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-xl text-xs md:text-sm flex items-center justify-center gap-2 shadow-sm transition-all active:scale-98 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={records.filter((r) => r.user.targetDate === selectedCloudDate).length === 0}
                onClick={async () => {
                  const targetRecs = records.filter((r) => r.user.targetDate === selectedCloudDate);
                  if (targetRecs.length === 0) {
                    alert(`対象日 (${selectedCloudDate}) の提出データは存在しません。`);
                    return;
                  }
                  setDeleteTargetDate(selectedCloudDate);
                  setIsCloudDateModalOpen(false);
                  const saved = await exportRecordsToCSV(targetRecs, `看護タイムスタディ_${selectedCloudDate}_データ.csv`);
                  if (saved) {
                    setCloudDeleteMode('date');
                    setCloudDeleteStep(1);
                  }
                }}
              >
                <Download className="w-4 h-4" />
                <span>この日付のCSVを出力して削除確認へ進む</span>
              </button>

              <button
                type="button"
                className="btn-secondary py-2.5 text-xs font-semibold"
                onClick={() => setIsCloudDateModalOpen(false)}
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ✏️ ユーザー編集モーダル */}
      {editingUser && (
        <div className="modal-overlay">
          <div className="modal-card max-w-md p-5 bg-white rounded-xl shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Edit className="w-5 h-5 text-sky-600" />
                登録ユーザー情報の編集・更新
              </h3>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="space-y-4 my-3">
              <div className="bg-sky-50 border border-sky-200 p-2.5 rounded-lg text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-600 font-bold">対象職員ID (変更不可)</span>
                  <strong className="font-mono text-sm text-sky-800 font-bold">{editingUser.staffId}</strong>
                </div>
                {editingUser.createdAt && (
                  <div className="flex items-center justify-between pt-1 border-t border-sky-200/60 text-slate-500">
                    <span>初回登録日時</span>
                    <span className="font-mono font-semibold">{editingUser.createdAt}</span>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label text-xs font-bold">氏名</label>
                <input
                  type="text"
                  className="form-input text-sm"
                  value={editUserName}
                  onChange={(e) => setEditUserName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label text-xs font-bold">職種</label>
                <select
                  className="form-select text-sm font-bold"
                  value={editUserRole}
                  onChange={(e) => setEditUserRole(e.target.value as JobRole)}
                >
                  <option value="看護師">看護師</option>
                  <option value="看護補助者">看護補助者</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label text-xs font-bold">所属部署</label>
                <select
                  className="form-select text-sm"
                  value={editUserDept}
                  onChange={(e) => setEditUserDept(e.target.value as Department)}
                >
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label text-xs font-bold">年齢階層</label>
                <select
                  className="form-select text-sm"
                  value={editUserAge}
                  onChange={(e) => setEditUserAge(e.target.value as AgeGroup)}
                >
                  {AGE_GROUPS.map((age) => (
                    <option key={age} value={age}>
                      {age}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                  onClick={() => setEditingUser(null)}
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-lg flex items-center gap-1 shadow-sm cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  変更内容を保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🗑️ ユーザー削除確認モーダル */}
      {deletingUser && (
        <div className="modal-overlay">
          <div className="modal-card border-rose-500 border-2 max-w-md p-5 bg-white rounded-xl shadow-2xl">
            <div className="setup-header text-center">
              <AlertTriangle className="w-10 h-10 text-rose-600 mx-auto mb-2 animate-bounce" />
              <h2 className="text-rose-600 text-lg font-bold">ユーザープロファイルの完全削除</h2>
              <p className="setup-sub text-slate-700 text-xs mt-2">
                職員ID: <strong className="font-mono text-rose-800 text-sm">{deletingUser.staffId}</strong> (氏名: <strong>{deletingUser.name}</strong> さん) のユーザー登録情報をクラウドDBおよびシステムから完全に削除します。この操作は復元できません。
              </p>
            </div>
            <div className="modal-buttons-flex mt-4 flex items-center justify-end gap-2">
              <button className="btn-secondary" onClick={() => setDeletingUser(null)}>
                キャンセル
              </button>
              <button className="btn-danger font-bold bg-rose-600 hover:bg-rose-700" onClick={handleConfirmDeleteUser}>
                【実行】このユーザー登録を完全削除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
