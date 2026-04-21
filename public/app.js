/* ===== 상태 ===== */
let sampleCount = 1;

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
