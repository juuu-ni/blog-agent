import { Router } from 'express';
import client, { MODEL } from '../lib/claude.js';

const router = Router();

router.post('/', async (req, res) => {
  const { content, topic } = req.body;
  if (!content && !topic) {
    return res.status(400).json({ error: '콘텐츠가 필요합니다.' });
  }

  try {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: `다음 블로그 글을 보고 네이버 블로그 스타일 해시태그를 5~10개 추출해줘.

규칙:
- 글의 핵심 주제, 장소, 음식, 활동, 감정을 반영하세요
- 네이버 블로그에서 실제로 쓰이는 자연스러운 한국어 태그
- #태그 형식으로만 출력, 다른 설명 없이
- 예시: #카페투어 #서울카페 #분위기좋은곳 #커피스타그램

글:
${content || topic}`,
      }],
    });

    const raw = message.content[0].text.trim();
    const hashtags = raw.match(/#[^\s#,]+/g) || [];
    return res.json({ hashtags });
  } catch (err) {
    console.error('[hashtags]', err);
    res.status(500).json({ error: err?.error?.message || err?.message || '오류' });
  }
});

export default router;
