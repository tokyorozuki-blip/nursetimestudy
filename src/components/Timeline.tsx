import React, { useState } from 'react';
import { TimeSlot, ShiftType, UserProfile } from '../types';
import { PRESET_TASKS } from '../constants';
import {
  Clock,
  PlusCircle,
  Save,
  Send,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Folder,
  FolderOpen,
  Sparkles,
  Trash2,
  Settings2,
  Calendar,
  X,
  Check,
  RotateCcw,
} from 'lucide-react';

export interface HourGroup {
  hourKey: string;
  hourLabel: string;
  slots: TimeSlot[];
  filledCount: number;
  totalCount: number;
  uniqueTaskIds: string[];
}

function groupSlotsByHour(slots: TimeSlot[]): HourGroup[] {
  const map = new Map<string, TimeSlot[]>();

  slots.forEach((s) => {
    const hour = s.startTime.split(':')[0] || '00';
    const isNext = s.id.includes('-next');
    const key = `${hour}${isNext ? '-next' : ''}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(s);
  });

  const groups: HourGroup[] = [];
  map.forEach((hourSlots, key) => {
    const first = hourSlots[0];
    const last = hourSlots[hourSlots.length - 1];

    const startH = first.startTime.split(':')[0];
    const isNext = key.includes('-next');
    const label = `${isNext ? '翌日 ' : ''}${startH}:00 〜 ${last.endTime}`;

    const filledCount = hourSlots.filter((s) => s.selectedTaskIds.length > 0).length;
    const taskSet = new Set<string>();
    hourSlots.forEach((s) => s.selectedTaskIds.forEach((id) => taskSet.add(id)));

    groups.push({
      hourKey: key,
      hourLabel: label,
      slots: hourSlots,
      filledCount,
      totalCount: hourSlots.length,
      uniqueTaskIds: Array.from(taskSet),
    });
  });

  return groups;
}

interface TimelineProps {
  slots: TimeSlot[];
  shiftType?: ShiftType;
  customStartTime?: string;
  customEndTime?: string;
  onChangeShiftAndSlots?: (
    shiftType: ShiftType,
    customStart?: string,
    customEnd?: string
  ) => void;
  onSlotClick: (slot: TimeSlot) => void;
  onBatchSlotClick?: (batchInfo: {
    title: string;
    slotIds: string[];
    initialTaskIds: string[];
  }) => void;
  onAddEarlySlot: () => void;
  onAddLateSlot: () => void;
  onDeleteSlot?: (slotId: string) => void;
  onSaveDraft: () => void;
  onResetAllSlots?: () => void;
  onSubmit: () => void;
  isDraftSaved: boolean;
  isSubmitted?: boolean;
  onUnlockSubmit?: () => void;
  user?: UserProfile | null;
}

export const Timeline: React.FC<TimelineProps> = ({
  slots,
  shiftType = 'day',
  customStartTime = '09:00',
  customEndTime = '18:00',
  onChangeShiftAndSlots,
  onSlotClick,
  onBatchSlotClick,
  onAddEarlySlot,
  onAddLateSlot,
  onDeleteSlot,
  onSaveDraft,
  onResetAllSlots,
  onSubmit,
  isDraftSaved,
  isSubmitted = false,
  onUnlockSubmit,
  user,
}) => {
  const taskMap = new Map(PRESET_TASKS.map((t) => [t.id, t]));

  // 1時間単位のグループ折りたたみ／展開ステート
  // expandedHourKeys[hourKey] = true の場合、該当1時間グループの5分スロットを詳細表示
  const [expandedHourKeys, setExpandedHourKeys] = useState<Record<string, boolean>>({});

  const hourGroups = groupSlotsByHour(slots);

  const toggleHourExpand = (hourKey: string) => {
    setExpandedHourKeys((prev) => ({
      ...prev,
      [hourKey]: !prev[hourKey],
    }));
  };

  const expandAllHours = () => {
    const next: Record<string, boolean> = {};
    hourGroups.forEach((g) => {
      next[g.hourKey] = true;
    });
    setExpandedHourKeys(next);
  };

  const collapseAllHours = () => {
    setExpandedHourKeys({});
  };

  // 時間枠調整パネルの開閉ステート
  const [showShiftConfig, setShowShiftConfig] = useState<boolean>(false);
  const [tempShiftType, setTempShiftType] = useState<ShiftType>(shiftType);
  const [tempStart, setTempStart] = useState<string>(customStartTime);
  const [tempEnd, setTempEnd] = useState<string>(customEndTime);

  // 所属長連絡確認ダイアログの開閉ステート
  const [showUnlockConfirmModal, setShowUnlockConfirmModal] = useState<boolean>(false);

  // 入力内容リセット確認 ＆ 職員ID認証モーダルステート
  const [showResetConfirmModal, setShowResetConfirmModal] = useState<boolean>(false);
  const [resetConfirmStaffId, setResetConfirmStaffId] = useState<string>('');
  const [resetErrorMsg, setResetErrorMsg] = useState<string>('');

  // 時間枠変更の反映
  const handleApplyShiftChange = () => {
    if (onChangeShiftAndSlots) {
      onChangeShiftAndSlots(tempShiftType, tempStart, tempEnd);
    }
    setShowShiftConfig(false);
  };

  // 修正確認ダイアログの「はい」を押した時
  const handleConfirmUnlock = () => {
    setShowUnlockConfirmModal(false);
    if (onUnlockSubmit) {
      onUnlockSubmit();
    }
  };

  // 未入力コマ数と進捗度の計算
  const totalSlots = slots.length;
  const filledSlots = slots.filter((s) => s.selectedTaskIds.length > 0).length;
  const unassignedCount = totalSlots - filledSlots;
  const progressPercent = totalSlots > 0 ? Math.round((filledSlots / totalSlots) * 100) : 0;

  return (
    <div className="timeline-container">
      {/* 1. 進捗プログレス ＆ ステータスカード */}
      <div className={`status-banner ${isSubmitted ? 'border-2 border-emerald-500 bg-emerald-50/50' : ''}`}>
        <div className="status-info">
          <div className="status-title-row">
            <h2 className="status-heading">
              <Clock className="w-5 h-5 text-sky-600 inline-icon" />
              5分枠 タイムスタディ入力
            </h2>
            {isSubmitted ? (
              <span className="bg-emerald-600 text-white font-extrabold px-3 py-1 rounded-full text-xs flex items-center gap-1.5 shadow-sm">
                <CheckCircle2 className="w-4 h-4" />
                提出完了済み
              </span>
            ) : unassignedCount > 0 ? (
              <span className="badge-unfilled">
                <AlertTriangle className="w-3.5 h-3.5" />
                未入力 {unassignedCount} コマ
              </span>
            ) : (
              <span className="badge-completed">
                <CheckCircle2 className="w-3.5 h-3.5" />
                全コマ入力完了！
              </span>
            )}
          </div>
          <p className="status-subtext">
            {isSubmitted
              ? '調査データの提出が完了しています。修正する場合は「修正をする」ボタンを押してください。'
              : '各5分のコマをタップして、定型業務を選択してください（1コマ最大3つ）。'}
          </p>
        </div>

        {/* プログレスバー */}
        <div className="progress-wrapper">
          <div className="progress-bar-bg">
            <div
              className={`progress-bar-fill ${progressPercent === 100 ? 'complete' : ''}`}
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
          <div className="progress-labels">
            <span>入力率: {progressPercent}%</span>
            <span>({filledSlots} / {totalSlots} コマ)</span>
          </div>
        </div>
      </div>

      {/* 2. アクションツールバー (時間枠調整 / 一時保存 / 送信 or 修正) */}
      <div className="action-toolbar">
        {!isSubmitted ? (
          <>
            {/* ⏱️ 時間枠ダイレクト変更ボタン */}
            <button
              className={`btn-toolbar bg-sky-50 text-sky-800 border-2 border-sky-200 hover:bg-sky-100 ${showShiftConfig ? 'ring-2 ring-sky-500' : ''}`}
              onClick={() => setShowShiftConfig(!showShiftConfig)}
              title="勤務時間帯・シフトを画面上で変更します"
            >
              <Settings2 className="w-4 h-4 text-sky-600" />
              <span>時間枠・シフトを変更</span>
            </button>

            <button
              className={`btn-toolbar btn-save ${isDraftSaved ? 'saved' : ''}`}
              onClick={onSaveDraft}
              title="この端末のブラウザ内に一時保存します（他端末へは引き継げません）"
            >
              <Save className="w-4 h-4" />
              <span>{isDraftSaved ? '一時保存済み' : '一時保存する'}</span>
            </button>

            {onResetAllSlots && (
              <button
                type="button"
                className="btn-toolbar bg-rose-50 text-rose-800 border-2 border-rose-200 hover:bg-rose-100 font-bold transition-all cursor-pointer"
                onClick={() => {
                  setResetConfirmStaffId('');
                  setResetErrorMsg('');
                  setShowResetConfirmModal(true);
                }}
                title="入力中のデータ（下書き含む）をすべて消去・初期化します"
              >
                <RotateCcw className="w-4 h-4 text-rose-600" />
                <span>入力リセット</span>
              </button>
            )}

            <button
              className="btn-toolbar btn-submit"
              onClick={onSubmit}
              title="調査結果を送信完了します"
            >
              <Send className="w-4 h-4" />
              <span>調査完了・提出</span>
            </button>
          </>
        ) : (
          /* 提出完了済みの場合: 修正をするボタンを表示 */
          <div className="w-full flex items-center justify-between gap-3 bg-emerald-100/70 border-2 border-emerald-300 p-3 rounded-2xl">
            <div className="flex items-center gap-2 text-emerald-950 font-bold text-xs sm:text-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>提出完了済みです（データは安全に送信・保存されています）</span>
            </div>
            <button
              type="button"
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-extrabold text-xs flex items-center gap-1.5 shadow-sm shrink-0 cursor-pointer"
              onClick={() => setShowUnlockConfirmModal(true)}
            >
              <Trash2 className="w-4 h-4 hidden" />
              <span>✏️ 修正をする</span>
            </button>
          </div>
        )}
      </div>

      {/* ⚠️ 所属長連絡確認ダイアログ */}
      {showUnlockConfirmModal && (
        <div className="modal-overlay">
          <div className="modal-card max-w-md p-6 text-center space-y-4 animate-scaleUp border-2 border-amber-400">
            <div className="w-14 h-14 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto text-amber-600 shadow-sm">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-extrabold text-slate-900">提出データの修正確認</h3>
              <p className="text-sm font-bold text-amber-900 bg-amber-50 p-3 rounded-xl border border-amber-200 leading-relaxed">
                修正をする場合は所属長へ必ず連絡をしてください
              </p>
              <p className="text-xs text-slate-500">
                ロックを解除してデータの再入力・修正を行ってもよろしいですか？
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              {/* 「いいえ」ボタン (戻る) */}
              <button
                type="button"
                className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-all"
                onClick={() => setShowUnlockConfirmModal(false)}
              >
                いいえ
              </button>

              {/* 「はい」ボタン (修正可能化) */}
              <button
                type="button"
                className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-extrabold rounded-xl text-sm shadow-md transition-all cursor-pointer"
                onClick={handleConfirmUnlock}
              >
                はい
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ⚠️ 入力内容リセット（初期化）確認 ＆ 職員ID認証モーダル */}
      {showResetConfirmModal && (
        <div className="modal-overlay">
          <div className="modal-card max-w-md p-6 bg-white rounded-2xl shadow-2xl border-2 border-rose-200">
            <div className="setup-header text-center mb-4">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-2 shadow-xs">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-black text-rose-950">入力内容のリセット確認</h3>
              <p className="setup-sub text-xs text-rose-800 mt-1.5 font-bold bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                ※ 現在入力中のタイムスタディデータ（下書きを含む）をすべて消去し初期状態に戻します。
                <br />
                この操作は取り消せません！
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                const expectedId = user?.staffId || '';
                if (expectedId && resetConfirmStaffId.trim() !== expectedId) {
                  setResetErrorMsg('職員IDが一致しません。正確な6桁の職員IDを入力してください。');
                  return;
                }
                setResetErrorMsg('');
                setShowResetConfirmModal(false);
                setResetConfirmStaffId('');
                if (onResetAllSlots) onResetAllSlots();
              }}
              className="space-y-4 my-3"
            >
              <div className="form-group">
                <label className="form-label text-xs font-extrabold text-slate-800 block mb-1">
                  確認のため、ご自身の職員ID（6桁）を入力してください
                </label>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={6}
                    className="form-input text-center text-lg font-mono font-bold tracking-widest border-2 focus:border-rose-500"
                    placeholder="6桁の職員ID"
                    value={resetConfirmStaffId}
                    onChange={(e) => {
                      setResetConfirmStaffId(e.target.value.replace(/\D/g, ''));
                      setResetErrorMsg('');
                    }}
                    autoFocus
                    required
                  />
                </div>
                {resetErrorMsg && (
                  <div className="text-xs text-rose-600 font-bold mt-1.5 text-center bg-rose-50 p-1.5 rounded-lg border border-rose-200">
                    {resetErrorMsg}
                  </div>
                )}
                {user?.staffId && (
                  <div className="text-[11px] text-slate-400 text-center mt-1">
                    ログイン中の職員ID: <span className="font-mono font-bold">{user.staffId}</span>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <button
                  type="submit"
                  disabled={!!(user?.staffId && resetConfirmStaffId.trim() !== user.staffId)}
                  className="w-full py-3 px-4 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-extrabold rounded-xl text-xs md:text-sm flex items-center justify-center gap-2 shadow-sm transition-all active:scale-98 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>【実行】入力内容をすべてリセットする</span>
                </button>

                <button
                  type="button"
                  className="btn-secondary py-2.5 text-xs font-semibold"
                  onClick={() => {
                    setShowResetConfirmModal(false);
                    setResetConfirmStaffId('');
                    setResetErrorMsg('');
                  }}
                >
                  キャンセル
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ⏱️ 画面上で時間枠・シフトを自由に調整できるポップオーバーカード */}
      {showShiftConfig && (
        <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-xl mb-4 border-2 border-sky-400 animate-fadeIn space-y-3">
          <div className="border-b border-slate-700 pb-2">
            <div className="flex items-center gap-2 font-bold text-sm text-sky-300">
              <Clock className="w-4 h-4" />
              <span>勤務時間枠・シフトの変更</span>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">勤務シフトを選択</label>
              <select
                className="w-full bg-slate-800 border border-slate-700 text-white font-bold rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                value={tempShiftType}
                onChange={(e) => setTempShiftType(e.target.value as ShiftType)}
              >
                <option value="day">☀️ 日勤 (08:30 ～ 17:15)</option>
                <option value="night">🌙 夜勤 (16:30 ～ 翌09:30)</option>
                <option value="custom">⏱️ その他 (開始時間・終了時間を直接指定)</option>
              </select>
            </div>

            {tempShiftType === 'custom' && (
              <div className="grid grid-cols-2 gap-3 bg-slate-800/80 p-2.5 rounded-xl border border-slate-700">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">開始時間</label>
                  <input
                    type="time"
                    className="w-full bg-slate-900 border border-slate-700 text-white font-mono font-bold text-center rounded-lg py-1.5 text-sm"
                    value={tempStart}
                    onChange={(e) => setTempStart(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">終了時間</label>
                  <input
                    type="time"
                    className="w-full bg-slate-900 border border-slate-700 text-white font-mono font-bold text-center rounded-lg py-1.5 text-sm"
                    value={tempEnd}
                    onChange={(e) => setTempEnd(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
                onClick={() => setShowShiftConfig(false)}
              >
                キャンセル
              </button>
              <button
                type="button"
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 shadow-sm cursor-pointer"
                onClick={handleApplyShiftChange}
              >
                <Check className="w-4 h-4" />
                <span>この時間枠を適用する</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3.1 1時間一括グループ化／5分詳細一括展開コントロールバー */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button
          type="button"
          className="py-2.5 px-3 bg-sky-50 hover:bg-sky-100 border-2 border-sky-300 text-sky-950 font-black rounded-2xl text-xs md:text-sm flex items-center justify-center gap-2 shadow-xs transition-all active:scale-98 cursor-pointer"
          onClick={collapseAllHours}
          title="全時間帯を1時間単位にたたんでスッキリ表示します"
        >
          <Folder className="w-4 h-4 text-sky-600 shrink-0" />
          <span>📁 1時間ごとにまとめる</span>
        </button>

        <button
          type="button"
          className="py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 border-2 border-emerald-300 text-emerald-950 font-black rounded-2xl text-xs md:text-sm flex items-center justify-center gap-2 shadow-xs transition-all active:scale-98 cursor-pointer"
          onClick={expandAllHours}
          title="全時間帯の5分ごとの詳細コマを展開します"
        >
          <FolderOpen className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>📄 5分詳細を全展開</span>
        </button>
      </div>

      {/* 3.2 早出追加ボタン (8:30以前) */}
      <div className="overtime-add-wrapper mb-4">
        <button className="btn-add-overtime" onClick={onAddEarlySlot}>
          <PlusCircle className="w-4 h-4 text-sky-600" />
          <span>＋ 早出の時間外枠を追加 (5分前に拡張)</span>
        </button>
      </div>

      {/* 4. 1時間グループ化 タイムスロットリスト */}
      <div className="space-y-4">
        {hourGroups.map((group) => {
          const isExpanded = !!expandedHourKeys[group.hourKey];
          const isGroupCompleted = group.filledCount === group.totalCount;
          const groupTasks = group.uniqueTaskIds
            .map((id) => taskMap.get(id))
            .filter((t): t is typeof PRESET_TASKS[0] => t !== undefined);

          return (
            <div
              key={group.hourKey}
              className={`rounded-2xl border-2 transition-all duration-200 overflow-hidden shadow-sm ${
                isGroupCompleted
                  ? 'border-emerald-300 bg-emerald-50/40'
                  : group.filledCount > 0
                  ? 'border-sky-300 bg-sky-50/40'
                  : 'border-slate-300 bg-white'
              }`}
            >
              {/* 1時間グループヘッダー */}
              <div
                className="p-3.5 md:p-4 flex items-center justify-between gap-3 cursor-pointer select-none bg-slate-900 text-white rounded-t-2xl border-b border-slate-800"
                onClick={() => toggleHourExpand(group.hourKey)}
              >
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-2 text-base md:text-lg font-black text-sky-300">
                    <Clock className="w-5 h-5 text-sky-400 shrink-0" />
                    <span>{group.hourLabel}</span>
                  </div>

                  {/* ➕ 展開 / ➖ まとめる ボタン（統一ボタンUI） */}
                  <button
                    type="button"
                    className={`px-3 py-1.5 rounded-xl font-black text-xs md:text-sm flex items-center gap-1.5 shadow-sm transition-all active:scale-95 cursor-pointer ${
                      isExpanded
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600'
                        : 'bg-sky-600 hover:bg-sky-500 text-white border border-sky-400'
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleHourExpand(group.hourKey);
                    }}
                    title={isExpanded ? 'グループ化して折りたたむ' : '5分ごとの詳細を表示'}
                  >
                    {isExpanded ? (
                      <>
                        <span className="text-base font-black leading-none">−</span>
                        <span>まとめる</span>
                      </>
                    ) : (
                      <>
                        <span className="text-base font-black leading-none">＋</span>
                        <span>展開 (5分詳細)</span>
                      </>
                    )}
                  </button>

                  {/* ステータスバッジ (完了または入力済みのみ表示) */}
                  {isGroupCompleted ? (
                    <span className="bg-emerald-500 text-white font-extrabold px-3 py-0.5 rounded-full text-xs flex items-center gap-1 shadow-xs">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      完了
                    </span>
                  ) : group.filledCount > 0 ? (
                    <span className="bg-sky-600 text-white font-extrabold px-3 py-0.5 rounded-full text-xs shadow-xs">
                      入力済み ({group.filledCount}/{group.totalCount})
                    </span>
                  ) : null}
                </div>
              </div>

              {/* グループ折りたたみ状態（設定済み業務タグのみ表示） */}
              {!isExpanded && groupTasks.length > 0 && (
                <div
                  className="p-3 md:p-3.5 bg-white/90 hover:bg-sky-50/50 cursor-pointer transition-colors flex items-center justify-between gap-2 border-t border-slate-100"
                  onClick={() => toggleHourExpand(group.hourKey)}
                >
                  <div className="flex flex-wrap items-center gap-1.5">
                    {groupTasks.map((task) => (
                      <span
                        key={task.id}
                        className="slot-task-badge text-xs"
                        style={{
                          backgroundColor: task.badgeBg,
                          color: task.color,
                          borderColor: task.color,
                        }}
                      >
                        {task.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 5分詳細展開状態（12コマリスト） */}
              {isExpanded && (
                <div className="p-3 bg-slate-50 border-t border-slate-200 space-y-2 animate-fadeIn">
                  <div className="slots-list space-y-2">
                    {group.slots.map((slot) => {
                      const isFilled = slot.selectedTaskIds.length > 0;
                      const selectedTasks = slot.selectedTaskIds
                        .map((id) => taskMap.get(id))
                        .filter((t): t is typeof PRESET_TASKS[0] => t !== undefined);

                      return (
                        <div
                          key={slot.id}
                          className={`slot-card ${isFilled ? 'filled' : 'unfilled-highlight'} ${
                            slot.isOvertime ? 'overtime-slot' : ''
                          }`}
                          onClick={() => onSlotClick(slot)}
                        >
                          {/* 時間ラベル */}
                          <div className="slot-time-col">
                            <span className="time-range">
                              {slot.startTime} - {slot.endTime}
                            </span>
                            {slot.isOvertime && (
                              <span className="overtime-tag">
                                {slot.overtimeType === 'early' ? '早出' : '残業'}
                              </span>
                            )}
                          </div>

                          {/* 選択された業務表示領域 */}
                          <div className="slot-content-col">
                            {isFilled ? (
                              <div className="selected-tags-flex">
                                {selectedTasks.map((task) => (
                                  <span
                                    key={task.id}
                                    className="slot-task-badge"
                                    style={{
                                      backgroundColor: task.badgeBg,
                                      color: task.color,
                                      borderColor: task.color,
                                    }}
                                  >
                                    {task.name}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <div className="unfilled-prompt">
                                <AlertTriangle className="w-4 h-4 text-amber-600 animate-pulse" />
                                <span className="unfilled-text">未入力コマ（タップして選択）</span>
                              </div>
                            )}
                          </div>

                          {/* 右側操作エリア (削除ボタン & 右矢印) */}
                          <div className="slot-action-col">
                            {onDeleteSlot && (
                              <button
                                type="button"
                                className="btn-slot-delete"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (window.confirm(`${slot.startTime}〜${slot.endTime} の時間帯枠を削除しますか？`)) {
                                    onDeleteSlot(slot.id);
                                  }
                                }}
                                title="この時間帯枠を削除"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                            <div className="slot-arrow">
                              <ChevronRight className="w-5 h-5 text-slate-400" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 5. 残業追加ボタン (17:15以降) */}
      {!isSubmitted && (
        <div className="overtime-add-wrapper my-6">
          <button className="btn-add-overtime" onClick={onAddLateSlot}>
            <PlusCircle className="w-4 h-4 text-purple-600" />
            <span>＋ 残業・時間外枠を追加 (5分後に拡張)</span>
          </button>
        </div>
      )}

      {/* 底部提出フッター */}
      <div className="timeline-footer">
        {!isSubmitted ? (
          <button className="btn-primary btn-large-submit" onClick={onSubmit}>
            <Sparkles className="w-5 h-5" />
            <span>タイムスタディを完了して提出する</span>
          </button>
        ) : (
          <div className="w-full bg-emerald-50 border-2 border-emerald-300 p-4 rounded-2xl text-center space-y-1">
            <div className="flex items-center justify-center gap-2 text-emerald-800 font-extrabold text-base">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              <span>本日のタイムスタディ提出が完了しています</span>
            </div>
            <p className="text-xs text-emerald-700">
              修正する場合は、画面上部の「✏️ 修正をする」ボタンを押してください。
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
