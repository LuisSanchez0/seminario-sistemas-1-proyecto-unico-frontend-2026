#!/usr/bin/env bash
set -euo pipefail
# PUBLIC_API_URL comes from the backend deployment (Jenkins upstream job or ci/demo-deploy.sh), which verified it and
# published it to SSM Parameter Store. In quick_tunnel mode it is a TEMPORARY https://<random>.trycloudflare.com/api.
: "${VERCEL_TOKEN:?Jenkins secret text lumina-vercel-token}" "${VERCEL_ORG_ID:?Terraform vercel_team_id output}" \
  "${VERCEL_PROJECT_ID:?Terraform vercel_project_id output}" "${FRONTEND_URL:?Terraform frontend_url output}" \
  "${PUBLIC_API_URL:?verified API URL from the backend deployment}" "${GIT_COMMIT:?}" "${VERCEL_CLI_VERSION:?}"
export VERCEL_TOKEN VERCEL_ORG_ID VERCEL_PROJECT_ID
[[ "$PUBLIC_API_URL" =~ ^https://[a-z0-9.-]+/api$ ]] || { echo 'PUBLIC_API_URL must be https://<backend-host>/api' >&2; exit 1; }
[[ "$FRONTEND_URL" =~ ^https://[a-z0-9.-]+/?$ ]] || { echo 'FRONTEND_URL must be an https origin' >&2; exit 1; }
# Linking metadata never outlives the job (and .vercel is git-ignored).
trap 'rm -rf .vercel' EXIT
vercel() { npx --yes "vercel@$VERCEL_CLI_VERSION" "$@"; }
vercel --version 2>&1 | grep -qx "$VERCEL_CLI_VERSION" || { echo "Vercel CLI $VERCEL_CLI_VERSION required" >&2; exit 1; }
node ci/verify-artifact.mjs
node ci/check-api.mjs
# Also rejects bundles not compiled with exactly PUBLIC_API_URL, or referencing an HTTP API.
node ci/stage-vercel-output.mjs
# Single production deployer: the tested artifact, uploaded as-is. stdout is the deployment URL.
deployment_url=$(vercel deploy --prebuilt --prod --yes)
vercel inspect "$deployment_url" --wait >/dev/null
DEPLOYMENT_URL="$deployment_url" node ci/verify-deployment.mjs
