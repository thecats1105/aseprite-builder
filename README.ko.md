# Aseprite Builder

[English](./README.md) | **한국어**

> [!CAUTION]
> **중요: Aseprite EULA 준수 사항**
> Aseprite의 [EULA](https://github.com/aseprite/aseprite/blob/main/EULA.txt)에 따라, 빌드된 바이너리를 제3자에게 배포하는 것은 금지되어 있습니다. 본 프로젝트는 R2 저장소를 비공개로 설정하고, Cloudflare Workers를 통해 허용된 IP(본인)만 접근할 수 있도록 설계되었습니다. **반드시 본인만 접근 가능한 상태를 유지해야 하며, 빌드된 파일을 공개적으로 공유하지 마십시오.**

GitHub Actions를 사용하여 Aseprite를 자동으로 빌드하고, Cloudflare R2에 저장하며, 전용 Workers 백엔드를 통해 안전하게 다운로드할 수 있는 프로젝트입니다.

## 🚀 시작하기

### 1. 리포지토리 포크 (Fork)

이 리포지토리를 본인의 GitHub 계정으로 포크합니다.

### 2. GitHub Actions 활성화

포크한 리포지토리의 **Actions** 탭으로 이동하여 `Build and release Aseprite` 워크플로우를 활성화(`Enable workflow`)합니다.

### 3. Wrangler 설정 수정

`wrangler.jsonc` 파일을 열어 다음 항목들을 본인의 환경에 맞게 수정합니다.

- `name`: Workers 서비스 이름
- `vars.GITHUB_REPOSITORY`: `<GITHUB_USERNAME>/aseprite-builder:main`
- `kv_namespaces`: 본인이 생성한 KV 네임스페이스 ID (IP 저장 및 캐시용)
- `r2_buckets`: 본인이 생성한 R2 버킷 이름 및 바인딩

### 4. Cloudflare Workers 배포

`wrangler` CLI를 사용하여 프로젝트를 배포합니다.

```bash
bunx wrangler deploy
```

### 5. Secrets 설정

`.env.example` 파일을 참조하여 필요한 비밀 키들을 Workers에 설정합니다.

```bash
bunx wrangler secret put ACCESS_KEY              # API 호출 시 사용할 인증 키
bunx wrangler secret put GITHUB_TOKEN            # GitHub Actions 트리거용 PAT (repo 권한 필요)
bunx wrangler secret put R2_ACCESS_KEY_ID        # R2 액세스 키 ID
bunx wrangler secret put R2_ACCOUNT_ID           # Cloudflare 계정 ID
bunx wrangler secret put R2_BUCKET               # R2 버킷 이름
bunx wrangler secret put R2_SECRET_ACCESS_KEY    # R2 시크릿 액세스 키
```

---

## 🛠️ API 엔드포인트 (Backend)

모든 API 호출 시 인증이 필요한 경우 `X-Access-Key` 헤더에 설정한 `ACCESS_KEY` 값을 포함해야 합니다.

### 다운로드 및 버전 조회

#### `GET /versions`

- **설명**: R2 버킷에 빌드되어 저장된 Aseprite 버전 목록을 조회합니다.
- **인증**: 불필요 (단, 결과는 캐싱될 수 있음)

#### `GET /:version/:os`

- **설명**: 특정 버전 및 OS의 Aseprite 파일을 다운로드합니다.
- **인증**: **IP 화이트리스트 검증**. 허용된 IP에서만 접근 가능합니다.
- **작동**: 검증 성공 시 60초간 유효한 R2 Presigned URL로 리다이렉트됩니다.
- **OS 파라미터**: `Windows`, `macOS`, `Linux`

### 관리자 전용 (인증 필요)

#### `POST /auth/add`

- **설명**: 다운로드 권한을 부여할 IP 주소를 추가합니다.
- **헤더**: `X-Access-Key: <YOUR_ACCESS_KEY>`
- **Body**:
  ```json
  { "ips": ["1.2.3.4"] }
  ```

#### `POST /auth/remove`

- **설명**: 허용된 IP 주소 목록에서 특정 IP를 제거합니다.
- **헤더**: `X-Access-Key: <YOUR_ACCESS_KEY>`
- **Body**:
  ```json
  { "ips": ["1.2.3.4"] }
  ```

#### `POST /build/:version`

- **설명**: 특정 버전의 Aseprite 빌드를 강제로 시작합니다. (GitHub Actions 트리거)
- **헤더**: `X-Access-Key: <YOUR_ACCESS_KEY>`
- **쿼리 파라미터**: `?force=true` (기존 빌드가 있어도 무시하고 진행)

---

## ⏰ 자동 업데이트 (Cron)

본 프로젝트는 매일 15:00 UTC에 자동으로 실행되는 Cron Trigger가 설정되어 있습니다.

- Aseprite 공식 저장소의 최신 태그를 확인합니다.
- 현재 빌드된 버전보다 새로운 버전이 발견되면 자동으로 빌드 워크플로우를 트리거합니다.
