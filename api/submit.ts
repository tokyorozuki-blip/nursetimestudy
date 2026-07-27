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

function recursivelyParseRecords(data: any): any[] {
  if (!data) return [];
  if (Array.isArray(data)) {
    let result: any[] = [];
    for (const item of data) {
      result = result.concat(recursivelyParseRecords(item));
    }
    return result;
  }
  if (typeof data === 'string') {
    try {
      const parsed = JSON.parse(data);
      return recursivelyParseRecords(parsed);
    } catch {
      return [];
    }
  }
  if (typeof data === 'object' && data.id && data.user) {
    return [data];
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
        records = recursivelyParseRecords(getJson.result);
      }

      // 重複チェック（IDまたは同一ユーザー同一日同一時間）
      const existsIndex = records.findIndex((r: any) => r.id === record.id);
      if (existsIndex >= 0) {
        records[existsIndex] = record;
      } else {
        records.unshift(record);
      }

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
