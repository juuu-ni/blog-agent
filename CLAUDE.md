# 블로그 글쓰기 에이전트

내 말투를 학습해서 똑같은 스타일로 블로그 글을 써주는 웹사이트.

## 스택

- **Frontend**: HTML + CSS + Vanilla JS (멀티 파일, 번들러 없음)
- **Backend**: Node.js + Express
- **AI**: Anthropic Claude API (`claude-sonnet-4-6`)
- **Auth**: Kakao OAuth 2.0 + express-session
- **Storage**: Supabase (PostgreSQL)
- **External API**: Naver Local API (장소 검색)
- **배포**: Render

## 개발 명령어

```bash
npm install
npm run dev   # nodemon (개발)
npm start     # 프로덕션
```

## 코딩 규칙

- **Vanilla JS 유지** — React, Vue 등 프레임워크 추가 금지
- **인라인 `<script>` 절대 금지** — Helmet CSP로 차단됨, 모든 JS는 외부 파일로 분리
- 새 파일 만들기 전에 기존 파일 수정 우선
- 페이지별 파일 1:1 구조 유지 (html/js/css 세트)
- Claude API 응답은 JSON 파싱 실패 대비 try-catch 필수

## 페이지 구조

인증 컬럼: `requireAuth` = 로그인하지 않으면 접근 불가 (미들웨어가 `/login`으로 리다이렉트), `불필요` = 비로그인 상태에서도 접근 가능

| 경로 | 파일 | 인증 |
|------|------|------|
| `/` | index.html | requireAuth |
| `/login` | login.html | 불필요 |
| `/generate` | generate.html | requireAuth |
| `/result` | result.html | requireAuth |
| `/history` | history.html | requireAuth |
| `/style-profiles` | style-profiles.html | requireAuth |

## API 라우터

claudeLimiter 컬럼: `✓` = IP당 15분에 10회 제한 적용 (Claude API 호출 라우트), `✗` = 제한 없음

| 경로 | 설명 | claudeLimiter |
|------|------|---------------|
| `/auth` | 카카오 OAuth 로그인/로그아웃 | ✗ |
| `/api/analyze` | 말투 분석 | ✓ |
| `/api/generate` | 블로그 글 생성 (normal/template 모드) | ✓ |
| `/api/hashtags` | 해시태그 생성 | ✓ |
| `/api/suggest-title` | 제목 추천 | ✓ |
| `/api/search-place` | 네이버 Local API 장소 검색 | ✗ |
| `/api/posts` | 글 저장/조회/삭제 | ✗ |
| `/api/profiles` | 말투 프로파일 관리 | ✗ |
| `/api/drafts` | 임시저장 upsert | ✗ |

## 아키텍처 결정 이유

- **Vanilla JS**: 학습·포트폴리오 목적 — 번들러 없이 단순하게 유지하는 것이 의도된 선택
- **파일 1:1 구조**: 페이지별 독립성 유지, 공통 스타일은 `style.css`, 공통 로직은 `auth-header.js`
- **`/api/generate` 3분기**: `mode: "normal"` → single/interleaved, `mode: "template"` → template — 이 분기 구조는 의도적, 임의로 통합하지 말 것
- **`/api/drafts` 사용자당 1건 upsert**: `draft_posts.user_id` unique 제약에 의존

## 테스트

자동화 테스트 없음. 변경 후 `npm run dev`로 서버 올리고 해당 페이지 브라우저에서 직접 확인.

## 알려진 함정

- `ANTHROPIC_API_KEY`는 서버에서만 사용 — 클라이언트 노출 절대 금지
- 모든 보호된 페이지·API에 `requireAuth` 미들웨어 적용 필수
- 네이버 Local API `mapx`/`mapy`는 WGS84 × 10⁶ 형식 → `/ 1_000_000` 변환 필요
- 영업시간은 네이버 API에서 제공하지 않아 수동 입력
- Claude API 호출 라우트에 `claudeLimiter` 적용 (IP당 15분에 10회)
- Render 배포 시 `app.set('trust proxy', 1)` 필수 — 없으면 카카오 OAuth 콜백 오류

## 커밋 스타일

`feat:` / `fix:` / `refactor:` / `docs:` 접두사 사용
