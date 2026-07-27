import { useState, useEffect } from 'react';
import { UserProfile, TimeSlot, TimeStudyRecord, TaskItem } from './types';
import { generateDefaultTimeSlots, PRESET_TASKS } from './constants';
import {
  getUserProfile,
  saveUserProfile,
  logoutUserProfile,
  getDraftSlots,
  saveDraftSlots,
  clearDraftSlots,
  getAllSubmittedRecords,
  fetchSubmittedRecordsFromVercel,
  saveSubmittedRecord,
  getCustomTasks,
  saveCustomTasks,
} from './utils/storage';
import { generateMockRecords } from './utils/mockData';
import { Header } from './components/Header';
import { UserSetupModal } from './components/UserSetupModal';
import { Timeline } from './components/Timeline';
import { TaskSelectModal } from './components/TaskSelectModal';
import { AdminModal } from './components/AdminModal';
import { AdminPanel } from './components/AdminPanel';
import { TaskMasterEditModal } from './components/TaskMasterEditModal';
import confetti from 'canvas-confetti';

export function App() {
  const [activeTab, setActiveTab] = useState<'input' | 'admin'>('input');

  // 調査対象日 (初期値: 本日の日付)
  const todayStr = new Date().toISOString().split('T')[0];
  const [targetDate, setTargetDate] = useState<string>(todayStr);

  // 勤務シフト (日勤 8:30-17:15 / 夜勤 16:30-翌9:30 / その他)
  const [shiftType, setShiftType] = useState<ShiftType>('day');
  const [customStartTime, setCustomStartTime] = useState<string>('09:00');
  const [customEndTime, setCustomEndTime] = useState<string>('18:00');

  // ユーザー属性
  const [user, setUser] = useState<UserProfile | null>(null);
  const [showUserSetupModal, setShowUserSetupModal] = useState<boolean>(false);

  // 定型業務マスター ＆ 編集モーダルステート
  const [tasks, setTasks] = useState<TaskItem[]>(() => {
    const saved = getCustomTasks();
    return saved && saved.length > 0 ? saved : PRESET_TASKS;
  });
  const [showTaskMasterModal, setShowTaskMasterModal] = useState<boolean>(false);

  // タイムスタディスロット
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [activeSlot, setActiveSlot] = useState<TimeSlot | null>(null);
  const [isDraftSaved, setIsDraftSaved] = useState<boolean>(false);

  // 本日の提出完了状態
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);

  // 全提出レコード (集計用)
  const [allRecords, setAllRecords] = useState<TimeStudyRecord[]>([]);

  // 管理者認証状態 (パスワード: okasaikango)
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);
  const [showAdminAuthModal, setShowAdminAuthModal] = useState<boolean>(false);

  // 初期化処理
  useEffect(() => {
    // ユーザー情報の読み込み
    const savedUser = getUserProfile();
    if (savedUser) {
      setUser(savedUser);
    } else {
      setShowUserSetupModal(true);
    }

    // ドラフトスロットの読み込み
    const savedSlots = getDraftSlots();
    if (savedSlots && savedSlots.length > 0) {
      setSlots(savedSlots);
    } else {
      setSlots(generateDefaultTimeSlots('day'));
    }

    // 既存提出レコードの初期化 ＆ Vercelクラウド同期
    const existing = getAllSubmittedRecords();
    setAllRecords(existing);

    // Vercel クラウドAPIからの非同期フェッチ（他ユーザーの提出分を自動同期）
    fetchSubmittedRecordsFromVercel().then((cloudRecords) => {
      if (cloudRecords && cloudRecords.length > 0) {
        setAllRecords(cloudRecords);
      }
    });
  }, []);

  // ユーザー設定・シフト・調査日確定保存 ➔ タイムスタディ入力画面へ確実に遷移
  const handleSaveUser = (
    updatedUser: UserProfile,
    selectedTargetDate: string,
    selectedShiftType: ShiftType,
    customStart?: string,
    customEnd?: string
  ) => {
    setUser(updatedUser);
    setTargetDate(selectedTargetDate);
    setShiftType(selectedShiftType);
    if (customStart) setCustomStartTime(customStart);
    if (customEnd) setCustomEndTime(customEnd);

    saveUserProfile(updatedUser);

    // 選択されたシフト (日勤 / 夜勤 / その他カスタム) の時間枠スロットを自動生成
    const newSlots = generateDefaultTimeSlots(selectedShiftType, customStart, customEnd);
    setSlots(newSlots);
    saveDraftSlots(newSlots);

    // モーダルを閉じ、タイムスタディ入力タブへ確実に画面遷移
    setShowUserSetupModal(false);
    setIsAdminAuthenticated(false);
    setActiveTab('input');
  };

  // ユーザー登録情報・一時保存データの削除
  const handleDeleteUserProfile = () => {
    logoutUserProfile();
    setUser(null);
    setSlots(generateDefaultTimeSlots());
    setIsDraftSaved(false);
    setShowUserSetupModal(true);
    alert('登録情報および一時保存データを削除しました。');
  };

  // ユーザー切替 / ログアウト処理
  const handleLogoutUser = () => {
    logoutUserProfile();
    setUser(null);
    setSlots(generateDefaultTimeSlots());
    setIsDraftSaved(false);
    setShowUserSetupModal(true);
  };

  // 管理画面ナビゲーション
  const handleOpenAdminTab = () => {
    if (isAdminAuthenticated) {
      setActiveTab('admin');
      setShowUserSetupModal(false);
    } else {
      setShowAdminAuthModal(true);
    }
  };

  // パスワード認証成功時 (okasaikango)
  const handleAdminAuthSuccess = () => {
    setIsAdminAuthenticated(true);
    setShowAdminAuthModal(false);
    setShowUserSetupModal(false);
    setActiveTab('admin');
  };

  // 定型業務マスタの追加
  const handleAddTask = (newTask: TaskItem) => {
    setTasks((prev) => {
      const updated = [...prev, newTask];
      saveCustomTasks(updated);
      return updated;
    });
  };

  // 定型業務マスタの削除
  const handleDeleteTask = (taskId: string) => {
    setTasks((prev) => {
      const updated = prev.filter((t) => t.id !== taskId);
      saveCustomTasks(updated);
      return updated;
    });
  };

  // 全提出データの一括削除 (2段階確認完了後)
  const handleClearAllRecords = () => {
    setAllRecords([]);
    localStorage.removeItem('nurse_timestudy_all_submitted_records');
    alert('すべての提出データを完全に削除しました。');
  };

  // 指定された日付のデータの削除 (2段階確認完了後)
  const handleDeleteRecordsByDate = (targetDateStr: string) => {
    const updated = allRecords.filter((r) => r.user.targetDate !== targetDateStr);
    setAllRecords(updated);
    localStorage.setItem('nurse_timestudy_all_submitted_records', JSON.stringify(updated));
    alert(`${targetDateStr} の提出データを全件削除しました。`);
  };

  // コマの業務保存 (TaskSelectModal から呼ばれる)
  const handleSaveSlotTasks = (slotId: string, taskIds: string[]) => {
    const updated = slots.map((s) =>
      s.id === slotId ? { ...s, selectedTaskIds: taskIds } : s
    );
    setSlots(updated);
    saveDraftSlots(updated);
    setIsDraftSaved(true);
    setActiveSlot(null);
  };

  // 時間帯（スロット）の削除処理
  const handleDeleteSlot = (slotId: string) => {
    const updated = slots.filter((s) => s.id !== slotId);
    setSlots(updated);
    saveDraftSlots(updated);
    setIsDraftSaved(true);
  };

  // 15分枠入力画面から時間枠・シフトをダイレクト変更・拡張・短縮
  const handleChangeShiftAndSlots = (
    newShiftType: ShiftType,
    newStart?: string,
    newEnd?: string
  ) => {
    setShiftType(newShiftType);
    if (newStart) setCustomStartTime(newStart);
    if (newEnd) setCustomEndTime(newEnd);

    // 新しいシフト・時間枠でスロット枠を自動再生成
    const baseSlots = generateDefaultTimeSlots(newShiftType, newStart, newEnd);

    // 既存スロットの入力済み業務データを新しいスロットへ安全に引き継ぎマージ
    const existingSlotMap = new Map(slots.map((s) => [s.startTime, s.selectedTaskIds]));
    const mergedSlots = baseSlots.map((slot) => {
      const savedTasks = existingSlotMap.get(slot.startTime);
      if (savedTasks && savedTasks.length > 0) {
        return { ...slot, selectedTaskIds: savedTasks };
      }
      return slot;
    });

    setSlots(mergedSlots);
    saveDraftSlots(mergedSlots);
  };

  // ドラフト保存
  const handleSaveDraft = () => {
    saveDraftSlots(slots);
    setIsDraftSaved(true);
    alert('現在の入力状態を一時保存しました。');
  };

  // 早出スロット（8:30以前）の追加
  const handleAddEarlySlot = () => {
    const firstSlot = slots[0];
    const [h, m] = firstSlot.startTime.split(':').map(Number);
    let totalM = h * 60 + m - 15;
    if (totalM < 0) totalM += 1440;

    const startH = String(Math.floor(totalM / 60)).padStart(2, '0');
    const startM = String(totalM % 60).padStart(2, '0');
    const newTimeStr = `${startH}:${startM}`;

    const newSlot: TimeSlot = {
      id: `early-${newTimeStr}`,
      startTime: newTimeStr,
      endTime: firstSlot.startTime,
      isOvertime: true,
      overtimeType: 'early',
      selectedTaskIds: [],
    };

    const updated = [newSlot, ...slots];
    setSlots(updated);
    saveDraftSlots(updated);
  };

  // 残業スロット（17:15以降）の追加
  const handleAddLateSlot = () => {
    const lastSlot = slots[slots.length - 1];
    const [h, m] = lastSlot.endTime.split(':').map(Number);
    const totalM = h * 60 + m + 15;

    const endH = String(Math.floor(totalM / 60)).padStart(2, '0');
    const endM = String(totalM % 60).padStart(2, '0');
    const newEndTimeStr = `${endH}:${endM}`;

    const newSlot: TimeSlot = {
      id: `late-${lastSlot.endTime}`,
      startTime: lastSlot.endTime,
      endTime: newEndTimeStr,
      isOvertime: true,
      overtimeType: 'late',
      selectedTaskIds: [],
    };

    const updated = [...slots, newSlot];
    setSlots(updated);
    saveDraftSlots(updated);
  };

  // タイムスタディ提出処理
  const handleSubmitTimeStudy = () => {
    if (!user) {
      setShowUserSetupModal(true);
      return;
    }

    const unassignedCount = slots.filter((s) => s.selectedTaskIds.length === 0).length;

    if (unassignedCount > 0) {
      const confirmSubmit = window.confirm(
        `未入力のコマが ${unassignedCount} 件あります。このまま調査を完了して提出しますか？`
      );
      if (!confirmSubmit) return;
    }

    const newRecord: TimeStudyRecord = {
      id: `SUB-${Date.now().toString().slice(-6)}`,
      user: {
        ...user,
        targetDate,
      },
      submittedAt: new Date().toLocaleString('ja-JP'),
      slots,
    };

    saveSubmittedRecord(newRecord);
    setAllRecords((prev) => [newRecord, ...prev]);
    clearDraftSlots();
    setIsSubmitted(true);

    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
    });

    alert('タイムスタディの提出が完了しました！ご協力ありがとうございました。');
  };

  // 所属長への連絡確認「はい」選択時の提出ロック解除
  const handleUnlockSubmit = () => {
    setIsSubmitted(false);
  };

  // モックデータ再生成
  const handleGenerateMockData = () => {
    const mock600 = generateMockRecords(600);
    setAllRecords(mock600);
    alert('複数年（2024, 2025, 2026年）含む600人規模のサンプル集計データを生成・更新しました！');
  };

  // 画面モード・職種に応じたテーマカラー判定
  // 管理画面: theme-admin (ピンクベース) / 看護補助者: theme-aid (オレンジベース) / 看護師: theme-nurse (緑ベース)
  const themeClass =
    activeTab === 'admin'
      ? 'theme-admin'
      : user?.role === '看護補助者'
      ? 'theme-aid'
      : 'theme-nurse';

  // 🟢 管理者認証中モードの場合：管理者画面のみを全画面表示（スタディ画面や一般ヘッダーは一切不要）
  if (activeTab === 'admin' && isAdminAuthenticated) {
    return (
      <div className="app-layout theme-admin min-h-screen bg-rose-50/50">
        <main className="p-4 md:p-6 max-w-7xl mx-auto">
          <AdminPanel
            records={allRecords}
            tasks={tasks}
            onAddTask={handleAddTask}
            onDeleteTask={handleDeleteTask}
            onClearAllRecords={handleClearAllRecords}
            onDeleteRecordsByDate={handleDeleteRecordsByDate}
            onLogout={() => {
              setIsAdminAuthenticated(false);
              setActiveTab('input');
              setShowUserSetupModal(true);
            }}
            onGenerateMockData={handleGenerateMockData}
            onOpenEditMaster={() => setShowTaskMasterModal(true)}
          />
        </main>
      </div>
    );
  }

  return (
    <div className={`app-layout ${themeClass}`}>
      {/* 共通ヘッダー */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={user}
        targetDate={targetDate}
        onChangeTargetDate={setTargetDate}
        shiftType={shiftType}
        onEditUser={() => setShowUserSetupModal(true)}
        onLogoutUser={handleLogoutUser}
        onOpenAdmin={handleOpenAdminTab}
        isAdminAuthenticated={isAdminAuthenticated}
      />

      {/* メインコンテンツ領域 */}
      <main className="main-content">
        {activeTab === 'input' && (
          <Timeline
            slots={slots}
            shiftType={shiftType}
            customStartTime={customStartTime}
            customEndTime={customEndTime}
            onChangeShiftAndSlots={handleChangeShiftAndSlots}
            onSlotClick={(slot) => setActiveSlot(slot)}
            onAddEarlySlot={handleAddEarlySlot}
            onAddLateSlot={handleAddLateSlot}
            onDeleteSlot={handleDeleteSlot}
            onSaveDraft={handleSaveDraft}
            onSubmit={handleSubmitTimeStudy}
            isDraftSaved={isDraftSaved}
            isSubmitted={isSubmitted}
            onUnlockSubmit={handleUnlockSubmit}
          />
        )}
      </main>

      {/* 属性設定・ログインモーダル */}
      {showUserSetupModal && (
        <UserSetupModal
          initialUser={user}
          initialTargetDate={targetDate}
          initialShiftType={shiftType}
          initialCustomStart={customStartTime}
          initialCustomEnd={customEndTime}
          onSave={handleSaveUser}
          onOpenAdmin={handleAdminAuthSuccess}
          onDeleteProfile={handleDeleteUserProfile}
          isInitialSetup={!user}
        />
      )}

      {/* 上部固定ヘッダー付き業務入力フロー画面 */}
      {activeSlot && (
        <TaskSelectModal
          slot={activeSlot}
          tasks={tasks}
          userRole={user?.role || '看護師'}
          onSave={handleSaveSlotTasks}
          onClose={() => setActiveSlot(null)}
        />
      )}

      {/* 定型業務マスターの変更・編集モーダル */}
      {showTaskMasterModal && (
        <TaskMasterEditModal
          currentTasks={tasks}
          onSaveTasks={(updatedTasks) => {
            setTasks(updatedTasks);
            saveCustomTasks(updatedTasks);
          }}
          onClose={() => setShowTaskMasterModal(false)}
        />
      )}

      {/* 管理者パスワード認証モーダル (okasaikango) */}
      {showAdminAuthModal && (
        <AdminModal
          onSuccess={handleAdminAuthSuccess}
          onClose={() => setShowAdminAuthModal(false)}
        />
      )}
    </div>
  );
}
