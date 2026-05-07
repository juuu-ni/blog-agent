/* ===== 상태 ===== */
let sampleCount = 1;
let currentProfile = null;

document.addEventListener('DOMContentLoaded', () => {
  loadSavedProfiles();
});

/* ===== 샘플 추가 / 삭제 ===== */
function addSample() {
  sampleCount++;
  const list = document.getElementById('sample-list');

  const item = document.createElement('div');
  item.className = 'sample-item';
  item.innerHTML = `
    <div class="sample-item-header">
      <span class="sample-num">샘플 ${sampleCount}</span>
      <button class="btn-remove" onclick="removeSample(this)" title="삭제">✕</button>
    </div>
    <textarea class="sample-textarea" placeholder="여기에 블로그 글을 붙여넣으세요..."></textarea>
  `;
  list.appendChild(item);
  item.querySelector('textarea').focus();
  updateSampleNumbers();
}

function removeSample(btn) {
  const items = document.querySelectorAll('.sample-item');
  if (items.length === 1) {
    alert('샘플은 최소 1개 이상 있어야 합니다.');
    return;
  }
  btn.closest('.sample-item').remove();
  updateSampleNumbers();
}

function updateSampleNumbers() {
  document.querySelectorAll('.sample-item').forEach((item, i) => {
    item.querySelector('.sample-num').textContent = `샘플 ${i + 1}`;
  });
}

/* ===== 스텝 인디케이터 ===== */
function setActiveStep(step) {
  for (let i = 1; i <= 3; i++) {
    const el = document.getElementById(`ind-${i}`);
    el.classList.remove('active', 'done');
    if (i < step) el.classList.add('done');
    if (i === step) el.classList.add('active');
  }
}

/* ===== 스타일 분석 ===== */
async function analyzeStyle() {
  const textareas = document.querySelectorAll('.sample-textarea');
  const samples = Array.from(textareas)
    .map(t => t.value.trim())
    .filter(Boolean);

  if (samples.length === 0) {
    alert('샘플 텍스트를 최소 1개 이상 입력해 주세요.');
    return;
  }
  if (samples.length < 3) {
    const ok = confirm(`샘플이 ${samples.length}개입니다. 3개 이상 권장하지만 계속 분석할까요?`);
    if (!ok) return;
  }

  const btn = document.getElementById('btn-analyze');
  const loading = document.getElementById('loading-analyze');
  const resultBox = document.getElementById('profile-result');

  btn.disabled = true;
  btn.textContent = '분석 중...';
  loading.style.display = 'flex';
  resultBox.style.display = 'none';
  document.getElementById('go-generate').style.display = 'none';

  try {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ samples }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `서버 오류 (${res.status})`);
    }

    const profile = await res.json();
    currentProfile = profile;
    localStorage.setItem('styleProfile', JSON.stringify(profile));

    renderProfile(profile);
    setActiveStep(3);

    const goBtn = document.getElementById('go-generate');
    goBtn.style.display = 'flex';
    goBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } catch (err) {
    alert(`분석 실패: ${err.message}`);
  } finally {
    btn.disabled = false;
    btn.textContent = '분석 시작';
    loading.style.display = 'none';
  }
}

function renderProfile(profile) {
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

  document.getElementById('profile-result').style.display = 'block';
}

/* ===== 글 생성 페이지로 이동 ===== */
function goToGenerate() {
  window.location.href = '/generate';
}

/* ===== 프로파일 저장/불러오기/삭제 (Supabase) ===== */
let _savedProfiles = []; // 메모리 캐시

async function saveProfile() {
  if (!currentProfile) {
    alert('저장할 프로파일이 없습니다. 먼저 분석을 완료해 주세요.');
    return;
  }
  const nameInput = document.getElementById('profile-name-input');
  const name = nameInput.value.trim();
  if (!name) {
    alert('프로파일 이름을 입력해 주세요.');
    nameInput.focus();
    return;
  }

  const existing = _savedProfiles.find(p => p.name === name);
  if (existing) {
    const ok = confirm(`"${name}" 프로파일이 이미 있습니다. 덮어쓸까요?`);
    if (!ok) return;
  }

  const btn = document.querySelector('.profile-save-row .btn-outline');
  btn.disabled = true;
  btn.textContent = '저장 중...';

  try {
    const res = await fetch('/api/profiles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, profile: currentProfile }),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || '저장 실패');

    nameInput.value = '';
    await loadSavedProfiles();

    btn.textContent = '저장됨 ✓';
    setTimeout(() => { btn.textContent = '저장'; btn.disabled = false; }, 1500);
  } catch (err) {
    alert(`프로파일 저장 실패: ${err.message}`);
    btn.textContent = '저장';
    btn.disabled = false;
  }
}

async function loadSavedProfiles() {
  const section = document.getElementById('saved-profiles-section');
  const list = document.getElementById('saved-profiles-list');

  try {
    const res = await fetch('/api/profiles');
    if (!res.ok) throw new Error('불러오기 실패');
    _savedProfiles = await res.json();
  } catch {
    _savedProfiles = [];
  }

  if (_savedProfiles.length === 0) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';
  list.innerHTML = '';

  _savedProfiles.forEach((item) => {
    const el = document.createElement('div');
    el.className = 'saved-profile-item';
    el.innerHTML = `
      <div class="saved-profile-info">
        <span class="saved-profile-name">${escapeHtml(item.name)}</span>
        <span class="saved-profile-date">${formatDate(item.created_at)}</span>
      </div>
      <div class="saved-profile-actions">
        <button class="btn btn-outline btn-sm" onclick="applyProfile('${item.id}')">불러오기</button>
        <a href="/style-profiles" class="btn btn-outline btn-sm">수정</a>
        <button class="btn-remove" onclick="deleteProfile('${item.id}', '${escapeHtml(item.name)}')" title="삭제">✕</button>
      </div>
    `;
    list.appendChild(el);
  });
}

function applyProfile(id) {
  const item = _savedProfiles.find(p => p.id === id);
  if (!item) return;

  currentProfile = item.profile;
  sessionStorage.setItem('pendingProfileId', id);
  renderProfile(item.profile);
  setActiveStep(3);

  const goBtn = document.getElementById('go-generate');
  goBtn.style.display = 'flex';

  document.getElementById('step-analyze').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function deleteProfile(id, name) {
  if (!confirm(`"${name}" 프로파일을 삭제할까요?`)) return;

  try {
    const res = await fetch(`/api/profiles/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('삭제 실패');
    await loadSavedProfiles();
  } catch (err) {
    alert(`프로파일 삭제 실패: ${err.message}`);
  }
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

