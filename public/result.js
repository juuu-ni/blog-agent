document.addEventListener('DOMContentLoaded', () => {
  const raw = sessionStorage.getItem('blogResult');
  if (!raw) {
    alert('생성된 글이 없습니다. 글 생성 페이지로 이동합니다.');
    window.location.href = '/generate';
    return;
  }

  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    alert('글 데이터를 불러오는 데 실패했습니다. 글 생성 페이지로 이동합니다.');
    window.location.href = '/generate';
    return;
  }

  if (!data || typeof data !== 'object') {
    alert('저장된 글 데이터가 없습니다. 글 생성 페이지로 이동합니다.');
    window.location.href = '/generate';
    return;
  }

  document.getElementById('result-topic').textContent = data.topic || '생성된 블로그 글';

  try {
    if (data.type === 'template') {
      renderTemplate(data);
    } else if (data.type === 'interleaved') {
      renderInterleaved(data.segments, data.images || []);
    } else {
      renderSingle(data.content);
    }
  } catch (err) {
    console.error('[result] 렌더링 오류:', err);
    document.getElementById('result-body').innerHTML =
      '<p style="color:var(--color-error,red);text-align:center;padding:2rem;">글을 표시하는 중 오류가 발생했습니다.</p>';
  }

  generateHashtags(data);
});

/* ===== 템플릿 렌더링 ===== */
function renderTemplate(data) {
  const td = data.templateData;
  if (!td) { renderSingle('[템플릿 데이터를 불러올 수 없습니다.]'); return; }
  const si = data.sectionImages || {};
  const body = document.getElementById('result-body');

  document.getElementById('result-topic').textContent = td.blogTitle || td.name || '맛집 리뷰';

  let html = '';

  // 헤더
  html += `
    <div class="tpl-result-header">
      ${td.tagLine ? `<div class="tpl-result-tag" data-tpl-field="tagLine">${escapeHtml(td.tagLine)}</div>` : ''}
      <div class="tpl-result-name" data-tpl-field="name">${escapeHtml(td.name)}</div>
      ${td.description ? `<div class="tpl-result-desc" data-tpl-field="description">${escapeHtml(td.description)}</div>` : ''}
    </div>
  `;

  // 기본 정보
  const infoRows = [
    td.location ? { icon: '📍', text: td.location, field: 'location' } : null,
    td.instagram ? { icon: '📷', text: td.instagram, field: 'instagram' } : null,
    td.phone ? { icon: '📞', text: td.phone, field: 'phone' } : null,
    td.hours ? { icon: '🕐', text: td.hours, field: 'hours' } : null,
  ].filter(Boolean);

  if (infoRows.length > 0) {
    html += `
      <div class="tpl-result-info card">
        ${infoRows.map(r => `
          <div class="tpl-info-row">
            <span class="tpl-info-icon">${r.icon}</span>
            <span class="tpl-info-text" data-tpl-field="${r.field}">${escapeHtml(r.text)}</span>
          </div>
        `).join('')}
      </div>
    `;
  }

  // 텍스트 섹션
  const textSections = [
    { icon: '🍽', title: '메뉴 & 가격', content: td.menuPricesContent, field: 'menuPricesContent' },
    { icon: '📍', title: '위치정보', content: td.locationInfoContent, field: 'locationInfoContent' },
    { icon: '⏳', title: '웨이팅', content: td.waitingContent, field: 'waitingContent' },
  ];
  textSections.forEach(({ icon, title, content, field }) => {
    if (!content) return;
    html += `
      <div class="tpl-result-section card">
        <div class="tpl-result-section-title">${icon} ${title}</div>
        <div class="tpl-result-content" data-tpl-field="${field}">${escapeHtml(content)}</div>
      </div>
    `;
  });

  // 사진 섹션 (인터리빙: 사진 1장 → 설명 → 사진 1장 → 설명 반복)
  const photoSections = [
    { key: 'exterior', icon: '🏠', title: '외부 모습' },
    { key: 'interior', icon: '🏪', title: '내부 모습' },
    { key: 'detail', icon: '🍽', title: '디테일 컷' },
  ];
  photoSections.forEach(({ key, icon, title }) => {
    const photos = si[key] || [];
    if (photos.length === 0) return;
    const blocks = photos.map((p, idx) => `
      <div class="tpl-interleave-block">
        ${p.dataUrl ? `<img src="${p.dataUrl}" alt="${escapeHtml(p.name || title)}" class="tpl-interleave-photo" />` : ''}
        ${p.description ? `<div class="tpl-result-content" data-tpl-field="photo-${key}-${idx}">${escapeHtml(p.description)}</div>` : ''}
      </div>
    `).join('');
    html += `
      <div class="tpl-result-section card">
        <div class="tpl-result-section-title">${icon} ${title}</div>
        ${blocks}
      </div>
    `;
  });

  // 총평
  if (td.reviewContent) {
    html += `
      <div class="tpl-result-section card">
        <div class="tpl-result-section-title">✨ 총평</div>
        <div class="tpl-result-content" data-tpl-field="reviewContent">${escapeHtml(td.reviewContent)}</div>
      </div>
    `;
  }

  // 메뉴 별점
  if (td.menuRatings?.length > 0) {
    const cards = td.menuRatings.map((m, idx) => {
      const filled = '★'.repeat(Math.max(0, Math.min(5, m.rating)));
      const empty = '☆'.repeat(5 - Math.max(0, Math.min(5, m.rating)));
      return `
        <div class="menu-rating-card">
          <div class="menu-rating-card-name" data-tpl-field="menu-${idx}-name">${escapeHtml(m.name)}</div>
          <div class="menu-rating-stars">${filled}${empty}</div>
          <div class="menu-rating-score">${m.rating} / 5</div>
          ${m.description ? `<div class="menu-rating-desc" data-tpl-field="menu-${idx}-desc">${escapeHtml(m.description)}</div>` : ''}
        </div>
      `;
    }).join('');

    html += `
      <div class="tpl-result-section card">
        <div class="tpl-result-section-title">⭐ 메뉴별 별점</div>
        <div class="menu-rating-cards">${cards}</div>
      </div>
    `;
  }

  body.innerHTML = html;
}

/* ===== 사진+글 인터리빙 렌더링 ===== */
function renderInterleaved(segments, images) {
  if (!Array.isArray(segments) || segments.length === 0) {
    renderSingle('[글 내용을 불러올 수 없습니다.]');
    return;
  }
  const body = document.getElementById('result-body');
  body.innerHTML = '';

  segments.forEach((text, i) => {
    const block = document.createElement('div');
    block.className = 'interleaved-block';

    if (images[i]?.dataUrl) {
      const img = document.createElement('img');
      img.src = images[i].dataUrl;
      img.alt = images[i].name || `사진 ${i + 1}`;
      img.className = 'interleaved-photo';
      block.appendChild(img);
    }

    const textEl = document.createElement('div');
    textEl.className = 'interleaved-text';
    textEl.textContent = text;
    block.appendChild(textEl);

    body.appendChild(block);
  });
}

/* ===== 단일 글 렌더링 ===== */
function renderSingle(content) {
  const body = document.getElementById('result-body');
  body.innerHTML = `
    <div class="card">
      <div class="result-content">${escapeHtml(content)}</div>
    </div>
  `;
}

function escapeHtml(str) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
}

/* ===== 전체 복사 ===== */
async function copyAll() {
  const data = JSON.parse(sessionStorage.getItem('blogResult'));
  let text = '';

  if (data.type === 'template') {
    const td = data.templateData;
    const parts = [];
    if (td.tagLine) parts.push(`[${td.tagLine}]`);
    if (td.name) parts.push(td.description ? `${td.name} : ${td.description}` : td.name);
    const infoLines = [
      td.location ? `📍 ${td.location}` : null,
      td.instagram ? `📷 ${td.instagram}` : null,
      td.phone ? `📞 ${td.phone}` : null,
      td.hours ? `🕐 ${td.hours}` : null,
    ].filter(Boolean);
    if (infoLines.length) parts.push('\n' + infoLines.join('\n'));
    if (td.menuPricesContent) parts.push(`\n🍽 메뉴 & 가격\n${td.menuPricesContent}`);
    if (td.locationInfoContent) parts.push(`\n📍 위치정보\n${td.locationInfoContent}`);
    if (td.waitingContent) parts.push(`\n⏳ 웨이팅\n${td.waitingContent}`);
    if (td.reviewContent) parts.push(`\n✨ 총평\n${td.reviewContent}`);
    if (td.menuRatings?.length) {
      parts.push('\n⭐ 메뉴별 별점');
      td.menuRatings.forEach(m => {
        const stars = '★'.repeat(m.rating) + '☆'.repeat(5 - m.rating);
        parts.push(`${m.name} ${stars} (${m.rating}/5)${m.description ? ` - ${m.description}` : ''}`);
      });
    }
    text = parts.join('\n');
  } else if (data.type === 'interleaved') {
    text = data.segments.join('\n\n');
  } else {
    text = data.content;
  }

  const btns = [document.querySelector('.result-actions .btn-primary'), document.getElementById('btn-copy-bottom')];

  try {
    await navigator.clipboard.writeText(text);
    btns.forEach(btn => {
      if (!btn) return;
      const original = btn.textContent;
      btn.textContent = '복사됨 ✓';
      btn.classList.add('copied');
      setTimeout(() => {
        btn.textContent = original;
        btn.classList.remove('copied');
      }, 2000);
    });
  } catch {
    alert('복사에 실패했습니다. 직접 텍스트를 선택해 복사해 주세요.');
  }
}

/* ===== 해시태그 생성 ===== */
async function generateHashtags(data) {
  let content = '';
  let topic = '';

  if (data.type === 'template') {
    const td = data.templateData;
    topic = td.name || '';
    content = [td.menuPricesContent, td.locationInfoContent, td.waitingContent, td.reviewContent]
      .filter(Boolean).join('\n\n');
  } else if (data.type === 'interleaved') {
    content = (data.segments || []).join('\n\n');
    topic = data.topic || '';
  } else {
    content = data.content || '';
    topic = data.topic || '';
  }

  if (!content && !topic) return;

  document.getElementById('hashtag-loading').style.display = 'block';

  try {
    const res = await fetch('/api/hashtags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: content.slice(0, 2000), topic }),
    });
    if (!res.ok) throw new Error('해시태그 생성 실패');
    const { hashtags } = await res.json();
    renderHashtags(hashtags);
  } catch {
    // 조용히 처리
  } finally {
    document.getElementById('hashtag-loading').style.display = 'none';
  }
}

function renderHashtags(hashtags) {
  if (!hashtags || hashtags.length === 0) return;
  const list = document.getElementById('hashtag-list');
  list.innerHTML = hashtags.map(tag =>
    `<span class="hashtag">${escapeHtml(tag)}</span>`
  ).join('');
  document.getElementById('hashtag-section').style.display = 'block';
}

async function copyHashtags() {
  const tags = Array.from(document.querySelectorAll('.hashtag')).map(el => el.textContent);
  const btn = document.getElementById('btn-copy-hashtags');
  try {
    await navigator.clipboard.writeText(tags.join(' '));
    btn.textContent = '복사됨 ✓';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = '복사'; btn.classList.remove('copied'); }, 2000);
  } catch {
    alert('복사에 실패했습니다.');
  }
}

/* ===== 이미지 dataUrl 제거 (DB 저장용) ===== */
function stripImagesFromContent(data) {
  const d = { ...data };
  if (d.sectionImages) {
    const si = {};
    for (const [k, imgs] of Object.entries(d.sectionImages)) {
      si[k] = (imgs || []).map(({ dataUrl, objectUrl, ...rest }) => rest);
    }
    d.sectionImages = si;
  }
  if (d.images) {
    d.images = (d.images || []).map(({ dataUrl, objectUrl, ...rest }) => rest);
  }
  return d;
}

/* ===== 저장 ===== */
async function savePost() {
  const data = JSON.parse(sessionStorage.getItem('blogResult'));
  if (!data) return;

  const btns = [document.getElementById('btn-save'), document.getElementById('btn-save-bottom')];

  const title = data.topic || (data.templateData?.blogTitle) || (data.templateData?.name) || '제목 없음';
  const storeName = data.templateData?.name || null;

  const hashtagEls = document.querySelectorAll('.hashtag');
  const hashtags = Array.from(hashtagEls).map(el => el.textContent);

  btns.forEach(btn => { if (btn) { btn.disabled = true; btn.textContent = '저장 중...'; } });

  try {
    const res = await fetch('/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, storeName, content: stripImagesFromContent(data), hashtags }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `서버 오류 (${res.status})`);
    }

    btns.forEach(btn => {
      if (!btn) return;
      btn.textContent = '저장됨 ✓';
      btn.classList.add('saved');
    });
  } catch (err) {
    alert(`저장 실패: ${err.message}`);
    btns.forEach(btn => { if (btn) { btn.disabled = false; btn.textContent = '저장'; } });
  }
}

/* ===== 인라인 편집 ===== */
let isEditing = false;

function toggleEditMode() {
  const raw = sessionStorage.getItem('blogResult');
  if (!raw) return;
  let data;
  try { data = JSON.parse(raw); } catch { return; }

  const editBtns = [document.getElementById('btn-edit'), document.getElementById('btn-edit-bottom')];

  if (!isEditing) {
    if (data.type === 'template') {
      document.querySelectorAll('[data-tpl-field]').forEach(el => { el.contentEditable = 'true'; });
    } else if (data.type === 'interleaved') {
      document.querySelectorAll('.interleaved-text').forEach(el => { el.contentEditable = 'true'; });
    } else {
      document.querySelectorAll('.result-content').forEach(el => { el.contentEditable = 'true'; });
    }
    editBtns.forEach(btn => { if (btn) { btn.textContent = '편집 완료'; btn.classList.add('editing'); } });
    isEditing = true;
  } else {
    if (data.type === 'template') {
      document.querySelectorAll('[data-tpl-field]').forEach(el => {
        const field = el.dataset.tplField;
        const val = el.innerText.trimEnd();
        if (['tagLine', 'name', 'description', 'location', 'instagram', 'phone', 'hours',
             'menuPricesContent', 'locationInfoContent', 'waitingContent', 'reviewContent'].includes(field)) {
          data.templateData[field] = val;
        } else if (field.startsWith('photo-')) {
          const parts = field.split('-');
          const sectionKey = parts[1];
          const idx = parseInt(parts[2], 10);
          if (data.sectionImages?.[sectionKey]?.[idx]) {
            data.sectionImages[sectionKey][idx].description = val;
          }
        } else if (field.startsWith('menu-')) {
          const parts = field.split('-');
          const idx = parseInt(parts[1], 10);
          const prop = parts[2];
          if (data.templateData.menuRatings?.[idx]) {
            if (prop === 'name') data.templateData.menuRatings[idx].name = val;
            if (prop === 'desc') data.templateData.menuRatings[idx].description = val;
          }
        }
      });
    } else if (data.type === 'interleaved') {
      document.querySelectorAll('.interleaved-text').forEach((el, i) => {
        if (Array.isArray(data.segments) && i < data.segments.length) {
          data.segments[i] = el.innerText.trimEnd();
        }
      });
    } else {
      const el = document.querySelector('.result-content');
      if (el) data.content = el.innerText.trimEnd();
    }

    sessionStorage.setItem('blogResult', JSON.stringify(data));
    document.querySelectorAll('[contenteditable="true"]').forEach(el => el.removeAttribute('contenteditable'));
    editBtns.forEach(btn => { if (btn) { btn.textContent = '편집'; btn.classList.remove('editing'); } });
    isEditing = false;
  }
}

