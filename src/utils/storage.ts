import { UserProfile, TimeSlot, TimeStudyRecord, TaskItem } from '../types';

const USER_KEY = 'nurse_timestudy_user_profile';
const USERS_DB_KEY = 'nurse_timestudy_all_users_db';
const SLOTS_KEY = 'nurse_timestudy_draft_slots';
const RECORDS_KEY = 'nurse_timestudy_all_submitted_records';
const TASKS_KEY = 'nurse_timestudy_custom_tasks';
const DEVICE_ID_KEY = 'nurse_timestudy_device_id';

/** 共通の安全な JSON パース処理ヘルパー (SSR / Vercel ガード付き) */
function safeParse<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined' || !window.localStorage) return fallback;
  try {
    const data = localStorage.getItem(key);
    if (!data) return fallback;
    const parsed = JSON.parse(data);
    return parsed ?? fallback;
  } catch {
    try {
      localStorage.removeItem(key);
    } catch {}
    return fallback;
  }
}

/** 安全な localStorage.setItem ラッパー */
function safeSetItem(key: string, value: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.setItem(key, value);
  } catch (e) {
    console.error('LocalStorage write error:', e);
  }
}

/** 安全な localStorage.removeItem ラッパー */
function safeRemoveItem(key: string): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    localStorage.removeItem(key);
  } catch {}
}

// 端末（ブラウザ）固有IDの取得または新規割り当て
export function getOrCreateDeviceId(): string {
  if (typeof window === 'undefined' || !window.localStorage) return 'DEV-SERVER';
  let deviceId = safeParse<string | null>(DEVICE_ID_KEY, null);
  if (!deviceId || typeof deviceId !== 'string') {
    deviceId = 'DEV-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    safeSetItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

// 全登録ユーザーDBの取得（ローカル ＆ Vercelクラウド非同期）
export function getAllRegisteredUsers(): UserProfile[] {
  const users = safeParse<UserProfile[]>(USERS_DB_KEY, []);
  if (!Array.isArray(users)) return [];
  return users.filter((u) => u && typeof u === 'object' && u.staffId && u.staffId.trim() !== '');
}

/** Vercelクラウドから全端末の登録済み職員リストを取得し二重登録防止 */
export async function fetchUsersFromVercel(): Promise<UserProfile[]> {
  const localUsers = getAllRegisteredUsers();
  try {
    const res = await fetch('/api/users');
    if (res.ok) {
      const cloudUsers = await res.json();
      if (Array.isArray(cloudUsers)) {
        const userMap = new Map<string, UserProfile>();
        localUsers.forEach((u) => {
          if (u && u.staffId && u.staffId.trim() !== '') {
            userMap.set(u.staffId, u);
          }
        });
        cloudUsers.forEach((u: UserProfile) => {
          if (u && u.staffId && u.staffId.trim() !== '') {
            userMap.set(u.staffId, u);
          }
        });
        const merged = Array.from(userMap.values());
        safeSetItem(USERS_DB_KEY, JSON.stringify(merged));
        return merged;
      }
    }
  } catch (err) {
    console.log('Vercel user sync status:', err);
  }
  return localUsers;
}

// 職員ID(6桁)によるユーザー検索
export function findUserByStaffId(staffId: string): UserProfile | null {
  if (!staffId || staffId.trim() === '') return null;
  const users = getAllRegisteredUsers();
  return users.find((u) => u.staffId === staffId) || null;
}

// ユーザー情報保存（カレント ＆ 全ユーザーDB ＆ Vercelクラウド共有）
export function saveUserProfile(user: UserProfile): void {
  if (!user || !user.staffId || user.staffId.trim() === '') return;
  const deviceId = user.deviceId || getOrCreateDeviceId();
  const nowStr = new Date().toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  const updatedUser: UserProfile = {
    ...user,
    deviceId,
    createdAt: user.createdAt || nowStr,
    updatedAt: nowStr,
  };

  safeSetItem(USER_KEY, JSON.stringify(updatedUser));

  const users = getAllRegisteredUsers();
  const index = users.findIndex((u) => u.staffId === user.staffId);
  if (index >= 0) {
    users[index] = updatedUser;
  } else {
    users.push(updatedUser);
  }
  const validUsers = users.filter((u) => u && u.staffId && u.staffId.trim() !== '');
  safeSetItem(USERS_DB_KEY, JSON.stringify(validUsers));

  // Vercel クラウドへ保存して全端末で登録IDを共有
  saveUserToVercel(updatedUser);
}

/** Vercelクラウドへユーザー登録を即時同期 */
export async function saveUserToVercel(user: UserProfile): Promise<boolean> {
  try {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(user),
    });
    return res.ok;
  } catch (err) {
    console.log('Vercel save user status:', err);
    return false;
  }
}

/** VercelクラウドDBからユーザー登録を完全削除 */
export async function deleteUserFromVercel(staffId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/users?staffId=${encodeURIComponent(staffId)}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch (err) {
    console.log('Vercel delete user status:', err);
    return false;
  }
}

// 指定職員IDの登録削除（ローカル ＆ Vercelクラウド完全抹消）
export function deleteUserProfileByStaffId(staffId: string): void {
  const users = getAllRegisteredUsers();
  const filtered = users.filter((u) => u.staffId !== staffId);
  safeSetItem(USERS_DB_KEY, JSON.stringify(filtered));

  const currentUser = getUserProfile();
  if (currentUser && currentUser.staffId === staffId) {
    safeRemoveItem(USER_KEY);
    safeRemoveItem(SLOTS_KEY);
  }

  // Vercel クラウドDBからも登録プロファイルを即時完全消去
  deleteUserFromVercel(staffId);
}

// カレントログインユーザーの取得
export function getUserProfile(): UserProfile | null {
  const user = safeParse<UserProfile | null>(USER_KEY, null);
  if (!user || typeof user !== 'object' || !user.staffId || !user.name) {
    return null;
  }
  if (!user.deviceId) {
    user.deviceId = getOrCreateDeviceId();
    safeSetItem(USER_KEY, JSON.stringify(user));
  }
  return user;
}

// ユーザーログアウト処理
export function logoutUserProfile(): void {
  safeRemoveItem(USER_KEY);
  safeRemoveItem(SLOTS_KEY);
}

// タイムスロット（一時保存データ）の保存・取得
export function saveDraftSlots(slots: TimeSlot[]): void {
  safeSetItem(SLOTS_KEY, JSON.stringify(slots));
}

export function getDraftSlots(): TimeSlot[] | null {
  const slots = safeParse<TimeSlot[] | null>(SLOTS_KEY, null);
  return Array.isArray(slots) ? slots : null;
}

// 一時保存データのクリア
export function clearDraftSlots(): void {
  safeRemoveItem(SLOTS_KEY);
}

// カスタム定型業務マスターの保存・取得
export function saveCustomTasks(tasks: TaskItem[]): void {
  safeSetItem(TASKS_KEY, JSON.stringify(tasks));
}

export function getCustomTasks(): TaskItem[] | null {
  const tasks = safeParse<TaskItem[] | null>(TASKS_KEY, null);
  return Array.isArray(tasks) ? tasks : null;
}

// 全レコード（提出済み）の保存・取得（ローカル ＆ Vercelクラウド同期）
export function getAllSubmittedRecords(): TimeStudyRecord[] {
  const records = safeParse<TimeStudyRecord[]>(RECORDS_KEY, []);
  if (!Array.isArray(records)) return [];
  return records
    .map((r) => normalizeTimeStudyRecord(r))
    .filter((r): r is TimeStudyRecord => r !== null);
}

/** レコードデータの完全安全ガード（不整合データでの白画面クラッシュを防止） */
export function normalizeTimeStudyRecord(r: any): TimeStudyRecord | null {
  if (!r || typeof r !== 'object') return null;
  const user = r.user || {};
  return {
    id: String(r.id || `rec-${Date.now()}`),
    user: {
      staffId: String(user.staffId || '000000'),
      name: String(user.name || '名前未設定'),
      role: user.role === '看護補助者' ? '看護補助者' : '看護師',
      department: user.department || 'ICU',
      ageGroup: user.ageGroup || '30〜34歳',
      targetDate: String(user.targetDate || new Date().toISOString().split('T')[0]),
      deviceId: user.deviceId || '',
    },
    slots: Array.isArray(r.slots) ? r.slots : [],
    totalFilledSlots: typeof r.totalFilledSlots === 'number' ? r.totalFilledSlots : (Array.isArray(r.slots) ? r.slots.length : 0),
    submittedAt: String(r.submittedAt || new Date().toISOString()),
  };
}

/** 二重・三重ネスト文字列化されたクラウドデータを再帰的に解凍・抽出する安全関数 */
function deepExtractRecords(raw: any): any[] {
  if (!raw) return [];
  if (Array.isArray(raw)) {
    let list: any[] = [];
    for (const item of raw) {
      list = list.concat(deepExtractRecords(item));
    }
    return list;
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return deepExtractRecords(parsed);
    } catch {
      return [];
    }
  }
  if (typeof raw === 'object' && raw !== null && (raw.id || raw.user)) {
    return [raw];
  }
  return [];
}

/** Vercelクラウドから全提出データを非同期フェッチしてローカルへ自動同期 */
export async function fetchSubmittedRecordsFromVercel(): Promise<TimeStudyRecord[]> {
  const localRecords = getAllSubmittedRecords();
  try {
    const res = await fetch('/api/records');
    if (res.ok) {
      const cloudData = await res.json();
      const extractedList = deepExtractRecords(cloudData);
      
      const validCloudRecords = extractedList
        .map((r: any) => normalizeTimeStudyRecord(r))
        .filter((r): r is TimeStudyRecord => r !== null);

      const recordMap = new Map<string, TimeStudyRecord>();
      // クラウドの最新データでMAPを構築（クラウドを優先正本とする）
      validCloudRecords.forEach((r) => recordMap.set(r.id, r));
      // 未送信の完全新規ローカルレコードがあれば補完追加
      localRecords.forEach((r) => {
        const norm = normalizeTimeStudyRecord(r);
        if (norm && !recordMap.has(norm.id)) {
          recordMap.set(norm.id, norm);
        }
      });

      const merged = Array.from(recordMap.values());
      safeSetItem(RECORDS_KEY, JSON.stringify(merged));
      return merged;
    }
  } catch (err) {
    console.log('Vercel API sync (fetch) status:', err);
  }
  return localRecords;
}

/** 提出データをローカル保存＋Vercelクラウドへ送信 */
export function saveSubmittedRecord(record: TimeStudyRecord): void {
  const records = getAllSubmittedRecords();
  // 重複追加防止
  if (!records.some((r) => r.id === record.id)) {
    records.unshift(record);
    safeSetItem(RECORDS_KEY, JSON.stringify(records));
  }

  // Vercel クラウドDBへ自動非同期送信
  submitRecordToVercel(record);
}

/** VercelクラウドAPIへ非同期提出 */
export async function submitRecordToVercel(record: TimeStudyRecord): Promise<boolean> {
  try {
    const res = await fetch('/api/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record),
    });
    return res.ok;
  } catch (err) {
    console.log('Vercel API submit status:', err);
    return false;
  }
}

/** VercelクラウドDBから提出データを完全削除 */
export async function deleteSubmittedRecordsFromVercel(targetDate?: string): Promise<boolean> {
  try {
    const url = targetDate ? `/api/records?targetDate=${encodeURIComponent(targetDate)}` : '/api/records';
    const res = await fetch(url, {
      method: 'DELETE',
    });
    return res.ok;
  } catch (err) {
    console.log('Vercel delete records status:', err);
    return false;
  }
}


const DEPT_TARGETS_KEY = 'nurse_timestudy_dept_targets';

/** 各部署の回答対象者数（目標人数）設定の保存と取得 */
export function getDeptTargets(): Record<string, number> {
  const saved = safeParse<Record<string, number> | null>(DEPT_TARGETS_KEY, null);
  if (saved && typeof saved === 'object') return saved;
  return {};
}

export function saveDeptTargets(targets: Record<string, number>): void {
  safeSetItem(DEPT_TARGETS_KEY, JSON.stringify(targets));
}
