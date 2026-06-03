const params = new URLSearchParams(location.search);
const tokenHash = params.get('token_hash');
const errEl = document.getElementById('reset-error');

if (!tokenHash) {
  errEl.textContent = '유효하지 않은 링크입니다. 비밀번호 재설정 이메일의 링크를 다시 확인해 주세요.';
  errEl.style.display = 'block';
  document.getElementById('form-reset').style.display = 'none';
}

document.getElementById('form-reset').addEventListener('submit', async (e) => {
  e.preventDefault();
  const password = document.getElementById('reset-password').value;
  const confirm = document.getElementById('reset-confirm').value;
  const successEl = document.getElementById('reset-success');
  const submitBtn = document.getElementById('btn-reset-submit');

  errEl.style.display = 'none';

  if (password !== confirm) {
    errEl.textContent = '비밀번호가 일치하지 않습니다.';
    errEl.style.display = 'block';
    return;
  }

  submitBtn.disabled = true;
  submitBtn.textContent = '처리 중...';

  try {
    const res = await fetch('/auth/email/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token_hash: tokenHash, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      errEl.textContent = data.error || '비밀번호 변경에 실패했습니다.';
      errEl.style.display = 'block';
      return;
    }
    document.getElementById('form-reset').style.display = 'none';
    successEl.style.display = 'block';
    setTimeout(() => { window.location.href = '/login'; }, 1500);
  } catch {
    errEl.textContent = '오류가 발생했습니다. 다시 시도해 주세요.';
    errEl.style.display = 'block';
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = '변경하기';
  }
});
