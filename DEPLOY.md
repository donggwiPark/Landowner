# Google Cloud Run 배포 가이드

이 앱은 Express(API + 정적 파일 서빙) 풀스택 구조라 **Cloud Run**에 배포합니다.
로컬에 Docker가 없어도 됩니다 — `gcloud run deploy --source .` 가 클라우드(Cloud Build)에서
`Dockerfile`로 컨테이너를 빌드·배포합니다.

## 0. 사전 준비 (최초 1회)

```bash
# 1) gcloud CLI 설치 (macOS, Homebrew)
brew install --cask google-cloud-sdk
#   또는 공식 설치 스크립트: https://cloud.google.com/sdk/docs/install

# 2) 개인 구글 계정으로 로그인
gcloud auth login

# 3) 본인 프로젝트 선택 (PROJECT_ID는 본인 것으로 교체)
gcloud config set project YOUR_PROJECT_ID

# 4) 필요한 API 활성화
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
```

> 결제(billing) 계정이 프로젝트에 연결돼 있어야 Cloud Run/Build가 동작합니다.
> (콘솔: https://console.cloud.google.com/billing)

## 1. 배포

```bash
gcloud run deploy soondoong-list \
  --source . \
  --region asia-northeast3 \
  --allow-unauthenticated
```

- `soondoong-list` : 서비스 이름 (원하는 이름으로 변경 가능)
- `--region asia-northeast3` : 서울 리전
- `--allow-unauthenticated` : 웹앱이므로 누구나 접속 가능하게 공개
- 컨테이너 포트는 자동으로 `8080`(`PORT` 환경변수)로 주입되며, 서버가 이를 읽습니다.

배포가 끝나면 `https://soondoong-list-xxxxx.a.run.app` 형태의 URL이 출력됩니다.

## 2. 환경변수 / 시크릿 설정

| 환경변수 | 필수 | 용도 |
|---|---|---|
| `GOOGLE_SERVICE_ACCOUNT_JSON` | ✅ | 구글 시트 읽기/쓰기용 서비스 계정 JSON. **없으면 명부 조회·편집이 동작하지 않습니다.** |
| `GOOGLE_SPREADSHEET_ID` | – | 기본 연동 스프레드시트 ID (미지정 시 코드 기본값) |
| `GEMINI_API_KEY` | – | AI 데이터 요약 기능 |
| `KAKAO_CLIENT_ID` | – | 실제 카카오 OAuth 로그인 (미설정 시 샌드박스 로그인) |
| `KAKAO_CLIENT_SECRET` | – | 카카오 Client Secret |
| `APP_URL` | – | 배포된 서비스 URL (카카오 redirect 자동 구성용) |

### 서비스 계정 키 발급 (본인 GCP 프로젝트)

```bash
# 1) 서비스 계정 생성
gcloud iam service-accounts create sheets-bot --display-name="Sheets Bot"

# 2) 키 파일 발급 (service-account.json 생성됨 — 이 파일은 커밋 금지!)
gcloud iam service-accounts keys create service-account.json \
  --iam-account=sheets-bot@YOUR_PROJECT_ID.iam.gserviceaccount.com

# 3) Google Sheets API 활성화
gcloud services enable sheets.googleapis.com
```

그리고 **연동할 구글 스프레드시트를 위 서비스 계정 이메일에 "편집자"로 공유**하세요.

### 시크릿으로 주입 (권장 — Secret Manager)

```bash
gcloud services enable secretmanager.googleapis.com

# 키 JSON을 시크릿으로 등록
gcloud secrets create google-sa-json --data-file=service-account.json

# Cloud Run 런타임 서비스 계정에 시크릿 접근 권한 부여
PROJECT_NUMBER=$(gcloud projects describe YOUR_PROJECT_ID --format='value(projectNumber)')
gcloud secrets add-iam-policy-binding google-sa-json \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

# 배포 시 시크릿을 환경변수로 연결
gcloud run deploy soondoong-list \
  --source . \
  --region asia-northeast3 \
  --allow-unauthenticated \
  --update-secrets GOOGLE_SERVICE_ACCOUNT_JSON=google-sa-json:latest \
  --set-env-vars GEMINI_API_KEY=여기에키
```

> 로컬 발급한 `service-account.json`은 시크릿 등록 후 삭제하세요. (`.gitignore`에 이미 `*.json`은 없으므로 절대 커밋하지 않도록 주의)

배포 후 URL 갱신:

```bash
gcloud run services update soondoong-list \
  --region asia-northeast3 \
  --update-env-vars APP_URL=https://본인-서비스-url.a.run.app
```

### 실제 카카오 로그인을 쓸 경우

카카오 디벨로퍼스 > 내 애플리케이션 > 카카오 로그인 > Redirect URI에
다음 주소를 등록하세요:

```
https://본인-서비스-url.a.run.app/api/auth/kakao/callback
```

## 3. 재배포

코드를 수정한 뒤 같은 명령을 다시 실행하면 새 버전으로 교체됩니다:

```bash
gcloud run deploy soondoong-list --source . --region asia-northeast3 --allow-unauthenticated
```

## ⚠️ 이전 회사 키 폐기 (중요)

이 코드에는 과거 **회사 GCP 프로젝트(`unified-adviser-484207-n7`)의 서비스 계정
비공개 키가 하드코딩**되어 있었습니다. 지금은 코드에서 제거했지만, **그 키는 이미
노출된 것으로 간주하고 반드시 폐기**해야 합니다 (회사 계정 권한 보유자가 수행):

1. https://console.cloud.google.com/iam-admin/serviceaccounts → 프로젝트 선택
2. `soondoon-sheet@unified-adviser-484207-n7.iam.gserviceaccount.com` 선택
3. "키" 탭에서 키 ID `858fed37ab68c07720bcd092caa7c37f97adb490` 삭제
4. (선택) 더 이상 안 쓰면 서비스 계정 자체 삭제

본인 개인 프로젝트에서는 위 2번 절차로 **새 키를 발급**해 사용합니다.
