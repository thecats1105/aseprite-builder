# Aseprite Builder

**English** | [한국어](./README.ko.md)

> [!CAUTION]
> **Important: Aseprite EULA Compliance & Security**
> According to the Aseprite [EULA](https://github.com/aseprite/aseprite/blob/main/EULA.txt), distributing built binaries to third parties is strictly prohibited. This project is designed to keep the **R2 bucket private** and allow access **only to authorized IPs (you)** via Cloudflare Workers. You must ensure that only you can access the files, and never share the built files publicly.

Automatically build Aseprite using GitHub Actions, store them securely in Cloudflare R2, and download them via a dedicated Workers backend that restricts access to your own IP.

## 🚀 Setup Guide

### 1. Fork the Repository

**Fork** this repository to your own GitHub account.

### 2. Enable GitHub Actions Workflow

Navigate to the **Actions** tab of your forked repository and enable the `Build and release Aseprite` workflow.

### 3. Modify `wrangler.jsonc`

Edit the `wrangler.jsonc` file in the project root to match your Cloudflare environment:

- `name`: Your Workers service name
- `vars.GITHUB_REPOSITORY`: `<GITHUB_USERNAME>/aseprite-builder:main`
- `kv_namespaces`: KV namespace IDs for IP whitelisting and caching
- `r2_buckets`: Your R2 bucket name and binding

### 4. Deploy to Cloudflare Workers

Deploy the project using the `wrangler` CLI:

```bash
npx wrangler deploy
```

### 5. Create Secrets

Refer to the `.env.example` file and create the necessary secrets using `wrangler secret put`:

```bash
# Master key for API calls and download authentication
npx wrangler secret put ACCESS_KEY

# GitHub Personal Access Token for triggering actions (requires repo scope)
npx wrangler secret put GITHUB_TOKEN

# Credentials for R2 storage access
npx wrangler secret put R2_ACCESS_KEY_ID
npx wrangler secret put R2_ACCOUNT_ID
npx wrangler secret put R2_BUCKET
npx wrangler secret put R2_SECRET_ACCESS_KEY
```

---

## 🛠️ API Endpoints (Backend)

All administrative endpoints must include the `X-Access-Key: <ACCESS_KEY>` header.

### 🔒 Download & Security (Core Feature)

#### `GET /:version/:os`

- **Description**: Downloads the Aseprite file for a specific version and OS.
- **Security**: **IP Whitelist Verification**. Access is only allowed from IP addresses registered in the database (KV) or localhost.
- **How it works**: Upon successful IP verification, it redirects to a 60-second temporary R2 Presigned URL.
- **OS**: `Windows`, `macOS`, `Linux`

### 📋 Information

#### `GET /versions`

- **Description**: Returns a list of Aseprite versions successfully built and stored in the R2 bucket.

### ⚙️ Administration (Authentication Required)

#### `POST /auth/add`

- **Description**: Adds your current IP or a specific IP to the download whitelist.
- **Body**: `{ "ips": ["1.2.3.4"] }`

#### `POST /auth/remove`

- **Description**: Removes specific IPs from the whitelist.
- **Body**: `{ "ips": ["1.2.3.4"] }`

#### `POST /build/:version`

- **Description**: Manually triggers an Aseprite build for a specific version via GitHub Actions.
- **Query**: Use `?force=true` to rebuild even if a build already exists.

---

## ⏰ Auto-Update (Cron Trigger)

Runs automatically every day (default 15:00 UTC) to detect new stable releases from the official Aseprite repository. If a new version is found, it automatically starts the build process.

```bash
# Test cron trigger locally
npx wrangler dev --remote --test-scheduled
```
