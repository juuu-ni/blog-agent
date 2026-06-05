import { Router } from 'express';
import { randomBytes } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import supabase from '../lib/supabase.js';

const router = Router();

// POST /auth/email/login — 이메일/비밀번호 로그인
router.post('/email/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: '이메일과 비밀번호를 입력해 주세요.' });

  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });

    req.session.user = {
      id: data.user.id,
      nickname: email.split('@')[0],
      profileImage: null,
    };
    res.json({ ok: true });
  } catch (err) {
    console.error('[auth] email login error:', err);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// POST /auth/email/signup — 이메일/비밀번호 회원가입
router.post('/email/signup', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: '이메일과 비밀번호를 입력해 주세요.' });
  if (password.length < 6) return res.status(400).json({ error: '비밀번호는 6자 이상이어야 합니다.' });

  try {
    const SITE_URL = process.env.SITE_URL || `http://localhost:${process.env.PORT || 3000}`;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${SITE_URL}/auth/email/confirm` },
    });
    if (error) return res.status(400).json({ error: error.message });

    if (!data.session) {
      return res.json({ ok: true, needsConfirmation: true });
    }

    req.session.user = {
      id: data.user.id,
      nickname: email.split('@')[0],
      profileImage: null,
    };
    res.json({ ok: true });
  } catch (err) {
    console.error('[auth] email signup error:', err);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// GET /auth/kakao — 카카오 로그인 페이지로 리다이렉트
router.get('/kakao', (req, res) => {
  const { KAKAO_REST_API_KEY, KAKAO_REDIRECT_URI } = process.env;

  if (!KAKAO_REST_API_KEY || KAKAO_REST_API_KEY === 'your-kakao-rest-api-key') {
    return res.status(500).send('.env에 KAKAO_REST_API_KEY가 설정되지 않았습니다.');
  }

  const state = randomBytes(16).toString('hex');
  req.session.oauthState = state;

  const url = new URL('https://kauth.kakao.com/oauth/authorize');
  url.searchParams.set('client_id', KAKAO_REST_API_KEY);
  url.searchParams.set('redirect_uri', KAKAO_REDIRECT_URI);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('state', state);
  res.redirect(url.toString());
});

// GET /auth/kakao/callback — 토큰 교환 + 사용자 정보 세션 저장
router.get('/kakao/callback', async (req, res) => {
  const { KAKAO_REST_API_KEY, KAKAO_CLIENT_SECRET, KAKAO_REDIRECT_URI } = process.env;
  const { code, state } = req.query;
  if (!code) return res.redirect('/login?error=1');

  if (!state || state !== req.session.oauthState) {
    return res.redirect('/login?error=1');
  }
  delete req.session.oauthState;

  try {
    const tokenRes = await fetch('https://kauth.kakao.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: KAKAO_REST_API_KEY,
        client_secret: KAKAO_CLIENT_SECRET,
        redirect_uri: KAKAO_REDIRECT_URI,
        code,
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      console.error('[auth] 토큰 발급 실패:', tokenData);
      return res.redirect('/login?error=1');
    }

    const userRes = await fetch('https://kapi.kakao.com/v2/user/me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const kakaoUser = await userRes.json();

    req.session.user = {
      id: String(kakaoUser.id),
      nickname: kakaoUser.kakao_account?.profile?.nickname || '사용자',
      profileImage: kakaoUser.kakao_account?.profile?.profile_image_url || null,
    };

    res.redirect('/');
  } catch (err) {
    console.error('[auth] kakao callback error:', err);
    res.redirect('/login?error=1');
  }
});

// GET /auth/email/confirm — Supabase 이메일 확인 콜백
router.get('/email/confirm', async (req, res) => {
  const { token_hash, type } = req.query;
  if (!token_hash || type !== 'email') return res.redirect('/login?error=1');

  try {
    const { data, error } = await supabase.auth.verifyOtp({ token_hash, type: 'email' });
    if (error) return res.redirect('/login?error=1');

    req.session.user = {
      id: data.user.id,
      nickname: data.user.email.split('@')[0],
      profileImage: null,
    };
    res.redirect('/');
  } catch (err) {
    console.error('[auth] email confirm error:', err);
    res.redirect('/login?error=1');
  }
});

// POST /auth/email/forgot-password — 비밀번호 재설정 이메일 발송
router.post('/email/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: '이메일을 입력해 주세요.' });

  try {
    const SITE_URL = process.env.SITE_URL || `http://localhost:${process.env.PORT || 3000}`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${SITE_URL}/auth/reset-password`,
    });
    if (error) return res.status(400).json({ error: '이메일 전송에 실패했습니다.' });
    res.json({ ok: true });
  } catch (err) {
    console.error('[auth] forgot password error:', err);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// POST /auth/email/reset-password — 비밀번호 변경
router.post('/email/reset-password', async (req, res) => {
  const { token_hash, password } = req.body;
  if (!token_hash || !password) return res.status(400).json({ error: '필요한 정보가 없습니다.' });
  if (password.length < 6) return res.status(400).json({ error: '비밀번호는 6자 이상이어야 합니다.' });

  try {
    const { data, error } = await supabase.auth.verifyOtp({ token_hash, type: 'recovery' });
    if (error || !data.session) return res.status(400).json({ error: '링크가 만료되었거나 유효하지 않습니다.' });

    const userSupabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
    await userSupabase.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
    const { error: updateError } = await userSupabase.auth.updateUser({ password });
    if (updateError) return res.status(400).json({ error: '비밀번호 변경에 실패했습니다.' });

    res.json({ ok: true });
  } catch (err) {
    console.error('[auth] reset password error:', err);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// GET /auth/logout
router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

export default router;
