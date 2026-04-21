document.addEventListener('DOMContentLoaded', () => {
  const raw = sessionStorage.getItem('blogResult');
  if (!raw) {
    alert('생성된 글이 없습니다. 글 생성 페이지로 이동합니다.');
    window.location.href = '/generate';
    return;
  }

  const data = JSON.parse(raw);
  document.getElementById('result-topic').textContent = data.topic || '생성된 블로그 글';

  if (data.type === 'interleaved') {
    renderInterleaved(data.segments, data.images || []);
  } else {
    renderSingle(data.content);
  }

  generateHashtags(data);
});

/* ===== 사진+글 인터리빙 렌더링 ===== */
function renderInterleaved(segments, images) {
  const body = document.getElementById('result-body');
  body.innerHTML = '';

  segments.forEach((text, i) => {
    const block = document.createElement('div');
    block.className = 'interleaved-block';

    if (images[i]) {
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

/* ===== 단일 글 렌더링 (사진 없음) ===== */
function renderSingle(content) {
  const body = document.getElementById('result-body');
  body.innerHTML = `
    <div class="card">
      <div class="result-content">${escapeHtml(content)}</div>
    </div>
  `;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
}

/* ===== 전체 복사 ===== */
async function copyAll() {
  const data = JSON.parse(sessionStorage.getItem('blogResult'));
  let text = '';

  if (data.type === 'interleaved') {
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
  const content = data.type === 'interleaved'
    ? (data.segments || []).join('\n\n')
    : (data.content || '');
  const topic = data.topic || '';
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
    // 해시태그 실패는 조용히 처리
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

/* ===== 다시 생성하기 ===== */
function regenerate() {
  window.location.href = '/generate';
}
