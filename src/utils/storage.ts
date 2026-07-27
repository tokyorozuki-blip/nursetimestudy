import { UserProfile, TimeSlot, TimeStudyRecord, TaskItem } from '../types';

const USER_KEY = 'nurse_timestudy_user_profile';
const USERS_DB_KEY = 'nurse_timestudy_all_users_db';
const SLOTS_KEY = 'nurse_timestudy_draft_slots';
const RECORDS_KEY = 'nurse_timestudy_all_submitted_records';
const TASKS_KEY = 'nurse_timestudy_custom_tasks';
const DEVICE_ID_KEY = 'nurse_timestudy_device_id';

/** 共通の安全な JSON パース処理ヘルパー */
function safeParse<T>(key: string, fallback: T): T {
  const data = localStorage.getItem(key);
  if (!data) return fallback;
  try {
    return JSON.parse(data) as T;
  } catch {
    localStorage.removeItem(key);
    return fallback;
  }
}

// 端末（ブラウザ）固有IDの取得または新規割り当て
export function getOrCreateDeviceId(): string {
  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = 'DEV-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

// 全登録ユーザーDBの取得
export function getAllRegisteredUsers(): UserProfile[] {
  return safeParse<UserProfile[]>(USERS_DB_KEY, []);
}

// 職員ID(6桁)によるユーザー検索
export function findUserByStaffId(staffId: string): UserProfile | null {
  const users = getAllRegisteredUsers();
  return users.find((u) => u.staffId === staffId) || null;
}

// ユーザー情報保存（カレントログイン情報 ＆ 全ユーザーDB更新）
export function saveUserProfile(user: UserProfile): void {
  const deviceId = user.deviceId || getOrCreateDeviceId();
  const updatedUser = { ...user, deviceId };
  localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));

  const users = getAllRegisteredUsers();
  const index = users.findIndex((u) => u.staffId === user.staffId);
  if (index >= 0) {
    users[index] = updatedUser;
  } else {
    users.push(updatedUser);
  }
  localStorage.setItem(USERS_DB_KEY, JSON.stringify(users));
}

// カレントログインユーザーの取得
export function getUserProfile(): UserProfile | null {
  const user = safeParse<UserProfile | null>(USER_KEY, null);
  if (!user || typeof user !== 'object' || !user.staffId || !user.name) {
    return null;
  }
  if (!user.deviceId) {
    user.deviceId = getOrCreateDeviceId();
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }
  return user;
}

// ユーザーログアウト処理
export function logoutUserProfile(): void {
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(SLOTS_KEY);
}

// タイムスロット（一時保存データ）の保存・取得
export function saveDraftSlots(slots: TimeSlot[]): void {
  localStorage.setItem(SLOTS_KEY, JSON.stringify(slots));
}

export function getDraftSlots(): TimeSlot[] | null {
  const slots = safeParse<TimeSlot[] | null>(SLOTS_KEY, null);
  return Array.isArray(slots) ? slots : null;
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
  const tasks = safeParse<TaskItem[] | null>(TASKS_KEY, null);
  return Array.isArray(tasks) ? tasks : null;
}

// 全レコード（提出済み）の保存・取得（デモ／ローカル運用用）
export function getAllSubmittedRecords(): TimeStudyRecord[] {
  const records = safeParse<TimeStudyRecord[]>(RECORDS_KEY, []);
  return Array.isArray(records) ? records : [];
}

export function saveSubmittedRecord(record: TimeStudyRecord): void {
  const records = getAllSubmittedRecords();
  records.push(record);
  localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
}
