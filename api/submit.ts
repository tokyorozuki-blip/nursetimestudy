import type { VercelRequest, VercelResponse } from '@vercel/node';

function getKvCredentials() {
  const url =
    process.env.KV_REST_API_URL ||
    process.env.UPSTASH_REDIS_REST_URL ||
    process.env.VERCEL_KV_REST_API_URL ||
    process.env.REDIS_REST_API_URL;

  const token =
    process.env.KV_REST_API_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN ||
    process.env.VERCEL_KV_REST_API_TOKEN ||
    process.env.REDIS_REST_API_TOKEN;

  return { url, token };
}

// どんなに変なネスト文字列で入っていても、きれいな単一オブジェクト配列へ完全フラット化
function flattenRecords(input: any): any[] {
  if (!input) return [];
  if (Array.isArray(input)) {
    let result: any[] = [];
    for (const item of input) {
      result = result.concat(flattenRecords(item));
    }
    return result;
  }
  if (typeof input === 'string') {
    try {
      const parsed = JSON.parse(input);
      return flattenRecords(parsed);
    } catch {
      return [];
    }
  }
  if (typeof input === 'object' && input !== null && (input.id || input.user)) {
    return [input];
  }
  return [];
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const record = req.body;
    if (!record || !record.id) {
      return res.status(400).json({ error: '無効なデータ形式です' });
    }

    const { url: kvUrl, token: kvToken } = getKvCredentials();

    if (kvUrl && kvToken) {
      const getRes = await fetch(`${kvUrl}/get/nurse_submitted_records`, {
        headers: { Authorization: `Bearer ${kvToken}` },
      });
      const getJson = await getRes.json();
      let records: any[] = [];
      if (getJson && getJson.result) {
        records = flattenRecords(getJson.result);
      }

      // 重複上書き・追加
      const existsIdx = records.findIndex((r: any) => r.id === record.id);
      if (existsIdx >= 0) {
        records[existsIdx] = record;
      } else {
        records.unshift(record);
      }

      // ★ 二重エスケープを完全排除！純粋な JSON 配列としてクリアに保存！
      await fetch(`${kvUrl}/set/nurse_submitted_records`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${kvToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([JSON.stringify(records)]),
      });
    }

    return res.status(200).json({ success: true, recordId: record.id });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
