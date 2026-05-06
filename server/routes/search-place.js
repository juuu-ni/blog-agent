import { Router } from 'express';

const router = Router();

const NAVER_API_URL = 'https://openapi.naver.com/v1/search/local.json';

router.post('/', async (req, res) => {
  const { query } = req.body;

  if (!query || typeof query !== 'string' || !query.trim()) {
    return res.status(400).json({ error: '검색어(query)가 필요합니다.' });
  }

  const clientId = process.env.NAVER_CLIENT_ID;
  const clientSecret = process.env.NAVER_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: '네이버 API 키가 설정되지 않았습니다.' });
  }

  try {
    const url = `${NAVER_API_URL}?query=${encodeURIComponent(query.trim())}&display=5`;

    const response = await fetch(url, {
      headers: {
        'X-Naver-Client-Id': clientId,
        'X-Naver-Client-Secret': clientSecret,
      },
    });

    if (!response.ok) {
      const text = await response.text();
      console.error('[search-place] Naver API error:', response.status, text);
      return res.status(502).json({ error: '네이버 API 호출에 실패했습니다.' });
    }

    const data = await response.json();

    const places = data.items.map((item) => ({
      name: item.title.replace(/<[^>]+>/g, ''),
      category: item.category,
      address: item.roadAddress || item.address,
      telephone: item.telephone,
      mapx: item.mapx,
      mapy: item.mapy,
    }));

    res.json({ places });
  } catch (err) {
    console.error('[search-place]', err);
    res.status(500).json({ error: err.message || '알 수 없는 오류' });
  }
});

export default router;
