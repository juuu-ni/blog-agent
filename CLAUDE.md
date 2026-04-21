# 블로그 글쓰기 에이전트

내 말투를 학습해서 똑같은 스타일로 블로그 글을 써주는 웹사이트.

## 프로젝트 개요

- 사용자가 본인 블로그 글 텍스트를 붙여넣어 말투 샘플 등록
- Claude API가 샘플 분석 → 말투 프로파일 추출 (어조, 어미, 문장 패턴 등)
- 주제 입력 시 학습된 말투로 블로그 글 생성

## 스택

- **Frontend**: HTML + CSS + Vanilla JS (단일 파일 또는 멀티 파일)
- **Backend**: Node.js + Express
- **AI**: Anthropic Claude API (`claude-sonnet-4-20250514`)
- **Storage**: 서버 메모리 or JSON 파일 (MVP 단계, DB 없음)

## 프로젝트 구조

```
/
├── public/
│   ├── index.html        # 메인 페이지
│   ├── style.css         # 스타일
│   └── app.js            # 클라이언트 로직
├── server/
│   ├── index.js          # Express 서버 진입점
│   ├── routes/
│   │   ├── analyze.js    # POST /api/analyze
│   │   └── generate.js   # POST /api/generate
│   └── lib/
│       └── claude.js     # Claude API 호출 유틸
├── .env                  # 환경변수 (gitignore)
└── package.json
```

## UI 구성 (스텝 방식)

1. **샘플 등록** — 텍스트 붙여넣기, 여러 개 추가/삭제 가능
2. **스타일 분석** — 분석 버튼 → 프로파일 결과 표시
3. **글 생성** — 주제 입력 → 내 말투로 블로그 글 출력

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
{ "topic": "오늘 카페 다녀온 이야기", "profile": { ...StyleProfile } }

// Response
{ "content": "생성된 블로그 글..." }
```

## 프론트엔드 디자인 가이드

- 심플하고 읽기 편한 UI
- 모바일 대응 (반응형)
- 분석/생성 중 로딩 상태 표시
- 생성된 글 복사 버튼 제공

## 주의사항

- `ANTHROPIC_API_KEY`는 반드시 서버에서만 사용, 클라이언트에 절대 노출 금지
- 샘플 최소 3개 이상 권장 (분석 정확도)
- Claude API 응답은 JSON 파싱 실패 대비 try-catch 필수

## 개발 명령어

```bash
npm install       # 의존성 설치
npm run dev       # 개발 서버 실행 (nodemon)
npm start         # 프로덕션 실행
```

## 환경변수 (.env)

```
ANTHROPIC_API_KEY=your-api-key-here
PORT=3000
```
