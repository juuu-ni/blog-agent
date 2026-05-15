import express from 'express';
import client, { MODEL } from '../lib/claude.js';

const router = express.Router();

router.post('/', async (req, res) => {
  const { topic, content, storeName, location } = req.body;

  if (!topic && !content && !storeName) {
    return res.status(400).json({ error: '내용이 필요합니다.' });
  }

  const hasStoreInfo = storeName || location;

  const prompt = hasStoreInfo
    ? `MZ 감성 블로그 제목을 딱 한 줄로 만들어줘.

형식: [가게위치 ~맛집] 가게이름 : 가게를 나타내는 매력적인 한 문장
예시: [홍대 맛집] 오르에르 : 줄 서도 후회 없는 크루아상 성지

가게 이름: ${storeName || ''}
위치: ${location || ''}${topic ? `\n주제: ${topic}` : ''}${content ? `\n글 내용 앞부분:\n${content.slice(0, 500)}` : ''}

제목만 한 줄 출력. 따옴표 없이.`
    : `MZ 감성 블로그 제목을 딱 한 줄로 만들어줘.

형식: [주제 키워드] : 매력적인 한 문장
예시: [카페 일상] : 오늘도 아메리카노 한 잔이 나를 살렸다

주제: ${topic || ''}
글 내용 앞부분:
${(content || '').slice(0, 500)}

제목만 한 줄 출력. 따옴표 없이.`;

  try {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 100,
      messages: [{ role: 'user', content: prompt }],
    });

    const title = message.content[0].text.trim().replace(/^["']|["']$/g, '');
    res.json({ title });
  } catch (err) {
    console.error('[suggest-title]', err.message);
    res.status(500).json({ error: '제목 추천 실패' });
  }
});

export default router;
