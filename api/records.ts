import type { VercelRequest, VercelResponse } from '@vercel/node';

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

  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;

  // GET: 全蓄積データの取得
  if (req.method === 'GET') {
    try {
      if (kvUrl && kvToken) {
        const getRes = await fetch(`${kvUrl}/get/nurse_submitted_records`, {
          headers: { Authorization: `Bearer ${kvToken}` },
        });
        const getJson = await getRes.json();
        if (getJson.result) {
          const records = typeof getJson.result === 'string' ? JSON.parse(getJson.result) : getJson.result;
          return res.status(200).json(records);
        }
      }
      return res.status(200).json([]);
    } catch (error: any) {
      console.error('Vercel fetch records error:', error);
      return res.status(500).json({ error: error.message || 'データ取得エラー' });
    }
  }

  // DELETE: 全蓄積データまたは指定日の削除 (管理者用)
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
          if (getJson.result) {
            records = typeof getJson.result === 'string' ? JSON.parse(getJson.result) : getJson.result;
          }
          const filtered = records.filter((r: any) => r.user.targetDate !== targetDate);
          await fetch(`${kvUrl}/set/nurse_submitted_records`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${kvToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify([JSON.stringify(filtered)]),
          });
        } else {
          // 全件クリア
          await fetch(`${kvUrl}/del/nurse_submitted_records`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${kvToken}` },
          });
        }
      }
      return res.status(200).json({ success: true, message: '削除処理が完了しました' });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
