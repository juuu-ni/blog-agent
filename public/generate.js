/* ===== 상태 ===== */
let styleProfile = null;
let uploadedImages = []; // [{data, mediaType, name, objectUrl}]

/* ===== 프로파일 로드 ===== */
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

  document.getElementById('photo-input').addEventListener('change', (e) => {
    handleImageUpload(e.target.files);
    e.target.value = '';
  });

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

/* ===== 사진 업로드 ===== */
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

/* ===== 글 생성 ===== */
async function generatePost() {
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
