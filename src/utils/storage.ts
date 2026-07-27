import { UserProfile, TimeSlot, TimeStudyRecord, TaskItem } from '../types';

const USER_KEY = 'nurse_timestudy_user_profile';
const SLOTS_KEY = 'nurse_timestudy_draft_slots';
const RECORDS_KEY = 'nurse_timestudy_all_submitted_records';
const TASKS_KEY = 'nurse_timestudy_custom_tasks';

// ユーザー属性の一時保存・取得
export function saveUserProfile(user: UserProfile): void {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function getUserProfile(): UserProfile | null {
  const data = localStorage.getItem(USER_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

// タイムスロット（一時保存データ）の保存・取得
export function saveDraftSlots(slots: TimeSlot[]): void {
  localStorage.setItem(SLOTS_KEY, JSON.stringify(slots));
}

export function getDraftSlots(): TimeSlot[] | null {
  const data = localStorage.getItem(SLOTS_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

// 一時保存データのクリア
export function clearDraftSlots(): void {
  localStorage.removeItem(SLOTS_KEY);
}

// カスタム定型業務マスターの保存・取得
export function saveCustomTasks(tasks: TaskItem[]): void {
  localStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

export function getCustomTasks(): TaskItem[] | null {
  const data = localStorage.getItem(TASKS_KEY);
  if (!data) return null;
  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

// 全レコード（提出済み）の保存・取得（デモ／ローカル運用用）
export function getAllSubmittedRecords(): TimeStudyRecord[] {
  const data = localStorage.getItem(RECORDS_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

export function saveSubmittedRecord(record: TimeStudyRecord): void {
  const records = getAllSubmittedRecords();
  records.push(record);
  localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
}
