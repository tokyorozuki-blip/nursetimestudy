import { UserProfile, TimeSlot, TimeStudyRecord, TaskItem } from '../types';

const USER_KEY = 'nurse_timestudy_user_profile';
const USERS_DB_KEY = 'nurse_timestudy_all_users_db';
const SLOTS_KEY = 'nurse_timestudy_draft_slots';
const RECORDS_KEY = 'nurse_timestudy_all_submitted_records';
const TASKS_KEY = 'nurse_timestudy_custom_tasks';
const DEVICE_ID_KEY = 'nurse_timestudy_device_id';

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
  const data = localStorage.getItem(USERS_DB_KEY);
  if (!data) return [];
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
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
  const data = localStorage.getItem(USER_KEY);
  if (!data) return null;
  try {
    const user = JSON.parse(data) as UserProfile;
    if (!user || typeof user !== 'object' || !user.staffId || !user.name) {
      return null;
    }
    if (!user.deviceId) {
      user.deviceId = getOrCreateDeviceId();
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
    return user;
  } catch {
    localStorage.removeItem(USER_KEY);
    return null;
  }
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

// ドラフト（一時保存スロット）の取得
export function getDraftSlots(): TimeSlot[] | null {
  const data = localStorage.getItem(SLOTS_KEY);
  if (!data) return null;
  try {
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    localStorage.removeItem(SLOTS_KEY);
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
