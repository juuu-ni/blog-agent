import { Router } from 'express';
import client, { MODEL } from '../lib/claude.js';

const router = Router();

const SUPPORTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

router.post('/', async (req, res) => {
  const { topic, mustInclude, profile, images } = req.body;

  if (!topic || typeof topic !== 'string' || !topic.trim()) {
    return res.status(400).json({ error: '주제(topic)가 필요합니다.' });
  }
  if (!profile || typeof profile !== 'object') {
    return res.status(400).json({ error: '스타일 프로파일(profile)이 필요합니다.' });
  }

  const profileText = [
    `어조: ${profile.tone ?? '정보 없음'}`,
    `문장 길이: ${profile.sentenceLength ?? '정보 없음'}`,
    `자주 쓰는 어미: ${Array.isArray(profile.endings) ? profile.endings.join(', ') : '정보 없음'}`,
    `자주 쓰는 표현: ${Array.isArray(profile.vocabulary) ? profile.vocabulary.join(', ') : '정보 없음'}`,
    `단락 스타일: ${profile.paragraphStyle ?? '정보 없음'}`,
    `특이 습관: ${Array.isArray(profile.uniqueTraits) ? profile.uniqueTraits.join(', ') : '정보 없음'}`,
  ].join('\n');

  const validImages = Array.isArray(images)
    ? images.filter(img => SUPPORTED_TYPES.includes(img.mediaType))
    : [];
  const hasImages = validImages.length > 0;

  try {
    if (hasImages) {
      // 사진별 글 섹션을 JSON 배열로 생성
      const mustIncludeSection = mustInclude
    ? `\n[꼭 들어갈 내용]\n${mustInclude}\n- 위 내용을 글 전체에 자연스럽게 반드시 포함하세요`
    : '';

  const textPrompt = `사진이 ${validImages.length}장 있습니다. 각 사진에 해당하는 블로그 글 섹션을 순서대로 작성해 주세요.

[말투 프로파일]
${profileText}

[주제]
${topic.trim()}
${mustIncludeSection}

규칙:
- 각 섹션은 해당 사진의 장소, 음식, 분위기, 특징적 요소를 자연스럽게 담아야 합니다
- 말투 프로파일의 어조, 어미, 표현을 그대로 사용하세요
- 각 섹션은 2~4 문단으로 작성하세요
- 마크다운 없이 순수 텍스트로만 작성하세요
- 반드시 아래 형식의 JSON 배열만 출력하세요 (설명 없이):
["사진 1에 대한 글 섹션", "사진 2에 대한 글 섹션", ...]`;

      const userContent = [
        ...validImages.map(img => ({
          type: 'image',
          source: { type: 'base64', media_type: img.mediaType, data: img.data },
        })),
        { type: 'text', text: textPrompt },
      ];

      const message = await client.messages.create({
        model: MODEL,
        max_tokens: 4096,
        system: `당신은 사용자의 글쓰기 말투를 완벽하게 모방하는 블로그 작가입니다. 요청한 형식을 정확히 지켜 응답하세요.`,
        messages: [{ role: 'user', content: userContent }],
      });

      const raw = message.content[0].text.trim();
      let segments;
      try {
        segments = JSON.parse(raw);
      } catch {
        const match = raw.match(/\[[\s\S]*\]/);
        if (!match) throw new Error('응답 파싱 실패');
        segments = JSON.parse(match[0]);
      }

      return res.json({ type: 'interleaved', segments });
    }

    // 사진 없음: 기존 단일 글 생성
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: `당신은 사용자의 글쓰기 말투를 완벽하게 모방하는 블로그 작가입니다.
아래 말투 프로파일을 철저히 따라 블로그 글을 작성하세요.

규칙:
- 프로파일의 어조, 어미, 표현, 단락 스타일을 그대로 사용하세요
- 설명이나 전문 용어 없이 자연스러운 블로그 글만 출력하세요
- 제목 없이 본문만 작성하세요
- 마크다운 문법은 사용하지 마세요`,
      messages: [
        {
          role: 'user',
          content: `[말투 프로파일]\n${profileText}\n\n[주제]\n${topic.trim()}${mustInclude ? `\n\n[꼭 들어갈 내용]\n${mustInclude}\n위 내용을 글에 자연스럽게 반드시 포함해줘.` : ''}\n\n위 말투로 이 주제에 대한 블로그 글을 써줘.`,
        },
      ],
    });

    const content = message.content[0].text.trim();
    return res.json({ type: 'single', content });
  } catch (err) {
    console.error('[generate]', err);
    const message = err?.error?.message || err?.message || '알 수 없는 오류';
    res.status(500).json({ error: message });
  }
});

export default router;
