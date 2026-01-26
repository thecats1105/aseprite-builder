# Aseprite Builder

[English](./README.md) | **한국어**

> [!CAUTION]
> **중요: Aseprite EULA 준수 사항 및 보안**
> Aseprite의 [EULA](https://github.com/aseprite/aseprite/blob/main/EULA.txt)에 따라, 빌드된 바이너리를 제3자에게 배포하는 것은 엄격히 금지되어 있습니다. 본 프로젝트는 **R2 버킷을 비공개(private)**로 유지하고, Cloudflare Workers를 통해 **허용된 IP(본인)**만 접근할 수 있도록 설계되었습니다. 반드시 본인만 파일에 접근할 수 있도록 보장해야 하며, 빌드된 파일을 절대 공개적으로 공유하지 마십시오.

GitHub Actions를 사용하여 Aseprite를 자동으로 빌드하고, Cloudflare R2에 안전하게 저장하며, 자신의 IP로만 접근을 제한하는 전용 Workers 백엔드를 통해 다운로드합니다.

## 🚀 설정 가이드

### 1. 리포지토리 포크 (Fork)

이 리포지토리를 본인의 GitHub 계정으로 **포크(Fork)**합니다.

### 2. GitHub Actions 워크플로우 활성화

포크한 리포지토리의 **Actions** 탭으로 이동하여 `Build and release Aseprite` 워크플로우를 활성화합니다.

### 3. `wrangler.jsonc` 수정

프로젝트 루트의 `wrangler.jsonc` 파일을 편집하여 본인의 Cloudflare 환경에 맞게 수정합니다:

- `name`: 본인의 Workers 서비스 이름
- `vars.GITHUB_REPOSITORY`: `<GITHUB_USERNAME>/aseprite-builder:main`
- `kv_namespaces`: IP 화이트리스팅 및 캐싱을 위한 KV 네임스페이스 ID
- `r2_buckets`: 본인의 R2 버킷 이름 및 바인딩

### 4. Cloudflare Workers 배포

`wrangler` CLI를 사용하여 프로젝트를 배포합니다:

```bash
bunx wrangler deploy
```

### 5. Secrets 생성

`.env.example` 파일을 참조하여 `wrangler secret put` 명령어로 필요한 비밀 키들을 생성합니다:

```bash
# API 호출 및 다운로드 인증을 위한 마스터 키
bunx wrangler secret put ACCESS_KEY

# GitHub Actions 트리거를 위한 Personal Access Token (repo 스코프 필요)
bunx wrangler secret put GITHUB_TOKEN

# R2 스토리지 접근을 위한 자격 증명
bunx wrangler secret put R2_ACCESS_KEY_ID
bunx wrangler secret put R2_ACCOUNT_ID
bunx wrangler secret put R2_BUCKET
bunx wrangler secret put R2_SECRET_ACCESS_KEY
```

---

## 🛠️ API 엔드포인트 (백엔드)

모든 관리자용 엔드포인트는 `X-Access-Key: <ACCESS_KEY>` 헤더를 포함해야 합니다.

### 🔒 다운로드 및 보안 (핵심 기능)

#### `GET /:version/:os`

- **설명**: 특정 버전 및 OS의 Aseprite 파일을 다운로드합니다.
- **보안**: **IP 화이트리스트 검증**. 데이터베이스(KV)에 등록된 IP 주소 또는 localhost에서만 접근이 가능합니다.
- **작동 방식**: IP 검증 성공 시, 60초 동안 유효한 임시 R2 Presigned URL로 리다이렉트됩니다.
- **OS**: `Windows`, `macOS`, `Linux`

### 📋 정보 조회

#### `GET /versions`

- **설명**: R2 버킷에 성공적으로 빌드되어 저장된 Aseprite 버전 목록을 반환합니다.

### ⚙️ 관리 (인증 필요)

#### `POST /auth/add`

- **설명**: 현재 IP 또는 특정 IP를 다운로드 화이트리스트에 추가합니다.
- **본문(Body)**: `{ "ips": ["1.2.3.4"] }`

#### `POST /auth/remove`

- **설명**: 화이트리스트에서 특정 IP를 제거합니다.
- **본문(Body)**: `{ "ips": ["1.2.3.4"] }`

#### `POST /build/:version`

- **설명**: GitHub Actions를 통해 특정 버전의 Aseprite 빌드를 수동으로 트리거합니다.
- **쿼리(Query)**: 이미 빌드가 존재하더라도 다시 빌드하려면 `?force=true`를 사용하세요.

#### `DELETE /versions?version=<v>`

- **설명**: R2 버킷에서 특정 버전의 Aseprite 빌드를 삭제합니다.
- **헤더**: `X-Access-Key: <ACCESS_KEY>`
- **쿼리(Query)**: `version` (예: `1.2.3` 또는 `v1.2.3`)

---

## ⏰ 자동 업데이트 (Cron 트리거)

매일 자동으로 실행되어(기본값 15:00 UTC) Aseprite 공식 리포지토리의 새로운 안정화 버전을 감지합니다. 새로운 버전이 발견되면 자동으로 빌드 프로세스를 시작합니다.

```bash
# 테스트를 위해 로컬에서 실행
bunx wrangler dev --test-scheduled

# 스케줄 이벤트를 수동으로 트리거
curl -X GET "http://localhost:8787/__scheduled?cron=0+15+*+*+*"
```
