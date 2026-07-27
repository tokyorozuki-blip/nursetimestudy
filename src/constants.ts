import { Department, AgeGroup, TaskItem, TimeSlot, ShiftType } from './types';

// 指定の全18部署
export const DEPARTMENTS: Department[] = [
  'ICU',
  'HCU',
  '４西',
  '４東',
  '６西',
  '６東',
  '７西',
  '７東',
  '８西',
  '８東',
  '９西',
  '９東',
  '10西',
  '10東',
  'はなみずみ（9階）',
  'さくら（10階）',
  '国体町外来',
  '伊福町外来',
];

// 20歳から5歳刻みの年齢階層
export const AGE_GROUPS: AgeGroup[] = [
  '20〜24歳',
  '25〜29歳',
  '30〜34歳',
  '35〜39歳',
  '40〜44歳',
  '45〜49歳',
  '50〜54歳',
  '55〜59歳',
  '60歳以上',
];

// あらかじめ組み込む標準定型業務マスター（看護師用・看護補助者用）
export const PRESET_TASKS: TaskItem[] = [
  // ==========================================
  // 🩺 看護師専用・共通マスター
  // ==========================================
  // 🟦 直接看護業務（看護師）
  {
    id: 'd-1',
    name: 'バイタル・観察',
    category: '直接看護業務',
    color: '#0284c7',
    badgeBg: '#e0f2fe',
    description: 'バイタルサイン測定、状態観察、心電図チェック',
    targetRole: '看護師',
  },
  {
    id: 'd-2',
    name: '処置・点滴・採血',
    category: '直接看護業務',
    color: '#0369a1',
    badgeBg: '#bae6fd',
    description: '処置介助、注射・点滴投与、採血、創傷ケア',
    targetRole: '看護師',
  },
  {
    id: 'd-3',
    name: '生活援助・ケア',
    category: '直接看護業務',
    color: '#0f766e',
    badgeBg: '#ccfbf1',
    description: '体位変換、清拭・入浴介助、食事介助、排泄ケア',
    targetRole: '看護師',
  },
  {
    id: 'd-4',
    name: '服薬管理・指導',
    category: '直接看護業務',
    color: '#15803d',
    badgeBg: '#dcfce7',
    description: '配薬、与薬確認、患者・家族への服薬説明・指導',
    targetRole: '看護師',
  },
  {
    id: 'd-5',
    name: '医師ラウンド同行',
    category: '直接看護業務',
    color: '#4338ca',
    badgeBg: '#e0e7ff',
    description: '医師回診同行、処置補助、検査受入れ・付き添い',
    targetRole: '看護師',
  },

  // 🟩 間接看護業務（看護師）
  {
    id: 'i-1',
    name: 'カルテ記録・入力',
    category: '間接看護業務',
    color: '#16a34a',
    badgeBg: '#dcfce7',
    description: '電子カルテ入力、経過記録、看護計画立案・評価',
    targetRole: '看護師',
  },
  {
    id: 'i-2',
    name: '情報収集・指示確認',
    category: '間接看護業務',
    color: '#059669',
    badgeBg: '#d1fae5',
    description: 'カルテ情報確認、医師指示受諾・照合、申し送り準備',
    targetRole: '看護師',
  },
  {
    id: 'i-3',
    name: '申し送り・会議',
    category: '間接看護業務',
    color: '#d97706',
    badgeBg: '#fef3c7',
    description: '朝夕申し送り、病棟カンファレンス、多職種連携会議',
    targetRole: '看護師',
  },
  {
    id: 'i-4',
    name: '物品・薬品準備',
    category: '間接看護業務',
    color: '#ca8a04',
    badgeBg: '#fef9c3',
    description: '処置車準備、配薬準備、薬品払い出し、物品補充',
    targetRole: '看護師',
  },

  // 🟧 その他・管理業務（看護師）
  {
    id: 'o-1',
    name: '移動・患者搬送',
    category: 'その他・管理業務',
    color: '#9333ea',
    badgeBg: '#f3e8ff',
    description: '病棟内移動、他部門・検査室への患者搬送',
    targetRole: '看護師',
  },
  {
    id: 'o-2',
    name: '環境整備・消毒',
    category: 'その他・管理業務',
    color: '#c026d3',
    badgeBg: '#fae8ff',
    description: 'ベッドメイク、病室清掃・換気、機材消毒・管理',
    targetRole: '看護師',
  },
  {
    id: 'o-3',
    name: '教育・指導',
    category: 'その他・管理業務',
    color: '#e11d48',
    badgeBg: '#ffe4e6',
    description: '新人看護師指導、看護学生指導、院内研修受講',
    targetRole: '看護師',
  },
  {
    id: 'o-4',
    name: '事務・電話連絡',
    category: 'その他・管理業務',
    color: '#475569',
    badgeBg: '#f1f5f9',
    description: '他部門調整、電話対応、書類作成・ファイル整理',
    targetRole: '看護師',
  },
  {
    id: 'o-5',
    name: '休憩・その他',
    category: 'その他・管理業務',
    color: '#64748b',
    badgeBg: '#e2e8f0',
    description: '昼休憩、小休憩、その他業務',
    targetRole: '看護師',
  },

  // ==========================================
  // 🤝 看護補助者専用マスター
  // ==========================================
  // 🟦 直接看護業務（身体ケア・援助補助）
  {
    id: 'a-d1',
    name: '体位変換・移乗介助',
    category: '直接看護業務',
    color: '#0284c7',
    badgeBg: '#e0f2fe',
    description: '体位変換、車椅子・ストレッチャー移乗介助',
    targetRole: '看護補助者',
  },
  {
    id: 'a-d2',
    name: '清拭・入浴介助',
    category: '直接看護業務',
    color: '#0f766e',
    badgeBg: '#ccfbf1',
    description: '身体清拭、足浴介助、入浴・シャワー準備および介助',
    targetRole: '看護補助者',
  },
  {
    id: 'a-d3',
    name: '排泄介助・オムツ交換',
    category: '直接看護業務',
    color: '#0369a1',
    badgeBg: '#bae6fd',
    description: 'トイレ誘導、便器着脱介助、オムツ交換・処理',
    targetRole: '看護補助者',
  },
  {
    id: 'a-d4',
    name: '食事介助・配膳下膳',
    category: '直接看護業務',
    color: '#15803d',
    badgeBg: '#dcfce7',
    description: '食事配膳・回収、食事摂取補助、お茶配り・水分補給',
    targetRole: '看護補助者',
  },
  {
    id: 'a-d5',
    name: '患者搬送・誘導',
    category: '直接看護業務',
    color: '#4338ca',
    badgeBg: '#e0e7ff',
    description: '検査室・リハビリ室・手術室への患者搬送および付き添い',
    targetRole: '看護補助者',
  },

  // 🟩 間接看護業務（環境整備・物品衛生管理）
  {
    id: 'a-i1',
    name: 'ベッドメイク・リネン管理',
    category: '間接看護業務',
    color: '#16a34a',
    badgeBg: '#dcfce7',
    description: '退院床・定期ベッドメイキング、リネン類の準備・整理回収',
    targetRole: '看護補助者',
  },
  {
    id: 'a-i2',
    name: '病室清掃・環境整備',
    category: '間接看護業務',
    color: '#059669',
    badgeBg: '#d1fae5',
    description: '床頭台・ベッド周りの清掃、病室換気・ゴミ収集処分',
    targetRole: '看護補助者',
  },
  {
    id: 'a-i3',
    name: '物品・消耗品補充整理',
    category: '間接看護業務',
    color: '#ca8a04',
    badgeBg: '#fef9c3',
    description: '倉庫・中央材料室からの消耗品受入・補充・衛生材料整理',
    targetRole: '看護補助者',
  },
  {
    id: 'a-i4',
    name: '機材消毒・器具洗浄',
    category: '間接看護業務',
    color: '#d97706',
    badgeBg: '#fef3c7',
    description: '車椅子・歩行器・メディカル機器の清拭消毒、使用済み器具の洗浄',
    targetRole: '看護補助者',
  },

  // 🟧 その他・管理業務（事務補助・連絡）
  {
    id: 'a-o1',
    name: 'メッセンジャー・書類搬送',
    category: 'その他・管理業務',
    color: '#9333ea',
    badgeBg: '#f3e8ff',
    description: '検体搬送、処方箋・カルテ・伝票類の中央部門への運搬',
    targetRole: '看護補助者',
  },
  {
    id: 'a-o2',
    name: '看護師補助・ナースコール一次対応',
    category: 'その他・管理業務',
    color: '#475569',
    badgeBg: '#f1f5f9',
    description: 'ナースコール一時対応・看護師への報告、業務サポート',
    targetRole: '看護補助者',
  },
  {
    id: 'a-o3',
    name: '休憩・その他',
    category: 'その他・管理業務',
    color: '#64748b',
    badgeBg: '#e2e8f0',
    description: '昼休憩、小休憩、その他業務',
    targetRole: '看護補助者',
  },
];

// 勤務時間 (日勤 08:30~17:15 / 夜勤 16:30~翌09:30) の15分刻みスロット生成ロジック
export function generateDefaultTimeSlots(shiftType: ShiftType = 'day'): TimeSlot[] {
  const slots: TimeSlot[] = [];

  let startTotalMinutes: number;
  let endTotalMinutes: number;

  if (shiftType === 'night') {
    // 夜勤: 16:30 (990分) ～ 翌9:30 (2010分)
    startTotalMinutes = 16 * 60 + 30;
    endTotalMinutes = (24 + 9) * 60 + 30;
  } else {
    // 日勤: 08:30 (510分) ～ 17:15 (1035分)
    startTotalMinutes = 8 * 60 + 30;
    endTotalMinutes = 17 * 60 + 15;
  }

  let currentTotalMinutes = startTotalMinutes;

  while (currentTotalMinutes < endTotalMinutes) {
    const nextTotalMinutes = currentTotalMinutes + 15;

    const actualStartM = currentTotalMinutes % (24 * 60);
    const startH = String(Math.floor(actualStartM / 60)).padStart(2, '0');
    const startM = String(actualStartM % 60).padStart(2, '0');

    const actualEndM = nextTotalMinutes % (24 * 60);
    const endH = String(Math.floor(actualEndM / 60)).padStart(2, '0');
    const endM = String(actualEndM % 60).padStart(2, '0');

    const isNextDay = currentTotalMinutes >= 24 * 60;
    const slotId = `${startH}:${startM}${isNextDay ? '-next' : ''}`;

    slots.push({
      id: slotId,
      startTime: `${startH}:${startM}`,
      endTime: `${endH}:${endM}`,
      isOvertime: false,
      selectedTaskIds: [],
    });

    currentTotalMinutes = nextTotalMinutes;
  }

  return slots;
}
