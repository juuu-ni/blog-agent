import { Router } from 'express';
import client, { MODEL } from '../lib/claude.js';

const router = Router();

router.post('/', async (req, res) => {
  const { samples } = req.body;

  if (!Array.isArray(samples) || samples.length === 0) {
    return res.status(400).json({ error: '샘플 배열이 필요합니다.' });
  }

  const validSamples = samples.map(s => String(s).trim()).filter(Boolean);
  if (validSamples.length === 0) {
    return res.status(400).json({ error: '유효한 샘플이 없습니다.' });
  }

  const samplesText = validSamples
    .map((s, i) => `[샘플 ${i + 1}]\n${s}`)
    .join('\n\n');

  try {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: `당신은 한국어 글쓰기 스타일 분석 전문가입니다.
주어진 블로그 글 샘플들을 분석하고, 반드시 아래 JSON 형식으로만 응답하세요.
다른 텍스트, 설명, 마크다운 코드블록 없이 JSON 객체만 출력하세요.

{
  "tone": "전반적인 어조와 분위기 (예: 친근하고 캐주얼함)",
  "sentenceLength": "문장 길이 특성 (예: 짧은 문장 선호, 평균 15자 내외)",
  "endings": ["자주 쓰는 문장 어미 1", "어미 2", "어미 3"],
  "vocabulary": ["자주 쓰는 표현이나 단어 1", "표현 2", "표현 3"],
  "paragraphStyle": "단락 구성 방식 (예: 짧은 단락, 줄바꿈 자주 사용)",
  "uniqueTraits": ["특이한 말투 습관 1", "습관 2"]
}`,
      messages: [
        {
          role: 'user',
          content: `다음 블로그 글 샘플들을 분석해 주세요:\n\n${samplesText}`,
        },
      ],
    });

    const raw = message.content[0].text.trim();

    let profile;
    try {
      profile = JSON.parse(raw);
    } catch {
      // JSON 블록이 포함된 경우 추출 시도
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) {
        return res.status(502).json({ error: 'Claude 응답 파싱에 실패했습니다.' });
      }
      profile = JSON.parse(match[0]);
    }

    res.json(profile);
  } catch (err) {
    console.error('[analyze]', err);
    const message = err?.error?.message || err?.message || '알 수 없는 오류';
    res.status(500).json({ error: message });
  }
});

export default router;
