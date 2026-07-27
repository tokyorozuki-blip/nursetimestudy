import React from 'react';
import { TimeSlot } from '../types';
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
} from 'lucide-react';

interface TimelineProps {
  slots: TimeSlot[];
  onSlotClick: (slot: TimeSlot) => void;
  onAddEarlySlot: () => void;
  onAddLateSlot: () => void;
  onSaveDraft: () => void;
  onSubmit: () => void;
  isDraftSaved: boolean;
}

export const Timeline: React.FC<TimelineProps> = ({
  slots,
  onSlotClick,
  onAddEarlySlot,
  onAddLateSlot,
  onSaveDraft,
  onSubmit,
  isDraftSaved,
}) => {
  const taskMap = new Map(PRESET_TASKS.map((t) => [t.id, t]));

  // 未入力コマ数と進捗度の計算
  const totalSlots = slots.length;
  const filledSlots = slots.filter((s) => s.selectedTaskIds.length > 0).length;
  const unassignedCount = totalSlots - filledSlots;
  const progressPercent = Math.round((filledSlots / totalSlots) * 100);

  return (
    <div className="timeline-container">
      {/* 1. 進捗プログレス ＆ ステータスカード */}
      <div className="status-banner">
        <div className="status-info">
          <div className="status-title-row">
            <h2 className="status-heading">
              <Clock className="w-5 h-5 text-sky-600 inline-icon" />
              15分枠 タイムスタディ入力
            </h2>
            {unassignedCount > 0 ? (
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
            各15分のコマをタップして、定型業務を選択してください（1コマ最大3つ）。
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

      {/* 2. アクションツールバー (一時保存 / 送信) */}
      <div className="action-toolbar">
        <button
          className={`btn-toolbar btn-save ${isDraftSaved ? 'saved' : ''}`}
          onClick={onSaveDraft}
          title="ブラウザに一時保存します"
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
      </div>

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

              {/* 右矢印アイコン */}
              <div className="slot-arrow">
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </div>
            </div>
          );
        })}
      </div>

      {/* 5. 残業追加ボタン (17:15以降) */}
      <div className="overtime-add-wrapper my-6">
        <button className="btn-add-overtime" onClick={onAddLateSlot}>
          <PlusCircle className="w-4 h-4 text-purple-600" />
          <span>＋ 残業・時間外枠を追加 (15分後に拡張)</span>
        </button>
      </div>

      {/* 底部提出フッター */}
      <div className="timeline-footer">
        <button className="btn-primary btn-large-submit" onClick={onSubmit}>
          <Sparkles className="w-5 h-5" />
          <span>タイムスタディを完了して提出する</span>
        </button>
      </div>
    </div>
  );
};
