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
        const getRes = await fetch(`${kvUrl}/get/nurse_registered_users`, {
          headers: { Authorization: `Bearer ${kvToken}` },
        });
        const getJson = await getRes.json();
        if (getJson && getJson.result) {
          const users = typeof getJson.result === 'string' ? JSON.parse(getJson.result) : getJson.result;
          const validUsers = Array.isArray(users)
            ? users.filter((u: any) => u && u.staffId && String(u.staffId).trim() !== '')
            : [];
          return res.status(200).json(validUsers);
        }
      }
      return res.status(200).json([]);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  if (req.method === 'POST') {
    try {
      const newUser = req.body;
      if (!newUser || !newUser.staffId) {
        return res.status(400).json({ error: '無効なユーザープロファイルです' });
      }

      if (kvUrl && kvToken) {
        const getRes = await fetch(`${kvUrl}/get/nurse_registered_users`, {
          headers: { Authorization: `Bearer ${kvToken}` },
        });
        const getJson = await getRes.json();
        let users: any[] = [];
        if (getJson && getJson.result) {
          try {
            users = typeof getJson.result === 'string' ? JSON.parse(getJson.result) : getJson.result;
            if (!Array.isArray(users)) users = [];
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

  if (req.method === 'DELETE') {
    try {
      const { staffId } = req.query;
      if (kvUrl && kvToken && staffId) {
        const getRes = await fetch(`${kvUrl}/get/nurse_registered_users`, {
          headers: { Authorization: `Bearer ${kvToken}` },
        });
        const getJson = await getRes.json();
        let users: any[] = [];
        if (getJson && getJson.result) {
          try {
            users = typeof getJson.result === 'string' ? JSON.parse(getJson.result) : getJson.result;
            if (!Array.isArray(users)) users = [];
          } catch {
            users = [];
          }
        }

        const filtered = users.filter((u: any) => u.staffId !== staffId);

        await fetch(`${kvUrl}/set/nurse_registered_users`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${kvToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify([JSON.stringify(filtered)]),
        });
      }
      return res.status(200).json({ success: true, message: `職員ID: ${staffId} を削除しました` });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
