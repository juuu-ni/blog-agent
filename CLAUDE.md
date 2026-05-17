# 블로그 글쓰기 에이전트

내 말투를 학습해서 똑같은 스타일로 블로그 글을 써주는 웹사이트.

## 스택

- **Frontend**: HTML + CSS + Vanilla JS (멀티 파일)
- **Backend**: Node.js + Express
- **AI**: Anthropic Claude API (`claude-sonnet-4-6`)
- **Auth**: Kakao OAuth 2.0 + express-session
- **Storage**: Supabase (PostgreSQL)
- **External API**: Naver Local API (장소 검색)
- **배포**: Railway

## 프로젝트 구조

```
public/
  index.html / app.js / index.css       # 샘플 등록 + 스타일 분석
  generate.html / generate.js / generate.css  # 글 생성
  result.html / result.js / result.css  # 결과 확인 + 인라인 편집
  history.html / history.js / history.css
  style-profiles.html / style-profiles.js / style-profiles.css
  login.html / login.js / login.css
  auth-header.js / style.css / favicon.svg

server/
  index.js                  # Express 진입점 (미들웨어, 라우터 등록)
  routes/
    auth.js                 # GET /auth/kakao, /auth/kakao/callback, /auth/logout
    analyze.js              # POST /api/analyze
    generate.js             # POST /api/generate
    hashtags.js             # POST /api/hashtags
    search-place.js         # POST /api/search-place
    posts.js                # CRUD /api/posts
    profiles.js             # CRUD /api/profiles
    suggest-title.js        # POST /api/suggest-title
    drafts.js               # GET/POST/DELETE /api/drafts
  middleware/requireAuth.js
  lib/claude.js / supabase.js
```

## 핵심 API

### POST /api/generate

응답 형태가 3가지로 분기됨:
```json
{ "type": "single", "content": "..." }
{ "type": "interleaved", "segments": [{ "type": "text"|"image", ... }] }
{ "type": "template", "templateData": { ... } }
```
`mode: "normal"` 이면 single/interleaved, `mode: "template"` 이면 template.

### POST /api/suggest-title

가게 정보 있으면 `[위치 맛집] 가게이름 : 한 줄 소개`, 없으면 `[키워드] : 한 줄 소개` 형식.

### /api/drafts

사용자당 1건 upsert. `draft_posts.user_id`에 unique 제약 필요. GET은 없으면 null 반환.

## 주의사항

- `ANTHROPIC_API_KEY`는 반드시 서버에서만 사용, 클라이언트 노출 금지
- Helmet CSP `scriptSrc: ["'self'"]` — 인라인 `<script>` 차단됨, 모든 JS는 외부 파일로 분리
- Claude API 응답은 JSON 파싱 실패 대비 try-catch 필수
- 모든 보호된 페이지·API에 `requireAuth` 미들웨어 적용됨
- 네이버 Local Search API `mapx`/`mapy`는 WGS84 × 10⁶ 형식 → `/ 1_000_000` 변환 필요
- 영업시간은 네이버 API에서 제공하지 않아 수동 입력
- Claude API 호출 라우트에 `claudeLimiter` 적용 (IP당 15분에 10회)
- Railway 배포 시 `app.set('trust proxy', 1)` 필요 (카카오 OAuth 콜백 오류 방지)

## 개발 명령어

```bash
npm install
npm run dev   # nodemon
npm start     # 프로덕션
```

## 환경변수 (.env)

```
ANTHROPIC_API_KEY=
PORT=3000
NAVER_CLIENT_ID=
NAVER_CLIENT_SECRET=
SUPABASE_URL=
SUPABASE_ANON_KEY=
KAKAO_REST_API_KEY=
KAKAO_CLIENT_SECRET=
KAKAO_REDIRECT_URI=http://localhost:3000/auth/kakao/callback
SESSION_SECRET=
```
