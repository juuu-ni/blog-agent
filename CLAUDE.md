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
- **Storage**: Supabase (PostgreSQL) — saved_posts, style_profiles 테이블
- **External API**: Naver Local API (장소 검색)

## 프로젝트 구조

```
/
├── public/
│   ├── index.html           # 메인 페이지 (샘플 등록 + 스타일 분석)
│   ├── generate.html        # 글 생성 페이지
│   ├── result.html          # 생성 결과 표시 페이지
│   ├── history.html         # 저장된 글 목록 페이지
│   ├── login.html           # 카카오 로그인 페이지
│   ├── style-profiles.html  # 말투 프로파일 관리 페이지
│   ├── app.js               # 샘플 등록 & 분석 로직
│   ├── generate.js          # 글 생성 & 이미지 업로드 로직
│   ├── result.js            # 결과 표시 & 템플릿 렌더링 로직
│   ├── history.js           # 저장 글 목록 & CRUD 로직
│   ├── style-profiles.js    # 말투 프로파일 목록 & 수정 로직
│   ├── auth-header.js       # 인증 헤더 (사용자명 + 로그아웃)
│   ├── style.css            # 전역 스타일
│   ├── index.css            # 메인 페이지 전용 스타일
│   ├── generate.css         # 생성 페이지 전용 스타일
│   ├── result.css           # 결과 페이지 전용 스타일
│   ├── history.css          # 히스토리 페이지 전용 스타일
│   ├── login.css            # 로그인 페이지 전용 스타일
│   ├── style-profiles.css   # 말투 프로파일 페이지 전용 스타일
│   └── favicon.svg
├── server/
│   ├── index.js          # Express 서버 진입점
│   ├── routes/
│   │   ├── auth.js       # GET /auth/kakao, /auth/kakao/callback, /auth/logout
│   │   ├── analyze.js    # POST /api/analyze
│   │   ├── generate.js   # POST /api/generate
│   │   ├── hashtags.js   # POST /api/hashtags
│   │   ├── search-place.js # POST /api/search-place
│   │   ├── posts.js      # CRUD /api/posts
│   │   └── profiles.js   # CRUD /api/profiles
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
3. **스타일 분석** — 분석 버튼 → 프로파일 결과 표시 → Supabase 저장
4. **글 생성** (`/generate`) — 주제 입력, 사진 업로드, 장소 검색, 템플릿 모드
5. **결과 확인** (`/result`) — 생성된 글 표시, 해시태그, 저장
6. **히스토리** (`/history`) — 저장된 글 목록/조회/삭제
7. **말투 프로파일** (`/style-profiles`) — 저장된 프로파일 목록/수정/삭제

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
// POST - 글 저장 (user_id 자동 포함)
{ "title": "제목", "storeName": "가게이름", "content": {...}, "hashtags": ["#태그"] }

// GET - 목록 조회 (로그인 사용자 글만, content 제외)
[{ "id": "uuid", "title": "제목", "store_name": "가게", "hashtags": [...], "created_at": "..." }]

// GET /:id - 단건 조회 (전체 content 포함, 본인 글만)
// DELETE /:id - 삭제 (본인 글만)
```

### /api/profiles

```json
// GET - 본인 말투 프로파일 목록
[{ "id": "uuid", "name": "프로파일명", "profile": {...}, "created_at": "..." }]

// POST - 프로파일 저장 (이름 중복 시 덮어쓰기)
{ "name": "프로파일명", "profile": { ...StyleProfile } }

// PUT /:id - 프로파일 수정 (이름 + 속성 직접 편집)
{ "name": "프로파일명", "profile": { ...StyleProfile } }

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
  user_id     text        not null,   -- 카카오 사용자 ID
  title       text        not null,
  store_name  text,
  content     jsonb,
  hashtags    text[],
  created_at  timestamptz default now()
);

create table style_profiles (
  id          uuid        primary key default gen_random_uuid(),
  user_id     text        not null,   -- 카카오 사용자 ID
  name        text        not null,
  profile     jsonb       not null,   -- StyleProfile JSON
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
- 세션 기반 인증 — 보호된 페이지(`/`, `/generate`, `/result`, `/history`, `/style-profiles`)는 requireAuth 미들웨어 적용
- `/api/posts`, `/api/profiles`도 requireAuth 적용 — user_id 필터로 본인 데이터만 접근 가능

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
- `/api/posts` — 글 저장/목록/조회/삭제 (Supabase, 사용자별 분리)
- `/api/profiles` — 말투 프로파일 저장/목록/수정/삭제 (Supabase, 사용자별 분리)
- Kakao OAuth 2.0 로그인/로그아웃
- 인증 미들웨어 (requireAuth) — 보호된 페이지 + API 접근 제어
- 페이지 분리 (index → generate → result → history → style-profiles)
- 네이버 스타일 UI 디자인 (페이지별 CSS 분리)
- 사진 업로드 (드래그앤드롭 + 파일 입력, 다중 선택)
- 사진+글 인터리빙 기능
- 식당 리뷰 템플릿 모드 (섹션별 사진, 메뉴 평점, 구조화된 결과)
- 히스토리 페이지 (카드형 목록, 조회, 삭제)
- 결과 페이지 복사 기능 (전체 글 / 해시태그만)
- 글 저장 → Supabase 연동 (카카오 계정별 분리)
- 말투 프로파일 Supabase 저장 (기존 localStorage → Supabase 마이그레이션)
- 말투 프로파일 관리 페이지 (`/style-profiles`) — 속성 직접 편집 기능
- 파비콘 추가
- 보안 강화: 자격증명 로그 제거 및 세션 쿠키 보안 옵션 적용 (`httpOnly`, `secure`, `sameSite`)
- 보안 강화: SQL 인젝션, XSS, CSRF, Rate Limiting 등 전반적인 취약점 수정
- 보안 강화: Helmet CSP(Content Security Policy) 설정 추가
- 보안 강화: API 인증 오류 응답 일관성 수정 (401/403 명확히 구분)
- README.md 작성 (프로젝트 소개 및 설정 가이드)
- 로그인 페이지 CSP 버그 수정 — 인라인 스크립트를 `public/login.js`로 분리 (Helmet CSP `scriptSrc` 차단 문제 해결)
- 로그인/회원가입 UI 통합 — LOG IN / SIGN UP 탭 토글, 슬라이딩 인디케이터, 아이콘 인풋, SUBMIT 버튼 디자인
- `/signup` 라우트를 `login.html`로 통합 서빙 (pathname으로 기본 탭 결정)
- `/api/map-image` — 가게 선택 시 OSM 정적 지도 이미지 자동 추가 (네이버 API `mapx`/`mapy` 좌표 활용, 일반·템플릿 모드 모두 Claude에 전달)

### 주의사항 (추가)

- Helmet CSP `scriptSrc: ["'self'"]`가 인라인 `<script>` 블록을 차단함 → 모든 JS는 반드시 외부 파일로 분리
- 네이버 Local Search API `mapx`/`mapy`는 WGS84 × 10⁶ 형식 → 좌표 변환 시 `/ 1_000_000` 사용
- 영업시간은 네이버 Local Search API에서 제공하지 않아 자동 기입 불가 (수동 입력)
- OSM 정적 지도(`staticmap.openstreetmap.de`) 응답이 3~5초 소요될 수 있음

### 다음 단계

- (미정 — 추가 기능 기획 필요)
