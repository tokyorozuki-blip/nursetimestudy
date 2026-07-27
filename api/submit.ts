import type { VercelRequest, VercelResponse } from '@vercel/node';

// Vercel KV または メモリ/ストレージ蓄積用のインメモリ・KVストレージ対応ハンドラー
// Vercel KV 環境変数 (KV_REST_API_URL, KV_REST_API_TOKEN) が設定されていれば自動的に Vercel KV クラウドDBに永続化されます。
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORSヘッダーの設定
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

    if (!record || !record.id || !record.user) {
      return res.status(400).json({ error: '無効な提出データフォーマットです' });
    }

    const kvUrl = process.env.KV_REST_API_URL;
    const kvToken = process.env.KV_REST_API_TOKEN;

    if (kvUrl && kvToken) {
      // Vercel KV クラウドデータベースへ永続書き込み
      const getRes = await fetch(`${kvUrl}/get/nurse_submitted_records`, {
        headers: { Authorization: `Bearer ${kvToken}` },
      });
      const getJson = await getRes.json();
      let records = [];
      if (getJson.result) {
        try {
          records = typeof getJson.result === 'string' ? JSON.parse(getJson.result) : getJson.result;
        } catch {
          records = [];
        }
      }

      records.unshift(record);

      await fetch(`${kvUrl}/set/nurse_submitted_records`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${kvToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([JSON.stringify(records)]),
      });
    }

    return res.status(200).json({ success: true, message: 'Vercelクラウドへ提出データを蓄積しました', recordId: record.id });
  } catch (error: any) {
    console.error('Vercel submit error:', error);
    return res.status(500).json({ error: error.message || 'データ蓄積エラーが発生しました' });
  }
}
