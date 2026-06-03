function switchTab(tab) {
  const isLogin = tab === 'login';
  document.getElementById('tab-login').classList.toggle('active', isLogin);
  document.getElementById('tab-signup').classList.toggle('active', !isLogin);
  document.getElementById('tab-indicator').style.left = isLogin ? '0%' : '50%';
  document.getElementById('panel-login').style.display = isLogin ? '' : 'none';
  document.getElementById('panel-signup').style.display = isLogin ? 'none' : '';
  document.getElementById('panel-forgot').style.display = 'none';
  document.getElementById('auth-tabs-el').style.display = '';
  document.title = isLogin ? '로그인 · 블로그 에이전트' : '회원가입 · 블로그 에이전트';
}

function showForgot() {
  document.getElementById('panel-login').style.display = 'none';
  document.getElementById('panel-signup').style.display = 'none';
  document.getElementById('panel-forgot').style.display = '';
  document.getElementById('auth-tabs-el').style.display = 'none';
  document.title = '비밀번호 찾기 · 블로그 에이전트';
}

const defaultTab = window.location.pathname === '/signup' ? 'signup' : 'login';
switchTab(defaultTab);

document.getElementById('tab-login').addEventListener('click', () => switchTab('login'));
document.getElementById('tab-signup').addEventListener('click', () => switchTab('signup'));
document.getElementById('btn-forgot').addEventListener('click', showForgot);
document.getElementById('btn-forgot-back').addEventListener('click', () => switchTab('login'));

if (new URLSearchParams(location.search).get('error')) {
  const errEl = document.getElementById('login-error');
  errEl.textContent = '로그인 중 오류가 발생했습니다. 다시 시도해 주세요.';
  errEl.style.display = 'block';
}

// 로그인
document.getElementById('form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errEl = document.getElementById('login-error');
  const submitBtn = document.getElementById('btn-login-submit');

  errEl.style.display = 'none';
  submitBtn.disabled = true;
  submitBtn.textContent = '처리 중...';

  try {
    const res = await fetch('/auth/email/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      errEl.textContent = data.error || '로그인에 실패했습니다.';
      errEl.style.display = 'block';
      return;
    }
    window.location.href = '/';
  } catch {
    errEl.textContent = '오류가 발생했습니다. 다시 시도해 주세요.';
    errEl.style.display = 'block';
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'SUBMIT';
  }
});

// 회원가입
document.getElementById('form-signup').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;
  const confirm = document.getElementById('signup-confirm').value;
  const errEl = document.getElementById('signup-error');
  const successEl = document.getElementById('signup-success');
  const submitBtn = document.getElementById('btn-signup-submit');

  errEl.style.display = 'none';
  successEl.style.display = 'none';

  if (password !== confirm) {
    errEl.textContent = '비밀번호가 일치하지 않습니다.';
    errEl.style.display = 'block';
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = '처리 중...';

  try {
    const res = await fetch('/auth/email/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      errEl.textContent = data.error || '가입에 실패했습니다.';
      errEl.style.display = 'block';
      return;
    }
    if (data.needsConfirmation) {
      document.getElementById('form-signup').style.display = 'none';
      successEl.style.display = 'block';
      return;
    }
    window.location.href = '/';
  } catch {
    errEl.textContent = '오류가 발생했습니다. 다시 시도해 주세요.';
    errEl.style.display = 'block';
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'SUBMIT';
  }
});

// 비밀번호 찾기
document.getElementById('form-forgot').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('forgot-email').value.trim();
  const errEl = document.getElementById('forgot-error');
  const successEl = document.getElementById('forgot-success');
  const submitBtn = document.getElementById('btn-forgot-submit');

  errEl.style.display = 'none';
  successEl.style.display = 'none';
  submitBtn.disabled = true;
  submitBtn.textContent = '처리 중...';

  try {
    const res = await fetch('/auth/email/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) {
      errEl.textContent = data.error || '이메일 전송에 실패했습니다.';
      errEl.style.display = 'block';
      return;
    }
    document.getElementById('form-forgot').style.display = 'none';
    successEl.style.display = 'block';
  } catch {
    errEl.textContent = '오류가 발생했습니다. 다시 시도해 주세요.';
    errEl.style.display = 'block';
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = '재설정 이메일 보내기';
  }
});
