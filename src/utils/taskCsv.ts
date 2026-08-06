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

/**
 * CSVファイルを文字コード自動判別（UTF-8 または Shift-JIS）でテキストとして読み込む
 */
export async function readCsvFileText(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  try {
    // 1. 厳格なUTF-8デコードを試行
    const decoder = new TextDecoder('utf-8', { fatal: true });
    return decoder.decode(buffer);
  } catch {
    // 2. UTF-8でデコード失敗した場合は Shift-JIS (CP932) としてデコード
    const sjisDecoder = new TextDecoder('shift-jis');
    return sjisDecoder.decode(buffer);
  }
}

/**
 * CSVテキストを2次元配列 (string[][]) に分解
 * (クォート囲み、クォート内改行、BOM除去に対応)
 */
export function parseCsvToRows(csvText: string): string[][] {
  const text = csvText.replace(/^\uFEFF/, '');
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentCell += '"';
          i++; // エスケープされた二重引用符
        } else {
          inQuotes = false;
        }
      } else {
        currentCell += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentCell.trim());
        currentCell = '';
      } else if (char === '\r') {
        if (nextChar === '\n') {
          i++;
        }
        currentRow.push(currentCell.trim());
        if (currentRow.some((cell) => cell.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentCell = '';
      } else if (char === '\n') {
        currentRow.push(currentCell.trim());
        if (currentRow.some((cell) => cell.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim());
    if (currentRow.some((cell) => cell.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
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
  const rows = parseCsvToRows(csvText);
  if (rows.length === 0) {
    return {
      tasks: [],
      errors: ['有効なデータが見つかりません。ファイル内容をご確認ください。'],
    };
  }

  const tasks: TaskItem[] = [];
  const errors: string[] = [];

  // ヘッダー行の検出と列インデックスのマッピング
  let idIdx = -1;
  let roleIdx = -1;
  let categoryIdx = -1;
  let nameIdx = -1;
  let colorIdx = -1;
  let badgeBgIdx = -1;
  let descIdx = -1;

  let startRowIndex = 0;
  const firstRowLower = rows[0].map((c) => c.toLowerCase());

  const hasHeader = firstRowLower.some(
    (c) =>
      c.includes('id') ||
      c.includes('職種') ||
      c.includes('カテゴリ') ||
      c.includes('業務') ||
      c.includes('名称') ||
      c.includes('名前') ||
      c.includes('説明')
  );

  if (hasHeader) {
    startRowIndex = 1;
    firstRowLower.forEach((col, idx) => {
      if (col.includes('id')) idIdx = idx;
      else if (col.includes('職種') || col.includes('role')) roleIdx = idx;
      else if (col.includes('カテゴリ') || col.includes('分類') || col.includes('category')) categoryIdx = idx;
      else if (
        col.includes('名称') ||
        col.includes('業務名') ||
        col.includes('名前') ||
        col.includes('タイトル') ||
        col.includes('name')
      )
        nameIdx = idx;
      else if (col.includes('バッジ') || col.includes('背景')) badgeBgIdx = idx;
      else if (col.includes('カラー') || col.includes('色') || col.includes('color')) colorIdx = idx;
      else if (col.includes('説明') || col.includes('詳細') || col.includes('補足') || col.includes('desc'))
        descIdx = idx;
    });
  }

  // デフォルト位置の補正（ヘッダー未検出または不足時）
  if (idIdx === -1) idIdx = 0;
  if (roleIdx === -1) roleIdx = 1;
  if (categoryIdx === -1) categoryIdx = 2;
  if (nameIdx === -1) nameIdx = 3;
  if (colorIdx === -1) colorIdx = 4;
  if (badgeBgIdx === -1) badgeBgIdx = 5;
  if (descIdx === -1) descIdx = 6;

  for (let i = startRowIndex; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    // 業務名称の取得
    const name = (row[nameIdx] !== undefined ? row[nameIdx] : row[0] || '').trim();
    if (!name || name === '業務名称' || name === '業務名' || name === '名前') {
      if (name && startRowIndex === 0 && i === 0) continue; // ヘッダー行スキップ
      if (!name) errors.push(`行 ${i + 1}: 業務名称が空のためスキップしました。`);
      continue;
    }

    // 業務ID
    let rawId = row[idIdx] ? row[idIdx].trim() : '';
    if (!rawId || rawId === '業務ID' || rawId === 'id') {
      rawId = `custom-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`;
    }

    // 対象職種
    const rawRole = (row[roleIdx] || '').trim();
    let role: JobRole | '共通' = '看護師';
    if (rawRole.includes('補助')) {
      role = '看護補助者';
    } else if (rawRole.includes('共通') || rawRole.includes('全')) {
      role = '共通';
    } else if (rawRole.includes('看護師') || rawRole.includes('Ns') || rawRole.includes('NS')) {
      role = '看護師';
    }

    // 業務カテゴリ
    const rawCategory = (row[categoryIdx] || '').trim();
    let category: TaskCategory = '直接看護業務';
    if (rawCategory.includes('直接')) {
      category = '直接看護業務';
    } else if (rawCategory.includes('間接')) {
      category = '間接看護業務';
    } else if (rawCategory.includes('その他') || rawCategory.includes('管理')) {
      category = 'その他・管理業務';
    } else {
      category = '直接看護業務';
    }

    // デフォルト色設定
    let defaultColor = '#0284c7';
    let defaultBadgeBg = '#e0f2fe';
    if (category === '間接看護業務') {
      defaultColor = '#059669';
      defaultBadgeBg = '#dcfce7';
    } else if (category === 'その他・管理業務') {
      defaultColor = '#d97706';
      defaultBadgeBg = '#fef3c7';
    }

    const color = (row[colorIdx] || '').trim() || defaultColor;
    const badgeBg = (row[badgeBgIdx] || '').trim() || defaultBadgeBg;
    const description = (row[descIdx] || '').trim() || `${category} (CSV取込)`;

    tasks.push({
      id: rawId,
      targetRole: role,
      category,
      name,
      color,
      badgeBg,
      description,
    });
  }

  if (tasks.length === 0 && errors.length === 0) {
    errors.push('有効な定型業務データが1件も見つかりませんでした。');
  }

  return { tasks, errors };
}
