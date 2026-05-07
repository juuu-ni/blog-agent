let _profiles = [];

document.addEventListener('DOMContentLoaded', loadProfiles);

async function loadProfiles() {
  const loading = document.getElementById('profiles-loading');
  const empty = document.getElementById('profiles-empty');
  const list = document.getElementById('profiles-list');

  loading.style.display = 'flex';
  empty.style.display = 'none';
  list.innerHTML = '';

  try {
    const res = await fetch('/api/profiles');
    if (!res.ok) throw new Error('불러오기 실패');
    _profiles = await res.json();
  } catch {
    _profiles = [];
  }

  loading.style.display = 'none';

  if (_profiles.length === 0) {
    empty.style.display = 'flex';
    return;
  }

  _profiles.forEach(item => {
    list.appendChild(renderCard(item));
  });
}

function renderCard(item) {
  const card = document.createElement('div');
  card.className = 'profile-card';
  card.id = `card-${item.id}`;

  const p = item.profile;
  const arrToStr = arr => (Array.isArray(arr) ? arr.join(', ') : arr || '');

  card.innerHTML = `
    <div class="profile-card-header">
      <div class="profile-card-info">
        <span class="profile-card-name">${escapeHtml(item.name)}</span>
        <span class="profile-card-date">${formatDate(item.created_at)}</span>
      </div>
      <div class="profile-card-actions">
        <button class="btn btn-primary btn-sm" onclick="applyProfile('${item.id}')">불러오기</button>
        <button class="btn btn-outline btn-sm" onclick="toggleEdit('${item.id}')">수정</button>
        <button class="btn-remove" onclick="deleteProfile('${item.id}', '${escapeAttr(item.name)}')" title="삭제">✕</button>
      </div>
    </div>

    <div class="profile-card-summary">
      ${p.tone ? `<span class="summary-chip">${escapeHtml(p.tone)}</span>` : ''}
      ${p.sentenceLength ? `<span class="summary-chip">${escapeHtml(p.sentenceLength)}</span>` : ''}
      ${(p.endings || []).slice(0, 3).map(e => `<span class="summary-chip">${escapeHtml(e)}</span>`).join('')}
    </div>

    <div class="profile-edit-form" id="edit-${item.id}" style="display:none;">
      <div class="edit-field-group">
        <label class="edit-label">프로파일 이름</label>
        <input type="text" class="text-input" id="edit-name-${item.id}" value="${escapeAttr(item.name)}" maxlength="20" />
      </div>
      <div class="edit-field-group">
        <label class="edit-label">어조</label>
        <input type="text" class="text-input" id="edit-tone-${item.id}" value="${escapeAttr(p.tone || '')}" />
      </div>
      <div class="edit-field-group">
        <label class="edit-label">문장 길이</label>
        <input type="text" class="text-input" id="edit-sentenceLength-${item.id}" value="${escapeAttr(p.sentenceLength || '')}" />
      </div>
      <div class="edit-field-group">
        <label class="edit-label">단락 스타일</label>
        <input type="text" class="text-input" id="edit-paragraphStyle-${item.id}" value="${escapeAttr(p.paragraphStyle || '')}" />
      </div>
      <div class="edit-field-group">
        <label class="edit-label">자주 쓰는 어미 <span class="edit-hint">(쉼표로 구분)</span></label>
        <input type="text" class="text-input" id="edit-endings-${item.id}" value="${escapeAttr(arrToStr(p.endings))}" />
      </div>
      <div class="edit-field-group">
        <label class="edit-label">자주 쓰는 표현 <span class="edit-hint">(쉼표로 구분)</span></label>
        <input type="text" class="text-input" id="edit-vocabulary-${item.id}" value="${escapeAttr(arrToStr(p.vocabulary))}" />
      </div>
      <div class="edit-field-group">
        <label class="edit-label">특이 습관 <span class="edit-hint">(쉼표로 구분)</span></label>
        <input type="text" class="text-input" id="edit-uniqueTraits-${item.id}" value="${escapeAttr(arrToStr(p.uniqueTraits))}" />
      </div>
      <div class="edit-actions">
        <button class="btn btn-primary btn-sm" onclick="saveEdit('${item.id}')">저장</button>
        <button class="btn btn-outline btn-sm" onclick="toggleEdit('${item.id}')">취소</button>
      </div>
    </div>
  `;

  return card;
}

function toggleEdit(id) {
  const form = document.getElementById(`edit-${id}`);
  const isHidden = form.style.display === 'none';
  form.style.display = isHidden ? 'block' : 'none';
}

async function saveEdit(id) {
  const name = document.getElementById(`edit-name-${id}`).value.trim();
  if (!name) {
    alert('프로파일 이름을 입력해 주세요.');
    return;
  }

  const toArr = val => val.split(',').map(s => s.trim()).filter(Boolean);

  const profile = {
    tone: document.getElementById(`edit-tone-${id}`).value.trim(),
    sentenceLength: document.getElementById(`edit-sentenceLength-${id}`).value.trim(),
    paragraphStyle: document.getElementById(`edit-paragraphStyle-${id}`).value.trim(),
    endings: toArr(document.getElementById(`edit-endings-${id}`).value),
    vocabulary: toArr(document.getElementById(`edit-vocabulary-${id}`).value),
    uniqueTraits: toArr(document.getElementById(`edit-uniqueTraits-${id}`).value),
  };

  const saveBtn = document.querySelector(`#edit-${id} .btn-primary`);
  saveBtn.disabled = true;
  saveBtn.textContent = '저장 중...';

  try {
    const res = await fetch(`/api/profiles/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, profile }),
    });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || '저장 실패');

    const updated = await res.json();
    const idx = _profiles.findIndex(p => p.id === id);
    if (idx !== -1) _profiles[idx] = updated;

    const oldCard = document.getElementById(`card-${id}`);
    const newCard = renderCard(updated);
    oldCard.replaceWith(newCard);
  } catch (err) {
    alert(`수정 실패: ${err.message}`);
    saveBtn.disabled = false;
    saveBtn.textContent = '저장';
  }
}

function applyProfile(id) {
  const item = _profiles.find(p => p.id === id);
  if (!item) return;
  sessionStorage.setItem('pendingProfileId', id);
  window.location.href = '/generate';
}

async function deleteProfile(id, name) {
  if (!confirm(`"${name}" 프로파일을 삭제할까요?`)) return;

  try {
    const res = await fetch(`/api/profiles/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('삭제 실패');

    _profiles = _profiles.filter(p => p.id !== id);
    const card = document.getElementById(`card-${id}`);
    card.remove();

    if (_profiles.length === 0) {
      document.getElementById('profiles-empty').style.display = 'flex';
    }
  } catch (err) {
    alert(`삭제 실패: ${err.message}`);
  }
}

function escapeHtml(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapeAttr(str) {
  return (str || '').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function formatDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}
