import { Router } from 'express';

const router = Router();

// GET /auth/kakao — 카카오 로그인 페이지로 리다이렉트
router.get('/kakao', (req, res) => {
  const { KAKAO_REST_API_KEY, KAKAO_REDIRECT_URI } = process.env;
  console.log('[auth] KAKAO_REST_API_KEY:', KAKAO_REST_API_KEY);
  console.log('[auth] KAKAO_REDIRECT_URI:', KAKAO_REDIRECT_URI);

  if (!KAKAO_REST_API_KEY || KAKAO_REST_API_KEY === 'your-kakao-rest-api-key') {
    return res.status(500).send('.env에 KAKAO_REST_API_KEY가 설정되지 않았습니다.');
  }

  const url = new URL('https://kauth.kakao.com/oauth/authorize');
  url.searchParams.set('client_id', KAKAO_REST_API_KEY);
  url.searchParams.set('redirect_uri', KAKAO_REDIRECT_URI);
  url.searchParams.set('response_type', 'code');
  res.redirect(url.toString());
});

// GET /auth/kakao/callback — 토큰 교환 + 사용자 정보 세션 저장
router.get('/kakao/callback', async (req, res) => {
  const { KAKAO_REST_API_KEY, KAKAO_CLIENT_SECRET, KAKAO_REDIRECT_URI } = process.env;
  const { code } = req.query;
  if (!code) return res.redirect('/login?error=1');

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

// GET /auth/logout
router.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

export default router;
