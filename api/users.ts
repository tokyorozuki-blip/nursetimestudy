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

  // GET: 全登録ユーザー情報の取得
  if (req.method === 'GET') {
    try {
      if (kvUrl && kvToken) {
        const getRes = await fetch(`${kvUrl}/get/nurse_registered_users`, {
          headers: { Authorization: `Bearer ${kvToken}` },
        });
        const getJson = await getRes.json();
        if (getJson.result) {
          const users = typeof getJson.result === 'string' ? JSON.parse(getJson.result) : getJson.result;
          return res.status(200).json(users);
        }
      }
      return res.status(200).json([]);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  // POST: ユーザー情報の登録・更新
  if (req.method === 'POST') {
    try {
      const newUser = req.body;
      if (!newUser || !newUser.staffId) {
        return res.status(400).json({ error: '無効なユーザープロ言データです' });
      }

      if (kvUrl && kvToken) {
        const getRes = await fetch(`${kvUrl}/get/nurse_registered_users`, {
          headers: { Authorization: `Bearer ${kvToken}` },
        });
        const getJson = await getRes.json();
        let users: any[] = [];
        if (getJson.result) {
          try {
            users = typeof getJson.result === 'string' ? JSON.parse(getJson.result) : getJson.result;
          } catch {
            users = [];
          }
        }

        const idx = users.findIndex((u: any) => u.staffId === newUser.staffId);
        if (idx >= 0) {
          users[idx] = newUser;
        } else {
          users.push(newUser);
        }

        await fetch(`${kvUrl}/set/nurse_registered_users`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${kvToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify([JSON.stringify(users)]),
        });
      }

      return res.status(200).json({ success: true, user: newUser });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
