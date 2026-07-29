import { TaskItem, TaskCategory, JobRole } from '../types';

/** CSVセル値のエスケープ処理 */
function escapeCsvCell(val: string): string {
  if (val === undefined || val === null) return '""';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/** CSV1行を分解する関数 (クォート囲み対応) */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let cur = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (inQuotes) {
      if (char === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        result.push(cur.trim());
        cur = '';
      } else {
        cur += char;
      }
    }
  }
  result.push(cur.trim());
  return result;
}

/** 業務マスターをCSV形式でエクスポートしてダウンロード */
export function exportTaskMasterToCSV(tasks: TaskItem[]) {
  const headers = ['業務ID', '対象職種', '業務カテゴリ', '業務名称', 'カラーコード', 'バッジ背景色', '説明'];

  const rows = tasks.map((t) => [
    t.id,
    t.targetRole || '看護師',
    t.category,
    t.name,
    t.color || '#0284c7',
    t.badgeBg || '#e0f2fe',
    t.description || '',
  ]);

  const csvContent =
    '\uFEFF' +
    [headers.map(escapeCsvCell).join(','), ...rows.map((row) => row.map(escapeCsvCell).join(','))].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const dateStr = new Date().toISOString().split('T')[0];
  a.download = `登録業務マスター一覧_${dateStr}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** CSVテキストから業務マスター配列 (TaskItem[]) を復元・パース */
export function parseTaskMasterCSV(csvText: string): { tasks: TaskItem[]; errors: string[] } {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    return { tasks: [], errors: ['有効なデータ行が見つかりません。ヘッダーおよびデータ行が含まれているかご確認ください。'] };
  }

  const tasks: TaskItem[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (cols.length < 4) continue; // 列不足はスキップ

    const id = cols[0] || `custom-${Date.now()}-${i}`;
    let role = (cols[1] || '看護師') as JobRole | '共通';
    if (role !== '看護師' && role !== '看護補助者' && role !== '共通') {
      role = '看護師';
    }

    let category = cols[2] as TaskCategory;
    if (category !== '直接看護業務' && category !== '間接看護業務' && category !== 'その他・管理業務') {
      if (category.includes('直接')) category = '直接看護業務';
      else if (category.includes('間接')) category = '間接看護業務';
      else category = 'その他・管理業務';
    }

    const name = cols[3];
    if (!name) {
      errors.push(`行 ${i + 1}: 業務名称が空のためスキップしました。`);
      continue;
    }

    const color = cols[4] || '#0284c7';
    const badgeBg = cols[5] || '#e0f2fe';
    const description = cols[6] || 'カスタムCSV読込業務';

    tasks.push({
      id,
      targetRole: role,
      category,
      name,
      color,
      badgeBg,
      description,
    });
  }

  return { tasks, errors };
}
