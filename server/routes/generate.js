import { Router } from 'express';
import client, { MODEL } from '../lib/claude.js';

const router = Router();

const SUPPORTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

function filterImages(images) {
  return Array.isArray(images)
    ? images.filter(img => img && SUPPORTED_TYPES.includes(img?.mediaType))
    : [];
}

router.post('/', async (req, res) => {
  const { topic, mustInclude, profile, images, place, templateMode, templateData, sectionImages } = req.body;

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

  try {
    /* ── 템플릿 모드 ── */
    if (templateMode) {
      if (!templateData?.name) {
        return res.status(400).json({ error: '가게명이 필요합니다.' });
      }

      const sExt = filterImages(sectionImages?.exterior);
      const sInt = filterImages(sectionImages?.interior);
      const sDet = filterImages(sectionImages?.detail);

      const memoLines = [
        templateData.menuPrices ? `메뉴&가격: ${templateData.menuPrices}` : null,
      ].filter(Boolean).join('\n');

      const menuHint = Array.isArray(templateData.menuRatings) && templateData.menuRatings.length > 0
        ? templateData.menuRatings.map(m => `${m.name} (${m.rating}점)`).join(', ')
        : '';

      const photoInfo = [
        sExt.length ? `외부 사진 ${sExt.length}장` : null,
        sInt.length ? `내부 사진 ${sInt.length}장` : null,
        sDet.length ? `디테일 컷 ${sDet.length}장` : null,
      ].filter(Boolean).join(', ');

      const infoLines = [
        `가게명: ${templateData.name}`,
        templateData.location ? `위치: ${templateData.location}` : null,
        templateData.phone ? `전화번호: ${templateData.phone}` : null,
        templateData.hours ? `영업시간: ${templateData.hours}` : null,
        templateData.instagram ? `인스타그램: ${templateData.instagram}` : null,
      ].filter(Boolean).join('\n');

      const mustIncludeSection = templateData.mustInclude
        ? `\n[꼭 들어갈 내용]\n${templateData.mustInclude}\n- 위 내용을 글 전체에 자연스럽게 반드시 포함하세요`
        : '';

      const photoOrder = [
        sExt.length ? `외부 사진 ${sExt.length}장 (1번~${sExt.length}번)` : null,
        sInt.length ? `내부 사진 ${sInt.length}장 (${sExt.length + 1}번~${sExt.length + sInt.length}번)` : null,
        sDet.length ? `디테일 컷 ${sDet.length}장 (${sExt.length + sInt.length + 1}번~${sExt.length + sInt.length + sDet.length}번)` : null,
      ].filter(Boolean).join(', ');

      const prompt = `맛집 리뷰 블로그의 각 섹션을 아래 말투 프로파일에 맞춰 작성해주세요.

[말투 프로파일]
${profileText}

[가게 기본 정보]
${infoLines}
${memoLines ? `\n[사용자 메모]\n${memoLines}` : ''}${menuHint ? `\n\n[메뉴 목록]\n${menuHint}` : ''}${photoOrder ? `\n\n[첨부 사진 순서]\n${photoOrder}` : ''}${mustIncludeSection}

규칙:
- 말투 프로파일의 어조·어미·표현을 그대로 사용하세요
- 각 섹션은 2~4문장으로 자연스럽게 작성하세요
- photoDescriptions의 각 설명은 해당 사진을 직접 보고 2~4문장으로 작성하세요
- 마크다운 없이 순수 텍스트만 사용하세요
- menuRatings의 description이 비어있으면 AI가 메뉴 특성에 맞게 채워주세요
- 반드시 아래 JSON 형식으로만 응답하세요:

{
  "description": "가게 한줄 설명 (20자 이내)",
  "menuPricesContent": "메뉴&가격 섹션 내용",
  "locationInfoContent": "위치정보 섹션 내용",
  "waitingContent": "웨이팅 섹션 내용",
  "reviewContent": "총평 섹션 내용",
  "menuRatings": [{"name": "메뉴명", "rating": 별점숫자, "description": "메뉴 한줄 평"}],
  "photoDescriptions": {
    "exterior": ["외부 사진1 설명 2~4문장", "외부 사진2 설명 2~4문장"],
    "interior": ["내부 사진1 설명 2~4문장"],
    "detail": ["디테일 사진1 설명 2~4문장", "디테일 사진2 설명 2~4문장"]
  }
}`;

      const allImageBlocks = [...sExt, ...sInt, ...sDet].map(img => ({
        type: 'image',
        source: { type: 'base64', media_type: img.mediaType, data: img.data },
      }));

      const message = await client.messages.create({
        model: MODEL,
        max_tokens: 3000,
        system: '당신은 사용자의 말투를 완벽하게 모방하는 블로그 작가입니다. 요청한 JSON 형식을 정확히 지켜 응답하세요.',
        messages: [{ role: 'user', content: [...allImageBlocks, { type: 'text', text: prompt }] }],
      });

      const raw = message.content[0].text.trim();
      let generated;
      try {
        generated = JSON.parse(raw);
      } catch {
        const match = raw.match(/\{[\s\S]*\}/);
        if (!match) throw new Error('템플릿 응답 파싱 실패');
        generated = JSON.parse(match[0]);
      }

      const emptyPhotoDescs = { exterior: [], interior: [], detail: [] };

      return res.json({
        type: 'template',
        topic: templateData.blogTitle || templateData.name,
        templateData: {
          ...templateData,
          description: generated.description ?? '',
          menuPricesContent: generated.menuPricesContent ?? '',
          locationInfoContent: generated.locationInfoContent ?? '',
          waitingContent: generated.waitingContent ?? '',
          reviewContent: generated.reviewContent ?? '',
          menuRatings: generated.menuRatings?.length
            ? generated.menuRatings
            : (templateData.menuRatings ?? []),
        },
        photoDescriptions: generated.photoDescriptions ?? emptyPhotoDescs,
      });
    }

    /* ── 일반 모드 ── */
    if (!topic || typeof topic !== 'string' || !topic.trim()) {
      return res.status(400).json({ error: '주제(topic)가 필요합니다.' });
    }

    const placeText = place
      ? [
          `\n[가게 정보]`,
          `가게명: ${place.name}`,
          place.category ? `카테고리: ${place.category}` : null,
          place.address ? `주소: ${place.address}` : null,
          place.telephone ? `전화번호: ${place.telephone}` : null,
          `- 위 가게 정보를 글에 자연스럽게 녹여서 작성하세요`,
        ].filter(Boolean).join('\n')
      : '';

    const validImages = filterImages(images);
    const hasImages = validImages.length > 0;

    if (hasImages) {
      const mustIncludeSection = mustInclude
        ? `\n[꼭 들어갈 내용]\n${mustInclude}\n- 위 내용을 글 전체에 자연스럽게 반드시 포함하세요`
        : '';

      const textPrompt = `사진이 ${validImages.length}장 있습니다. 각 사진에 해당하는 블로그 글 섹션을 순서대로 작성해 주세요.

[말투 프로파일]
${profileText}

[주제]
${topic.trim()}
${placeText}
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
          content: `[말투 프로파일]\n${profileText}\n\n[주제]\n${topic.trim()}${placeText ? `\n\n${placeText}` : ''}${mustInclude ? `\n\n[꼭 들어갈 내용]\n${mustInclude}\n위 내용을 글에 자연스럽게 반드시 포함해줘.` : ''}\n\n위 말투로 이 주제에 대한 블로그 글을 써줘.`,
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
