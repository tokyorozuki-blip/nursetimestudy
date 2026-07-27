// 18部署の型定義
export type Department =
  | 'ICU'
  | 'HCU'
  | '４西'
  | '４東'
  | '６西'
  | '６東'
  | '７西'
  | '７東'
  | '８西'
  | '８東'
  | '９西'
  | '９東'
  | '10西'
  | '10東'
  | 'はなみずみ（9階）'
  | 'さくら（10階）'
  | '国体町外来'
  | '伊福町外来';

// 年齢階層の型定義（20歳から5歳刻み）
export type AgeGroup =
  | '20〜24歳'
  | '25〜29歳'
  | '30〜34歳'
  | '35〜39歳'
  | '40〜44歳'
  | '45〜49歳'
  | '50〜54歳'
  | '55〜59歳'
  | '60歳以上';

// 職種の型定義
export type JobRole = '看護師' | '看護補助者';

// 業務大カテゴリ
export type CategoryGroup = '直接看護業務' | '間接看護業務' | 'その他・管理業務';

// 定型業務項目
export interface TaskItem {
  id: string;
  name: string;
  category: CategoryGroup;
  color: string;
  badgeBg: string;
  description: string;
  targetRole?: JobRole;
}

// ユーザー情報
export interface UserProfile {
  name: string;
  role: JobRole;
  department: Department;
  ageGroup: AgeGroup;
  targetDate: string; // YYYY-MM-DD
}

// 15分タイムスロット
export interface TimeSlot {
  id: string; // 例: "08:30"
  startTime: string; // 例: "08:30"
  endTime: string; // 例: "08:45"
  isOvertime?: boolean;
  overtimeType?: 'early' | 'late';
  selectedTaskIds: string[]; // 最大3つの定型業務ID
}

// 提出済みタイムスタディデータモデル
export interface TimeStudyRecord {
  id: string;
  user: UserProfile;
  submittedAt: string;
  slots: TimeSlot[];
}
