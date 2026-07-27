import { TimeStudyRecord, TimeSlot, Department, AgeGroup, JobRole } from '../types';
import { DEPARTMENTS, AGE_GROUPS, PRESET_TASKS, generateDefaultTimeSlots } from '../constants';

function pseudoRandom(seed: number) {
  const x = Math.sin(seed++) * 10000;
  return x - Math.floor(x);
}

// 600人規模のサンプルデータ（複数年: 2024, 2025, 2026年対応）を自動生成
export function generateMockRecords(count: number = 600): TimeStudyRecord[] {
  const records: TimeStudyRecord[] = [];
  const today = new Date();
  const currentYear = today.getFullYear();

  const firstNames = ['佐藤', '鈴木', '高橋', '田中', '伊藤', '渡辺', '山本', '中村', '小林', '加藤', '吉田', '山田', '佐々木', '山口', '松本', '井上', '木村', '林', '斎藤', '清水'];
  const lastNames = ['美咲', '葵', '陽菜', '七海', 'さくら', '心愛', '結衣', '凛', '芽衣', '楓', '拓海', '翔太', '陸', '蓮', '樹', '悠人', '颯太', '大翔', '奏太'];

  const years = [currentYear - 2, currentYear - 1, currentYear]; // 例: 2024, 2025, 2026

  for (let i = 1; i <= count; i++) {
    const role: JobRole = i % 5 === 0 ? '看護補助者' : '看護師';
    const deptIndex = Math.floor(pseudoRandom(i * 1.1) * DEPARTMENTS.length);
    const department: Department = DEPARTMENTS[deptIndex];

    const ageIndex = Math.floor(pseudoRandom(i * 2.3) * AGE_GROUPS.length);
    const ageGroup: AgeGroup = AGE_GROUPS[ageIndex];

    const lastName = firstNames[i % firstNames.length];
    const firstName = lastNames[(i * 3) % lastNames.length];
    const name = `${lastName} ${firstName}`;

    // 年の分散 (2024, 2025, 2026)
    const targetYear = years[i % years.length];
    const month = String(Math.floor(pseudoRandom(i * 3.7) * 12) + 1).padStart(2, '0');
    const day = String(Math.floor(pseudoRandom(i * 4.9) * 28) + 1).padStart(2, '0');
    const dateStr = `${targetYear}-${month}-${day}`;

    const roleTasks = PRESET_TASKS.filter(
      (t) => !t.targetRole || t.targetRole === '共通' || t.targetRole === role
    );

    const defaultSlots = generateDefaultTimeSlots();
    const slots: TimeSlot[] = defaultSlots.map((slot, sIndex) => {
      const rand = pseudoRandom(i * 100 + sIndex);
      const selectedTaskIds: string[] = [];

      if (slot.startTime >= '12:00' && slot.startTime < '13:30' && sIndex % 4 === 0) {
        selectedTaskIds.push('o-5'); // 休憩
      } else if (role === '看護補助者') {
        if (rand > 0.3) selectedTaskIds.push('a-d1');
        if (rand > 0.5) selectedTaskIds.push('a-i1');
        if (rand > 0.7) selectedTaskIds.push('a-d4');
      } else {
        const yearBonus = targetYear === currentYear ? 0.1 : targetYear === currentYear - 1 ? 0.05 : 0;
        if (department === 'ICU' || department === 'HCU') {
          if (rand > (0.4 - yearBonus)) selectedTaskIds.push('d-1');
          if (rand > (0.6 - yearBonus)) selectedTaskIds.push('d-2');
          if (rand > 0.8) selectedTaskIds.push('i-1');
        } else if (department.includes('外来')) {
          if (rand > 0.3) selectedTaskIds.push('d-1');
          if (rand > 0.5) selectedTaskIds.push('d-4');
          if (rand > 0.7) selectedTaskIds.push('i-4');
        } else {
          if (rand > (0.3 - yearBonus)) selectedTaskIds.push('d-3');
          if (rand > 0.55) selectedTaskIds.push('i-1');
          if (rand > 0.75) selectedTaskIds.push('d-1');
        }
      }

      if (selectedTaskIds.length === 0) {
        const fallbackIndex = Math.floor(rand * roleTasks.length);
        selectedTaskIds.push(roleTasks[fallbackIndex].id);
      }

      return {
        ...slot,
        selectedTaskIds: selectedTaskIds.slice(0, 3),
      };
    });

    records.push({
      id: `REC-${10000 + i}`,
      user: {
        staffId: String(100000 + i),
        name,
        role,
        department,
        ageGroup,
        targetDate: dateStr,
      },
      submittedAt: new Date(`${dateStr}T17:15:00`).toISOString(),
      slots,
    });
  }

  return records;
}
