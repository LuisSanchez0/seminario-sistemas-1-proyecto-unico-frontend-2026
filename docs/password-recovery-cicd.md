# Password recovery and frontend CI/CD

The existing login link now opens the lazy `/auth/restore` component within the existing LuminaBeauty authentication layout. Its three states collect email, verify an eight-digit code, then collect/confirm a new password. Reactive forms/signals use the existing shared error alerts, `FormUtils` matching validator and `apiErrorMessage` (including express-validator errors). All fields have labels; state changes move focus. Loading prevents duplicate submissions; resend observes the backend cooldown; back/reload discards reset authorization. The token stays only in component memory.

The `PasswordRecoveryService` calls `/api/auth/password/request`, `/verify` and `/reset`. Request sends email; verification sends email/code and receives a five-minute token; reset sends only the token and matching new/confirm passwords. Backend policy is authoritative: minimum four characters, matching registration/login. Successful reset returns to `/auth/login?reset=success` with a confirmation message. The frontend does not send a trusted `verified=true`, persist reset tokens or put them in a URL.

The backend retains its `2fa` and `reset` purposes, shared Nodemailer email and Redis code helper. Codes expire after 15 minutes, permit five attempts and are consumed atomically. Sends have a 30-second cooldown, five/account/hour and 30 requests/IP/hour. The backend audit found that ordinary login currently returns a JWT directly and verification follows registration; this work does not misrepresent that as per-login MFA. Existing four-hour JWTs have no server revocation mechanism.

## Commands

Use Node 22.12+ (the Jenkins runtime), npm and the checked-in lockfile:

```bash
npm ci
npm test -- --watch=false
npm run build -- --configuration production
node ci/verify-artifact.mjs
```

The verified output is **`dist/luminabeauty-app/browser`**. `prebuild` generates ignored `src/environments/environment.production.ts`, preserving public payment-account configuration and applying `PUBLIC_API_URL`. Both existing environment import conventions are replaced in production. The local default `/api` works behind a proxy; Vercel deployment requires the HTTPS API URL verified by the backend deployment (TEMPORARY `https://<random>.trycloudflare.com/api` in the default Quick Tunnel mode) and refuses HTTP. URLs containing credentials, queries or fragments are rejected. Backend/JWT/SMTP/AWS secrets must never be included in frontend configuration. If invoking `ng build` directly, first run `node ci/configure-build.mjs`.

The component tests cover navigation, validation, invalid/expired/limited errors, server policy responses, mismatch, loading, reset/redirect, resends, network/server errors and accessibility. The backend's `qa/recovery-browser.js` exercises this actual compiled app in Chrome against isolated real MongoDB/Redis/SMTP services. Run from the backend repository with FRONTEND_DIR pointing here. It tests all 12 required recovery steps, browser axe including contrast, and mobile/desktop overflow. No E2E PASS is inferred from unit tests.

## Jenkins and Vercel

Production hosting is **Vercel over HTTPS**; Jenkins is the only production deployer (the Vercel project has no Git integration, so pushes never deploy). Stages: checkout → runtime → npm ci → full tests → production build → artifact verification/tar packaging → deploy/verify Vercel. An earlier failed stage stops the pipeline. `main` (the existing default branch), non-PR, plus explicit `DEPLOY=true` is required to deploy. develop/features/PRs test/build only. Configure the Vercel credential only in a trusted main job. There is no automatic commit or push.

Linux agent `lumina-ci`: Node 22.12+, npm/npx, tar and Bash. Jenkins needs Pipeline/Declarative, Git/Multibranch and Credentials Binding. `lumina-vercel-token` is a secret-text credential exposed as `VERCEL_TOKEN` (environment only, never on the command line). The CLI is pinned with `VERCEL_CLI_VERSION=62.7.0` in the Jenkinsfile and its version is checked before use.

Parameters (copy from Terraform outputs in the backend repository):

| Name | Value |
|---|---|
| DEPLOY | false by default; true only on reviewed protected main |
| PUBLIC_API_URL | Verified URL from the backend job (passed automatically when it triggers this job) or SSM parameter `/lumina/<env>/public-api-url`. Quick Tunnel URLs are TEMPORARY: redeploy whenever they change |
| FRONTEND_URL | `frontend_url` (Vercel production domain, or the custom domain) |
| VERCEL_ORG_ID | `vercel_team_id` (personal account: the account ID from Vercel settings) |
| VERCEL_PROJECT_ID | `vercel_project_id` |

`ci/deploy.sh` writes the release marker, refuses an API URL that is not live or whose CORS does not allow `FRONTEND_URL` (`ci/check-api.mjs`, catches a rotated tunnel URL), stages the tested build as Vercel Build Output API v3 (`ci/stage-vercel-output.mjs`, which also rejects bundles referencing an HTTP API), runs `vercel deploy --prebuilt --prod`, waits with `vercel inspect`, then `ci/verify-deployment.mjs` checks over HTTPS with certificate validation: `release.json` equals the commit, index and every JS/CSS hash match, hashed assets are `immutable`, deep links (`/auth/login`, `/auth/restore`, `/products`, `/cart`, `/my-orders`, `/admin/dashboard`, `/admin/reports/sales`) return the Angular index with 200, a missing chunk returns 404, and the live bundle embeds exactly `PUBLIC_API_URL`. `.vercel/` is git-ignored and removed after the job.

Angular routing on Vercel uses Build Output routes, not the old S3 error-document behavior: real files first, then extension-less paths rewrite to `index.html`. Infrastructure (Vercel project, optional custom domain) is defined once in the backend `infra/terraform`; Terraform does not create deployments. Deployment order is backend first, then frontend. See the backend `docs/temporary-quick-tunnel-demo.md` (current TEMPORARY demo, manual no-Jenkins runbook) and `docs/https-vercel-migration.md` (stable option, S3 website decommission).

Groovy syntax checks and local equivalent commands do not substitute for real Jenkins execution. No configured Jenkins controller, Vercel token or valid AWS credentials were available; real pipelines, plan and live deployment remain BLOCKED. No apply was performed.

The current lockfile also produces npm audit advisories (16: 5 moderate, 9 high, 2 critical). They are recorded for review; this task does not force unrelated upgrades. The production build reports an existing CurrencyPipe warning and a small initial bundle warning. See `docs/verification-report.md` for fresh final results and Git state.
