# 블로그 글쓰기 에이전트

내 말투를 학습해서 똑같은 스타일로 블로그 글을 써주는 웹사이트.

## 프로젝트 개요

- 사용자가 본인 블로그 글 텍스트를 붙여넣어 말투 샘플 등록
- Claude API가 샘플 분석 → 말투 프로파일 추출 (어조, 어미, 문장 패턴 등)
- 주제 입력 시 학습된 말투로 블로그 글 생성
- Kakao OAuth 로그인, Supabase 글 저장, 네이버 장소 검색 연동

## 스택

- **Frontend**: HTML + CSS + Vanilla JS (멀티 파일)
- **Backend**: Node.js + Express
- **AI**: Anthropic Claude API (`claude-sonnet-4-6`)
- **Auth**: Kakao OAuth 2.0 + express-session
- **Storage**: Supabase (PostgreSQL) — saved_posts 테이블
- **External API**: Naver Local API (장소 검색)

## 프로젝트 구조

```
/
├── public/
│   ├── index.html        # 메인 페이지 (샘플 등록 + 스타일 분석)
│   ├── generate.html     # 글 생성 페이지
│   ├── result.html       # 생성 결과 표시 페이지
│   ├── history.html      # 저장된 글 목록 페이지
│   ├── login.html        # 카카오 로그인 페이지
│   ├── app.js            # 샘플 등록 & 분석 로직
│   ├── generate.js       # 글 생성 & 이미지 업로드 로직
│   ├── result.js         # 결과 표시 & 템플릿 렌더링 로직
│   ├── history.js        # 저장 글 목록 & CRUD 로직
│   ├── auth-header.js    # 인증 헤더 (사용자명 + 로그아웃)
│   ├── style.css         # 전역 스타일
│   ├── index.css         # 메인 페이지 전용 스타일
│   ├── generate.css      # 생성 페이지 전용 스타일
│   ├── result.css        # 결과 페이지 전용 스타일
│   ├── history.css       # 히스토리 페이지 전용 스타일
│   ├── login.css         # 로그인 페이지 전용 스타일
│   └── favicon.svg
├── server/
│   ├── index.js          # Express 서버 진입점
│   ├── routes/
│   │   ├── auth.js       # GET /auth/kakao, /auth/kakao/callback, /auth/logout
│   │   ├── analyze.js    # POST /api/analyze
│   │   ├── generate.js   # POST /api/generate
│   │   ├── hashtags.js   # POST /api/hashtags
│   │   ├── search-place.js # POST /api/search-place
│   │   └── posts.js      # CRUD /api/posts
│   ├── middleware/
│   │   └── requireAuth.js # 인증 미들웨어
│   └── lib/
│       ├── claude.js     # Anthropic SDK 초기화
│       └── supabase.js   # Supabase 클라이언트 + 스키마 문서
├── .env                  # 환경변수 (gitignore)
└── package.json
```

## UI 구성 (페이지 흐름)

1. **로그인** (`/login`) — 카카오 로그인
2. **샘플 등록** (`/`) — 텍스트 붙여넣기, 여러 개 추가/삭제 가능
3. **스타일 분석** — 분석 버튼 → 프로파일 결과 표시 → localStorage 저장
4. **글 생성** (`/generate`) — 주제 입력, 사진 업로드, 장소 검색, 템플릿 모드
5. **결과 확인** (`/result`) — 생성된 글 표시, 해시태그, 저장
6. **히스토리** (`/history`) — 저장된 글 목록/조회/삭제

## API 설계

### POST /api/analyze

```json
// Request
{ "samples": ["글 샘플1", "글 샘플2"] }

// Response
{
  "tone": "친근하고 캐주얼함",
  "sentenceLength": "짧은 문장 선호",
  "endings": ["~했어", "~인데", "~거든"],
  "vocabulary": ["자주 쓰는 표현들"],
  "paragraphStyle": "짧은 단락, 줄바꿈 자주 사용",
  "uniqueTraits": ["특이한 말투 습관들"]
}
```

### POST /api/generate

```json
// Request
{
  "topic": "오늘 카페 다녀온 이야기",
  "profile": { ...StyleProfile },
  "images": [{ "data": "base64...", "mediaType": "image/jpeg" }],
  "placeInfo": { "name": "카페이름", "address": "주소" },
  "mustInclude": "꼭 들어가야 할 내용",
  "mode": "normal" | "template",
  "templateData": { ...TemplateFields }
}

// Response (단일 텍스트)
{ "type": "single", "content": "생성된 블로그 글..." }

// Response (사진+글 인터리빙)
{ "type": "interleaved", "segments": [{ "type": "text"|"image", ... }] }

// Response (템플릿 모드)
{ "type": "template", "templateData": { ...구조화된 리뷰 데이터 } }
```

### POST /api/hashtags

```json
// Request
{ "content": "블로그 글 내용", "topic": "주제" }

// Response
{ "hashtags": ["#태그1", "#태그2", ...] }
```

### POST /api/search-place

```json
// Request
{ "query": "검색어" }

// Response
{ "places": [{ "name": "장소명", "category": "카테고리", "address": "주소", "telephone": "전화번호" }] }
```

### /api/posts

```json
// POST - 글 저장
{ "title": "제목", "storeName": "가게이름", "content": {...}, "hashtags": ["#태그"] }

// GET - 목록 조회 (content 제외)
[{ "id": "uuid", "title": "제목", "store_name": "가게", "hashtags": [...], "created_at": "..." }]

// GET /:id - 단건 조회 (전체 content 포함)
// DELETE /:id - 삭제
```

### Kakao OAuth

- `GET /auth/kakao` — 카카오 로그인 페이지로 리다이렉트
- `GET /auth/kakao/callback` — OAuth 콜백, 세션 생성 후 `/` 이동
- `GET /auth/logout` — 세션 파기 후 `/login` 이동

## Supabase 스키마

```sql
create table saved_posts (
  id          uuid        primary key default gen_random_uuid(),
  title       text        not null,
  store_name  text,
  content     jsonb,
  hashtags    text[],
  created_at  timestamptz default now()
);
```

## 프론트엔드 디자인 가이드

- 심플하고 읽기 편한 UI (네이버 블로그 스타일)
- 모바일 대응 (반응형)
- 분석/생성 중 로딩 상태 표시
- 생성된 글 복사 버튼 제공 (전체 글 / 해시태그만)

## 주의사항

- `ANTHROPIC_API_KEY`는 반드시 서버에서만 사용, 클라이언트에 절대 노출 금지
- 샘플 최소 3개 이상 권장 (분석 정확도)
- Claude API 응답은 JSON 파싱 실패 대비 try-catch 필수
- 세션 기반 인증 — 보호된 페이지(`/`, `/generate`, `/result`, `/history`)는 requireAuth 미들웨어 적용

## 개발 명령어

```bash
npm install       # 의존성 설치
npm run dev       # 개발 서버 실행 (nodemon)
npm start         # 프로덕션 실행
```

## 환경변수 (.env)

```
ANTHROPIC_API_KEY=        # Claude API 키
PORT=3000
NAVER_CLIENT_ID=          # 네이버 개발자센터 Client ID
NAVER_CLIENT_SECRET=      # 네이버 개발자센터 Client Secret
SUPABASE_URL=             # Supabase 프로젝트 URL
SUPABASE_ANON_KEY=        # Supabase anon 키
KAKAO_REST_API_KEY=       # 카카오 앱 REST API 키
KAKAO_CLIENT_SECRET=      # 카카오 앱 Client Secret
KAKAO_REDIRECT_URI=       # http://localhost:3000/auth/kakao/callback
SESSION_SECRET=           # express-session 시크릿
```

## 진행 상황

### 완료

- 프로젝트 초기 세팅
- Express 서버 구축
- `/api/analyze` — 스타일 프로파일 추출
- `/api/generate` — 블로그 글 생성 (단일 텍스트 / 사진+글 인터리빙 / 템플릿 모드)
- `/api/hashtags` — 해시태그 자동 생성
- `/api/search-place` — 네이버 장소 검색 연동
- `/api/posts` — 글 저장/목록/조회/삭제 (Supabase)
- Kakao OAuth 2.0 로그인/로그아웃
- 인증 미들웨어 (requireAuth) — 보호된 페이지 접근 제어
- 페이지 분리 (index → generate → result → history)
- 네이버 스타일 UI 디자인 (페이지별 CSS 분리)
- 사진 업로드 (드래그앤드롭 + 파일 입력, 다중 선택)
- 사진+글 인터리빙 기능
- 식당 리뷰 템플릿 모드 (섹션별 사진, 메뉴 평점, 구조화된 결과)
- 히스토리 페이지 (카드형 목록, 조회, 삭제)
- 결과 페이지 복사 기능 (전체 글 / 해시태그만)
- 글 저장 → Supabase 연동
- 파비콘 추가

### 다음 단계

- (미정 — 추가 기능 기획 필요)
