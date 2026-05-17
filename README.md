# 블로그 에이전트

개인 말투를 학습해 자동으로 블로그 글을 생성해주는 AI 웹 서비스

배포 주소: https://blog-agent-production-0ffd.up.railway.app

## 프로젝트 배경

네이버 블로그 체험단 활동을 하면서, 매번 방문 후 글을 쓰는 데 많은 시간이 걸린다는 문제를 직접 겪었다. 특히 "내 말투와 다르게 생성된 글은 그대로 쓸 수 없다"는 점이 기존 AI 글쓰기 도구의 한계였다. 이를 해결하기 위해 사용자의 실제 블로그 글을 학습해 개인 말투 프로파일을 추출하고, 그 스타일 그대로 새 글을 생성하는 에이전트를 직접 개발했다.

## 주요 기능

- **말투 학습**: 본인이 쓴 블로그 샘플을 분석해 어조, 어미, 문장 패턴 등 개인 말투 프로파일 추출
- **블로그 글 생성**: 가게 정보와 사진을 입력하면 학습된 말투로 블로그 글 자동 생성
- **사진+글 인터리빙**: 업로드한 사진 사이사이에 글이 자연스럽게 배치되는 구조 생성
- **템플릿 모드**: 외부/내부/디테일 사진을 카테고리별로 구분해 섹션별 구조화된 리뷰 생성
- **블로그 제목 자동 추천**: 생성된 글 내용을 바탕으로 MZ 감성 블로그 제목 추천
- **임시저장**: 글 생성 페이지 입력 내용을 Supabase에 자동 저장, 재방문 시 복원
- **결과 인라인 편집**: 생성된 글을 결과 페이지에서 바로 수정 가능
- **글 저장/관리**: 생성한 글을 저장하고 히스토리에서 조회/삭제
- **말투 프로파일 관리**: 저장된 프로파일 속성 직접 편집 및 재사용
- **카카오 로그인**: Kakao OAuth 2.0 소셜 로그인, 사용자별 데이터 완전 분리

## 기술 스택

| 분류 | 기술 |
|------|------|
| Frontend | HTML, CSS, Vanilla JavaScript |
| Backend | Node.js, Express |
| AI | Anthropic Claude API (claude-sonnet-4-6) |
| 외부 API | 네이버 Local Search API (장소 검색) |
| 데이터베이스 | Supabase (PostgreSQL) |
| 인증 | Kakao OAuth 2.0 + express-session |
| 보안 | Helmet (CSP), express-rate-limit, XSS/CSRF 방어 |
| 배포 | Railway |

## 시스템 구조

```
사용자
  │
  ├─ 샘플 입력 → POST /api/analyze → Claude API → 말투 프로파일 추출 → Supabase 저장
  │
  └─ 글 생성 요청 → POST /api/generate
                        ├─ 사진(base64) + 말투 프로파일 + 장소 정보
                        └─ Claude API (멀티모달) → 사진+글 인터리빙 결과 반환
```

- 말투 프로파일은 어조, 문장 길이, 어미 패턴, 어휘 습관, 단락 스타일 6개 속성으로 구조화
- `/api/generate` 응답은 `single` / `interleaved` / `template` 3가지 타입으로 분기

## 기술적 도전과 해결

**1. 말투 학습의 구조화**
Claude API에 단순히 "이 스타일로 써줘"라고 요청하면 일관성이 없었다. 샘플 분석 단계에서 어조·어미·어휘·단락 스타일 등 6개 속성으로 프로파일을 구조화(JSON)하고, 글 생성 시 이를 그대로 주입하는 방식으로 재현율을 높였다.

**2. 사진+글 인터리빙**
단순히 글 끝에 사진을 붙이는 게 아니라, 여러 장의 사진 사이사이에 관련 내용이 자연스럽게 배치되는 구조가 필요했다. Claude의 멀티모달 기능으로 사진을 직접 분석해 각 이미지에 맞는 문단을 생성하고, `interleaved` 타입으로 순서를 맞춰 반환하는 방식으로 구현했다.

**3. CSP와 인라인 스크립트 충돌**
Helmet의 Content Security Policy 적용 후 로그인 페이지가 동작하지 않는 문제가 발생했다. `scriptSrc: ["'self'"]` 정책이 HTML 내 인라인 `<script>` 블록을 모두 차단했기 때문이었다. 모든 인라인 스크립트를 외부 JS 파일로 분리해 해결했고, 이후 전체 프로젝트에 동일 원칙을 적용했다.

**4. Railway 배포 환경 이슈**
로컬에서는 정상 동작하던 카카오 OAuth 콜백이 Railway 배포 후 오류가 발생했다. Railway는 리버스 프록시 뒤에서 동작하므로 `app.set('trust proxy', 1)` 설정 없이는 세션 쿠키의 `secure` 속성이 올바르게 처리되지 않는 문제였다.

**5. 보안**
- Rate Limiting: Claude API 호출에 IP당 15분/10회 제한
- 인증 미들웨어: 보호된 모든 페이지·API에 `requireAuth` 일괄 적용
- 사용자 데이터 격리: 모든 DB 쿼리에 `user_id` 필터 적용 (타인 데이터 접근 차단)
- 세션 쿠키: `httpOnly`, `sameSite`, `secure` 옵션 적용

## 시작하기

```bash
npm install
npm run dev
```

### 환경변수 (.env)

```
ANTHROPIC_API_KEY=
PORT=3000
NAVER_CLIENT_ID=
NAVER_CLIENT_SECRET=
SUPABASE_URL=
SUPABASE_ANON_KEY=
KAKAO_REST_API_KEY=
KAKAO_CLIENT_SECRET=
KAKAO_REDIRECT_URI=        # 로컬: http://localhost:3000/auth/kakao/callback
SESSION_SECRET=
```
