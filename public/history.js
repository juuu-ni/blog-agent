let allPosts = [];

document.addEventListener('DOMContentLoaded', loadPosts);

async function loadPosts() {
  try {
    const res = await fetch('/api/posts');
    if (!res.ok) throw new Error(`서버 오류 (${res.status})`);
    const posts = await res.json();

    document.getElementById('history-loading').style.display = 'none';

    if (posts.length === 0) {
      document.getElementById('history-empty').style.display = 'flex';
      return;
    }

    allPosts = posts;
    document.getElementById('post-count').textContent = `${posts.length}개`;
    document.getElementById('search-bar').style.display = 'block';
    document.getElementById('history-grid').style.display = 'grid';
    renderPosts(posts);
    initSearch();
  } catch (err) {
    document.getElementById('history-loading').innerHTML =
      `<p style="color:var(--color-error); text-align:center;">불러오기 실패: ${err.message}</p>`;
  }
}

function initSearch() {
  const input = document.getElementById('search-input');
  const clearBtn = document.getElementById('search-clear');
  let timer;

  input.addEventListener('input', () => {
    clearTimeout(timer);
    clearBtn.style.display = input.value ? 'block' : 'none';
    timer = setTimeout(() => filterPosts(input.value), 300);
  });

  clearBtn.addEventListener('click', () => {
    input.value = '';
    clearBtn.style.display = 'none';
    filterPosts('');
    input.focus();
  });
}

function filterPosts(query) {
  const q = query.trim().toLowerCase();
  const searchEmpty = document.getElementById('history-search-empty');
  const grid = document.getElementById('history-grid');

  if (!q) {
    document.getElementById('post-count').textContent = `${allPosts.length}개`;
    searchEmpty.style.display = 'none';
    grid.style.display = 'grid';
    renderPosts(allPosts);
    return;
  }

  const filtered = allPosts.filter(post => {
    const title = (post.title || '').toLowerCase();
    const store = (post.store_name || '').toLowerCase();
    const tags = (post.hashtags || []).join(' ').toLowerCase();
    return title.includes(q) || store.includes(q) || tags.includes(q);
  });

  document.getElementById('post-count').textContent = `${filtered.length} / ${allPosts.length}개`;

  if (filtered.length === 0) {
    grid.style.display = 'none';
    searchEmpty.style.display = 'flex';
  } else {
    searchEmpty.style.display = 'none';
    grid.style.display = 'grid';
    renderPosts(filtered);
  }
}

function renderPosts(posts) {
  const grid = document.getElementById('history-grid');
  grid.innerHTML = posts.map(post => {
    const date = new Date(post.created_at).toLocaleDateString('ko-KR', {
      year: 'numeric', month: 'long', day: 'numeric',
    });
    const tags = (post.hashtags || []).slice(0, 4)
      .map(t => `<span class="hashtag">${escapeHtml(t)}</span>`).join('');
    const moreTags = post.hashtags?.length > 4
      ? `<span class="history-more-tags">+${post.hashtags.length - 4}</span>` : '';

    return `
      <div class="history-card" onclick="openPost('${post.id}')">
        <div class="history-card-body">
          <div class="history-card-title">${escapeHtml(post.title)}</div>
          ${post.store_name && post.store_name !== post.title
            ? `<div class="history-card-store">${escapeHtml(post.store_name)}</div>` : ''}
          ${tags ? `<div class="history-card-tags">${tags}${moreTags}</div>` : ''}
        </div>
        <div class="history-card-footer">
          <span class="history-card-date">${date}</span>
          <button class="history-delete-btn" onclick="deletePost(event, '${post.id}')">삭제</button>
        </div>
      </div>
    `;
  }).join('');
}

async function openPost(id) {
  try {
    const res = await fetch(`/api/posts/${id}`);
    if (!res.ok) throw new Error(`서버 오류 (${res.status})`);
    const post = await res.json();
    let content = post.content;
    if (typeof content === 'string') {
      try { content = JSON.parse(content); } catch {
        throw new Error('저장된 글 내용이 손상되었습니다.');
      }
    }
    if (!content || typeof content !== 'object') {
      throw new Error('저장된 글 내용이 없습니다.');
    }
    sessionStorage.setItem('blogResult', JSON.stringify({ ...content, _postId: post.id }));
    window.location.href = '/result';
  } catch (err) {
    alert(`불러오기 실패: ${err.message}`);
  }
}

async function deletePost(e, id) {
  e.stopPropagation();
  if (!confirm('이 글을 삭제할까요?')) return;

  try {
    const res = await fetch(`/api/posts/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`서버 오류 (${res.status})`);
    await loadPosts();
  } catch (err) {
    alert(`삭제 실패: ${err.message}`);
  }
}

function escapeHtml(str) {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
