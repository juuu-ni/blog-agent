import { Router } from 'express';

const router = Router();

function latLngToTile(lat, lng, zoom) {
  const x = Math.floor((lng + 180) / 360 * 2 ** zoom);
  const latRad = lat * Math.PI / 180;
  const y = Math.floor(
    (1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2 * 2 ** zoom
  );
  return { x, y };
}

router.post('/', async (req, res) => {
  const { mapx, mapy } = req.body;
  if (!mapx || !mapy) return res.status(400).json({ error: 'mapx, mapy가 필요합니다.' });

  const lat = mapy / 1_000_000;
  const lng = mapx / 1_000_000;
  const zoom = 16;
  const { x, y } = latLngToTile(lat, lng, zoom);

  const url = `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'BlogAgent/1.0',
        'Referer': 'https://www.openstreetmap.org/',
      },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`OSM 타일 오류: ${response.status}`);
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    res.json({ base64, mediaType: 'image/png' });
  } catch (err) {
    console.error('[map-image]', err);
    res.status(502).json({ error: '지도 이미지를 가져오지 못했습니다.' });
  }
});

export default router;
