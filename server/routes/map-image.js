import { Router } from 'express';

const router = Router();

router.post('/', async (req, res) => {
  const { mapx, mapy } = req.body;
  if (!mapx || !mapy) return res.status(400).json({ error: 'mapx, mapy가 필요합니다.' });

  const lat = mapy / 1_000_000;
  const lng = mapx / 1_000_000;
  const url = `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=16&size=600x400&markers=${lat},${lng},red-pushpin`;

  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error(`OSM 응답 오류: ${response.status}`);
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    res.json({ base64, mediaType: 'image/png' });
  } catch (err) {
    console.error('[map-image]', err);
    res.status(502).json({ error: '지도 이미지를 가져오지 못했습니다.' });
  }
});

export default router;
