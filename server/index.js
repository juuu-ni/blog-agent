import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import authRouter from './routes/auth.js';
import analyzeRouter from './routes/analyze.js';
import generateRouter from './routes/generate.js';
import hashtagsRouter from './routes/hashtags.js';
import searchPlaceRouter from './routes/search-place.js';
import postsRouter from './routes/posts.js';
import profilesRouter from './routes/profiles.js';
import suggestTitleRouter from './routes/suggest-title.js';
import draftsRouter from './routes/drafts.js';
import { requireAuth } from './middleware/requireAuth.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'"],
    },
  },
}));
app.use(express.json({ limit: '20mb' }));
if (!process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET 환경변수가 설정되지 않았습니다.');
}
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  },
}));

// Claude API 호출 라우트 — IP당 15분에 10회 제한
const claudeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// 인증 라우터 (static 이전에 등록)
app.use('/auth', authRouter);

// 정적 파일 (CSS, JS, 이미지)
app.use(express.static(join(__dirname, '../public')));

// 사용자 정보 API
app.get('/api/user', (req, res) => {
  if (!req.session?.user) return res.status(401).json({ error: 'Unauthorized' });
  res.json(req.session.user);
});

// API 라우터
app.use('/api/analyze', requireAuth, claudeLimiter, analyzeRouter);
app.use('/api/generate', requireAuth, claudeLimiter, generateRouter);
app.use('/api/hashtags', requireAuth, claudeLimiter, hashtagsRouter);
app.use('/api/search-place', requireAuth, searchPlaceRouter);
app.use('/api/posts', requireAuth, postsRouter);
app.use('/api/profiles', requireAuth, profilesRouter);
app.use('/api/suggest-title', requireAuth, claudeLimiter, suggestTitleRouter);
app.use('/api/drafts', requireAuth, draftsRouter);

// 로그인/회원가입 페이지 (인증 불필요)
app.get('/login', (req, res) => {
  if (req.session?.user) return res.redirect('/');
  res.sendFile(join(__dirname, '../public/login.html'));
});

app.get('/signup', (req, res) => {
  if (req.session?.user) return res.redirect('/');
  res.sendFile(join(__dirname, '../public/login.html'));
});

// 보호된 페이지 (인증 필요) — express.static이 index.html을 가로채지 않도록 명시적 등록
app.get('/', requireAuth, (req, res) => {
  res.sendFile(join(__dirname, '../public/index.html'));
});
app.get('/generate', requireAuth, (req, res) => {
  res.sendFile(join(__dirname, '../public/generate.html'));
});
app.get('/result', requireAuth, (req, res) => {
  res.sendFile(join(__dirname, '../public/result.html'));
});
app.get('/history', requireAuth, (req, res) => {
  res.sendFile(join(__dirname, '../public/history.html'));
});
app.get('/style-profiles', requireAuth, (req, res) => {
  res.sendFile(join(__dirname, '../public/style-profiles.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
