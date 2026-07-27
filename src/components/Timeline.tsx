import React, { useState } from 'react';
import { TimeSlot, ShiftType } from '../types';
import { PRESET_TASKS } from '../constants';
import {
  Clock,
  PlusCircle,
  Save,
  Send,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Trash2,
  Settings2,
  Calendar,
  X,
  Check,
} from 'lucide-react';

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
  onAddEarlySlot: () => void;
  onAddLateSlot: () => void;
  onDeleteSlot?: (slotId: string) => void;
  onSaveDraft: () => void;
  onSubmit: () => void;
  isDraftSaved: boolean;
  isSubmitted?: boolean;
  onUnlockSubmit?: () => void;
}

export const Timeline: React.FC<TimelineProps> = ({
  slots,
  shiftType = 'day',
  customStartTime = '09:00',
  customEndTime = '18:00',
  onChangeShiftAndSlots,
  onSlotClick,
  onAddEarlySlot,
  onAddLateSlot,
  onDeleteSlot,
  onSaveDraft,
  onSubmit,
  isDraftSaved,
  isSubmitted = false,
  onUnlockSubmit,
}) => {
  const taskMap = new Map(PRESET_TASKS.map((t) => [t.id, t]));

  // 時間枠調整パネルの開閉ステート
  const [showShiftConfig, setShowShiftConfig] = useState<boolean>(false);
  const [tempShiftType, setTempShiftType] = useState<ShiftType>(shiftType);
  const [tempStart, setTempStart] = useState<string>(customStartTime);
  const [tempEnd, setTempEnd] = useState<string>(customEndTime);

  // 所属長連絡確認ダイアログの開閉ステート
  const [showUnlockConfirmModal, setShowUnlockConfirmModal] = useState<boolean>(false);

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
              15分枠 タイムスタディ入力
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
              : '各15分のコマをタップして、定型業務を選択してください（1コマ最大3つ）。'}
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

      {/* ⏱️ 画面上で時間枠・シフトを自由に調整できるポップオーバーカード */}
      {showShiftConfig && (
        <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-xl mb-4 border-2 border-sky-400 animate-fadeIn space-y-3">
          <div className="flex items-center justify-between border-b border-slate-700 pb-2">
            <div className="flex items-center gap-2 font-bold text-sm text-sky-300">
              <Clock className="w-4 h-4" />
              <span>勤務時間枠・シフトの変更</span>
            </div>
            <button
              type="button"
              className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              onClick={() => setShowShiftConfig(false)}
            >
              <X className="w-4 h-4" />
            </button>
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

      {/* 3. 早出追加ボタン (8:30以前) */}
      <div className="overtime-add-wrapper">
        <button className="btn-add-overtime" onClick={onAddEarlySlot}>
          <PlusCircle className="w-4 h-4 text-sky-600" />
          <span>＋ 早出の時間外枠を追加 (15分前に拡張)</span>
        </button>
      </div>

      {/* 4. 15分タイムスロットリスト */}
      <div className="slots-list">
        {slots.map((slot) => {
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

      {/* 5. 残業追加ボタン (17:15以降) */}
      {!isSubmitted && (
        <div className="overtime-add-wrapper my-6">
          <button className="btn-add-overtime" onClick={onAddLateSlot}>
            <PlusCircle className="w-4 h-4 text-purple-600" />
            <span>＋ 残業・時間外枠を追加 (15分後に拡張)</span>
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
