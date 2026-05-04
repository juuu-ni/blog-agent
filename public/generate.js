/* ===== 상태 ===== */
let styleProfile = null;
let uploadedImages = []; // 일반 모드 사진
let selectedPlace = null;
let _placeResults = [];

// 템플릿 모드
let isTemplateMode = false;
let sectionImages = { exterior: [], interior: [], detail: [] };
let menuRatings = [];

/* ===== 초기화 ===== */
document.addEventListener('DOMContentLoaded', () => {
  const stored = localStorage.getItem('styleProfile');
  if (!stored) {
    alert('말투 프로파일이 없습니다. 먼저 분석을 완료해 주세요.');
    window.location.href = '/';
    return;
  }

  styleProfile = JSON.parse(stored);
  renderProfileSummary(styleProfile);

  document.getElementById('topic-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') generatePost();
  });

  document.getElementById('place-input').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') searchPlace();
  });

  document.getElementById('photo-input').addEventListener('change', (e) => {
    handleImageUpload(e.target.files);
    e.target.value = '';
  });

  ['exterior', 'interior', 'detail'].forEach(section => {
    document.getElementById(`photo-${section}`).addEventListener('change', (e) => {
      handleSectionImageUpload(section, e.target.files);
      e.target.value = '';
    });
  });

  renderMenuRatings();
  document.getElementById('topic-input').focus();
});

/* ===== 프로파일 렌더링 ===== */
function renderProfileSummary(profile) {
  const grid = document.getElementById('profile-grid');
  grid.innerHTML = '';

  const items = [
    { label: '어조', value: profile.tone, type: 'text' },
    { label: '문장 길이', value: profile.sentenceLength, type: 'text' },
    { label: '단락 스타일', value: profile.paragraphStyle, type: 'text' },
    { label: '자주 쓰는 어미', value: profile.endings, type: 'chips' },
    { label: '자주 쓰는 표현', value: profile.vocabulary, type: 'chips' },
    { label: '특이 습관', value: profile.uniqueTraits, type: 'chips' },
  ];

  items.forEach(({ label, value, type }) => {
    if (!value || (Array.isArray(value) && value.length === 0)) return;

    const el = document.createElement('div');
    el.className = 'profile-item';

    if (type === 'chips' && Array.isArray(value)) {
      el.innerHTML = `
        <div class="profile-item-label">${label}</div>
        <div class="chip-list">${value.map(v => `<span class="chip">${v}</span>`).join('')}</div>
      `;
    } else {
      el.innerHTML = `
        <div class="profile-item-label">${label}</div>
        <div class="profile-item-value">${value}</div>
      `;
    }
    grid.appendChild(el);
  });
}

/* ===== 가게 검색 ===== */
async function searchPlace() {
  const query = document.getElementById('place-input').value.trim();
  if (!query) {
    alert('가게 이름을 입력해 주세요.');
    document.getElementById('place-input').focus();
    return;
  }

  const btn = document.getElementById('btn-search-place');
  btn.disabled = true;
  btn.textContent = '검색 중...';

  const resultsEl = document.getElementById('place-search-results');
  const selectedEl = document.getElementById('place-selected');

  try {
    const res = await fetch('/api/search-place', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `서버 오류 (${res.status})`);
    }

    const { places } = await res.json();
    _placeResults = places;

    selectedEl.style.display = 'none';
    selectedPlace = null;

    resultsEl.style.display = 'block';

    if (places.length === 0) {
      resultsEl.innerHTML = '<p class="place-no-results">검색 결과가 없습니다.</p>';
      return;
    }

    resultsEl.innerHTML = places.map((p, i) => `
      <div class="place-result-item" onclick="selectPlace(${i})">
        <div class="place-result-name">${escapeHtml(p.name)}</div>
        <div class="place-result-meta">
          ${p.category ? `<span>${escapeHtml(p.category)}</span>` : ''}
          ${p.address ? `<span>${escapeHtml(p.address)}</span>` : ''}
          ${p.telephone ? `<span>${escapeHtml(p.telephone)}</span>` : ''}
        </div>
      </div>
    `).join('');
  } catch (err) {
    alert(`검색 실패: ${err.message}`);
  } finally {
    btn.disabled = false;
    btn.textContent = '검색';
  }
}

function selectPlace(index) {
  const place = _placeResults[index];
  selectedPlace = place;

  document.getElementById('place-search-results').style.display = 'none';

  const meta = [place.category, place.address, place.telephone].filter(Boolean).map(escapeHtml).join(' · ');
  const selectedEl = document.getElementById('place-selected');
  selectedEl.style.display = 'block';
  selectedEl.innerHTML = `
    <div class="place-selected-header">
      <span class="place-selected-icon">📍</span>
      <div class="place-selected-body">
        <div class="place-selected-name">${escapeHtml(place.name)}</div>
        ${meta ? `<div class="place-selected-detail">${meta}</div>` : ''}
      </div>
      <button class="btn-remove" onclick="clearPlace()" title="선택 해제">✕</button>
    </div>
  `;

  if (isTemplateMode) applyPlaceToTemplate(place);
}

function clearPlace() {
  selectedPlace = null;
  document.getElementById('place-selected').style.display = 'none';
  document.getElementById('place-input').value = '';
}

/* ===== 템플릿 모드 토글 ===== */
function toggleTemplateMode() {
  isTemplateMode = document.getElementById('template-toggle').checked;
  document.getElementById('mode-normal').style.display = isTemplateMode ? 'none' : 'block';
  document.getElementById('mode-template').style.display = isTemplateMode ? 'block' : 'none';

  if (isTemplateMode && selectedPlace) applyPlaceToTemplate(selectedPlace);
}

function applyPlaceToTemplate(place) {
  if (!place) return;
  document.getElementById('tpl-name').value = place.name || '';
  document.getElementById('tpl-location').value = place.address || '';
  document.getElementById('tpl-phone').value = place.telephone || '';
  // 영업시간은 Naver API에서 제공하지 않으므로 건드리지 않음
}

/* ===== 섹션별 사진 업로드 ===== */
async function handleSectionImageUpload(section, files) {
  for (const file of Array.from(files)) {
    if (!SUPPORTED_TYPES.includes(file.type)) {
      alert(`${file.name}: 지원하지 않는 형식입니다. (JPEG, PNG, GIF, WebP만 가능)`);
      continue;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      alert(`${file.name}: 파일 크기가 ${MAX_SIZE_MB}MB를 초과합니다.`);
      continue;
    }
    const { base64, dataUrl } = await readFile(file);
    sectionImages[section].push({
      data: base64,
      dataUrl,
      mediaType: file.type,
      name: file.name,
      objectUrl: URL.createObjectURL(file),
    });
  }
  renderSectionPreviews(section);
}

function removeSectionImage(section, index) {
  URL.revokeObjectURL(sectionImages[section][index].objectUrl);
  sectionImages[section].splice(index, 1);
  renderSectionPreviews(section);
}

function renderSectionPreviews(section) {
  const grid = document.getElementById(`preview-${section}`);
  const drop = document.getElementById(`drop-${section}`);
  const imgs = sectionImages[section];

  grid.innerHTML = '';

  if (imgs.length === 0) {
    drop.classList.remove('has-images');
    return;
  }

  drop.classList.add('has-images');
  imgs.forEach((img, i) => {
    const item = document.createElement('div');
    item.className = 'photo-preview-item';
    item.innerHTML = `
      <img src="${img.objectUrl}" alt="${img.name}" />
      <button class="photo-remove-btn" onclick="removeSectionImage('${section}', ${i})" title="삭제">✕</button>
    `;
    grid.appendChild(item);
  });
}

/* ===== 메뉴 별점 ===== */
function addMenuRating() {
  menuRatings.push({ name: '', rating: 5, description: '' });
  renderMenuRatings();
}

function removeMenuRating(index) {
  menuRatings.splice(index, 1);
  renderMenuRatings();
}

function setStarRating(index, val) {
  menuRatings[index].rating = val;
  renderMenuRatings();
}

function renderMenuRatings() {
  const list = document.getElementById('menu-ratings-list');
  if (menuRatings.length === 0) {
    list.innerHTML = '<p class="tpl-empty-hint">메뉴 추가 버튼으로 메뉴별 별점을 입력하세요</p>';
    return;
  }

  list.innerHTML = menuRatings.map((m, i) => `
    <div class="menu-rating-row">
      <input
        type="text"
        class="text-input"
        placeholder="메뉴명"
        value="${escapeAttr(m.name)}"
        oninput="menuRatings[${i}].name = this.value"
      />
      <div class="star-input">
        ${[1, 2, 3, 4, 5].map(v => `
          <button class="star-btn ${v <= m.rating ? 'active' : ''}" onclick="setStarRating(${i}, ${v})">★</button>
        `).join('')}
      </div>
      <input
        type="text"
        class="text-input"
        placeholder="한줄 평 (비워두면 AI가 작성)"
        value="${escapeAttr(m.description)}"
        oninput="menuRatings[${i}].description = this.value"
      />
      <button class="btn-remove" onclick="removeMenuRating(${i})">✕</button>
    </div>
  `).join('');
}

function escapeAttr(str) {
  return (str || '').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function escapeHtml(str) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ===== 일반 사진 업로드 ===== */
const SUPPORTED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_SIZE_MB = 10;

async function handleImageUpload(files) {
  for (const file of Array.from(files)) {
    if (!SUPPORTED_TYPES.includes(file.type)) {
      alert(`${file.name}: 지원하지 않는 형식입니다. (JPEG, PNG, GIF, WebP만 가능)`);
      continue;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      alert(`${file.name}: 파일 크기가 ${MAX_SIZE_MB}MB를 초과합니다.`);
      continue;
    }

    const { base64, dataUrl } = await readFile(file);
    uploadedImages.push({
      data: base64,
      dataUrl,
      mediaType: file.type,
      name: file.name,
      objectUrl: URL.createObjectURL(file),
    });
  }

  renderPreviews();
}

function compressDataUrl(dataUrl, maxWidth = 1024, quality = 0.7) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const ratio = Math.min(1, maxWidth / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * ratio);
      canvas.height = Math.round(img.height * ratio);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

function readFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      const base64 = dataUrl.split(',')[1];
      resolve({ base64, dataUrl });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function removeImage(index) {
  URL.revokeObjectURL(uploadedImages[index].objectUrl);
  uploadedImages.splice(index, 1);
  renderPreviews();
}

function renderPreviews() {
  const grid = document.getElementById('photo-preview-grid');
  const dropZone = document.getElementById('photo-drop-zone');

  grid.innerHTML = '';

  if (uploadedImages.length === 0) {
    dropZone.classList.remove('has-images');
    return;
  }

  dropZone.classList.add('has-images');

  uploadedImages.forEach((img, i) => {
    const item = document.createElement('div');
    item.className = 'photo-preview-item';
    item.innerHTML = `
      <img src="${img.objectUrl}" alt="${img.name}" />
      <button class="photo-remove-btn" onclick="removeImage(${i})" title="삭제">✕</button>
    `;
    grid.appendChild(item);
  });
}

/* ===== 글 생성 (진입점) ===== */
async function generatePost() {
  if (isTemplateMode) {
    return generateTemplatePost();
  }

  const topic = document.getElementById('topic-input').value.trim();
  const mustInclude = document.getElementById('must-include-input').value.trim();

  if (!topic) {
    alert('주제를 입력해 주세요.');
    document.getElementById('topic-input').focus();
    return;
  }

  const btn = document.getElementById('btn-generate');
  const loading = document.getElementById('loading-generate');
  const loadingText = document.getElementById('loading-text');

  btn.disabled = true;
  btn.textContent = '생성 중...';
  loading.style.display = 'flex';
  loadingText.textContent = uploadedImages.length > 0
    ? `사진 ${uploadedImages.length}장을 분석하고 있어요...`
    : '글을 쓰고 있어요...';

  try {
    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic,
        mustInclude: mustInclude || null,
        profile: styleProfile,
        images: uploadedImages.map(({ data, mediaType }) => ({ data, mediaType })),
        place: selectedPlace || null,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `서버 오류 (${res.status})`);
    }

    const result = await res.json();

    const compressedImages = await Promise.all(
      uploadedImages.map(async ({ dataUrl, name }) => ({
        dataUrl: await compressDataUrl(dataUrl),
        name,
      }))
    );

    sessionStorage.setItem('blogResult', JSON.stringify({
      ...result,
      topic,
      images: compressedImages,
    }));

    window.location.href = '/result';
  } catch (err) {
    alert(`글 생성 실패: ${err.message}`);
    btn.disabled = false;
    btn.textContent = '글 생성';
    loading.style.display = 'none';
  }
}

/* ===== 템플릿 글 생성 ===== */
async function generateTemplatePost() {
  const name = document.getElementById('tpl-name').value.trim();
  if (!name) {
    alert('가게 이름을 입력해 주세요.');
    document.getElementById('tpl-name').focus();
    return;
  }

  const btn = document.getElementById('btn-generate-tpl');
  const loading = document.getElementById('loading-generate');
  const loadingText = document.getElementById('loading-text');

  btn.disabled = true;
  btn.textContent = '생성 중...';
  loading.style.display = 'flex';
  loadingText.textContent = '맛집 리뷰를 작성하고 있어요...';

  try {
    const templateData = {
      blogTitle: document.getElementById('tpl-blog-title').value.trim(),
      name,
      location: document.getElementById('tpl-location').value.trim(),
      instagram: document.getElementById('tpl-instagram').value.trim(),
      phone: document.getElementById('tpl-phone').value.trim(),
      hours: document.getElementById('tpl-hours').value.trim(),
      menuPrices: document.getElementById('tpl-menu-prices').value.trim(),
      mustInclude: document.getElementById('tpl-must-include').value.trim(),
      menuRatings: menuRatings.filter(m => m.name.trim()),
    };

    const res = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profile: styleProfile,
        templateMode: true,
        templateData,
        sectionImages: {
          exterior: sectionImages.exterior.map(({ data, mediaType }) => ({ data, mediaType })),
          interior: sectionImages.interior.map(({ data, mediaType }) => ({ data, mediaType })),
          detail: sectionImages.detail.map(({ data, mediaType }) => ({ data, mediaType })),
        },
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `서버 오류 (${res.status})`);
    }

    const result = await res.json();

    // 섹션 사진 압축 + photoDescriptions 병합
    const compressedSectionImages = {};
    for (const section of ['exterior', 'interior', 'detail']) {
      const descs = result.photoDescriptions?.[section] || [];
      compressedSectionImages[section] = await Promise.all(
        sectionImages[section].map(async ({ dataUrl, name }, i) => ({
          dataUrl: await compressDataUrl(dataUrl),
          name,
          description: descs[i] || '',
        }))
      );
    }

    sessionStorage.setItem('blogResult', JSON.stringify({
      ...result,
      topic: result.templateData.blogTitle || result.templateData.name,
      sectionImages: compressedSectionImages,
    }));

    window.location.href = '/result';
  } catch (err) {
    alert(`글 생성 실패: ${err.message}`);
    btn.disabled = false;
    btn.textContent = '글 생성';
    loading.style.display = 'none';
  }
}
