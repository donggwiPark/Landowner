# 토지등소유자 명부 관리 시스템

카카오 로그인 후, 구글 스프레드시트의 토지등소유자 명부를 조회·요약·편집하고
실시간으로 시트에 반영하는 풀스택 웹앱입니다. (React + Express)

## 로컬 실행

**사전 준비:** Node.js

```bash
npm install
npm run dev          # http://localhost:3000
```

## 환경변수

`.env` 파일을 만들고 아래 값을 채웁니다. (`.env.example` 참고)

| 변수 | 필수 | 용도 |
|---|---|---|
| `GOOGLE_SERVICE_ACCOUNT_JSON` | ✅ | 구글 시트 읽기/쓰기용 서비스 계정 JSON (한 줄 문자열) |
| `GOOGLE_SPREADSHEET_ID` | – | 기본 연동 스프레드시트 ID (미지정 시 코드 기본값 사용) |
| `GEMINI_API_KEY` | – | AI 데이터 요약 기능 |
| `KAKAO_CLIENT_ID` | – | 실제 카카오 로그인 (미설정 시 샌드박스 로그인) |
| `KAKAO_CLIENT_SECRET` | – | 카카오 Client Secret |
| `APP_URL` | – | 배포 URL (카카오 redirect 자동 구성용) |

> 서비스 계정 JSON에는 비공개 키가 들어있습니다. **절대 코드에 하드코딩하거나
> 저장소에 커밋하지 마세요.** 환경변수 또는 Secret Manager로만 주입합니다.

## 빌드 / 배포

```bash
npm run build        # dist/ (클라이언트) + dist/server.cjs (서버) 생성
npm start            # 프로덕션 서버 실행
```

구글 클라우드(Cloud Run) 배포 절차는 [`DEPLOY.md`](./DEPLOY.md)를 참고하세요.
