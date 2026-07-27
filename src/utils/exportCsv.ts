import { TimeStudyRecord } from '../types';
import { PRESET_TASKS } from '../constants';

export function exportRecordsToCSV(records: TimeStudyRecord[], filename: string = '看護部タイムスタディ集計データ.csv'): void {
  if (!records || records.length === 0) {
    alert('出力対象のデータが存在しません。');
    return;
  }

  const taskMap = new Map(PRESET_TASKS.map((t) => [t.id, t.name]));

  // CSVヘッダー
  const headers = [
    '提出ID',
    '調査対象日',
    '氏名',
    '職種',
    '部署',
    '年齢層',
    '開始時間',
    '終了時間',
    '区分(時間外)',
    '選択業務1',
    '選択業務2',
    '選択業務3',
    '提出日時',
  ];

  const rows: string[][] = [];

  records.forEach((record) => {
    record.slots.forEach((slot) => {
      const taskNames = slot.selectedTaskIds.map((id) => taskMap.get(id) || id);
      rows.push([
        record.id,
        record.user.targetDate,
        `"${record.user.name.replace(/"/g, '""')}"`,
        `"${record.user.role || '看護師'}"`,
        `"${record.user.department}"`,
        `"${record.user.ageGroup}"`,
        slot.startTime,
        slot.endTime,
        slot.isOvertime ? (slot.overtimeType === 'early' ? '早出' : '残業') : '通常',
        `"${taskNames[0] || ''}"`,
        `"${taskNames[1] || ''}"`,
        `"${taskNames[2] || ''}"`,
        record.submittedAt,
      ]);
    });
  });

  const csvContent =
    '\uFEFF' + // UTF-8 BOM for Excel in Japanese Windows
    headers.join(',') +
    '\n' +
    rows.map((r) => r.join(',')).join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
