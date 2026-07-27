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

// 二重エスケープ・配列ネストを再帰解凍するヘルパー
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

  const { url: kvUrl, token: kvToken } = getKvCredentials();

  if (req.method === 'GET') {
    try {
      if (kvUrl && kvToken) {
        const getRes = await fetch(`${kvUrl}/get/nurse_submitted_records`, {
          headers: { Authorization: `Bearer ${kvToken}` },
        });
        const getJson = await getRes.json();
        if (getJson && getJson.result) {
          const cleanRecords = recursivelyParseRecords(getJson.result);
          return res.status(200).json(cleanRecords);
        }
      }
      return res.status(200).json([]);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { targetDate } = req.query;
      if (kvUrl && kvToken) {
        if (targetDate) {
          const getRes = await fetch(`${kvUrl}/get/nurse_submitted_records`, {
            headers: { Authorization: `Bearer ${kvToken}` },
          });
          const getJson = await getRes.json();
          let records = [];
          if (getJson && getJson.result) {
            records = recursivelyParseRecords(getJson.result);
          }
          const filtered = records.filter((r: any) => r.user?.targetDate !== targetDate);
          await fetch(`${kvUrl}/set/nurse_submitted_records`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${kvToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify([JSON.stringify(filtered)]),
          });
        } else {
          await fetch(`${kvUrl}/del/nurse_submitted_records`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${kvToken}` },
          });
        }
      }
      return res.status(200).json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
