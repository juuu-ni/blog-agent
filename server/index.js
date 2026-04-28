import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import authRouter from './routes/auth.js';
import analyzeRouter from './routes/analyze.js';
import generateRouter from './routes/generate.js';
import hashtagsRouter from './routes/hashtags.js';
import searchPlaceRouter from './routes/search-place.js';
import postsRouter from './routes/posts.js';
import { requireAuth } from './middleware/requireAuth.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '20mb' }));
app.use(session({
  secret: process.env.SESSION_SECRET || 'blog-agent-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 },
}));

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
app.use('/api/analyze', analyzeRouter);
app.use('/api/generate', generateRouter);
app.use('/api/hashtags', hashtagsRouter);
app.use('/api/search-place', searchPlaceRouter);
app.use('/api/posts', postsRouter);

// 로그인 페이지 (인증 불필요)
app.get('/login', (req, res) => {
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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
