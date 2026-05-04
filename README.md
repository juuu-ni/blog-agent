# 블로그 에이전트 🤖

개인 말투를 학습해 자동으로 블로그 글을 생성해주는 AI 에이전트

## 주요 기능

- **말투 학습**: 본인이 쓴 블로그 샘플을 분석해 개인 말투 프로파일 추출
- **블로그 글 생성**: 가게 정보와 사진을 입력하면 개인 말투로 블로그 글 자동 생성
- **템플릿 모드**: 외부/내부/디테일 사진을 카테고리별로 구분해 섹션별 글 생성
- **글 저장/관리**: 생성한 글을 저장하고 히스토리에서 관리
- **말투 프로파일 관리**: 저장된 말투 프로파일 수정 및 재사용
- **카카오 로그인**: 카카오 OAuth를 통한 소셜 로그인

## 기술 스택

| 분류 | 기술 |
|------|------|
| Frontend | HTML, CSS, JavaScript |
| Backend | Node.js, Express |
| AI | Anthropic Claude API |
| 가게 정보 | 네이버 검색 API |
| 데이터베이스 | Supabase (PostgreSQL) |
| 인증 | Kakao OAuth |
| 배포 | Railway |

## 시작하기

```bash
npm install
npm run dev
```

## 배포

https://blog-agent-production-0ffd.up.railway.app
