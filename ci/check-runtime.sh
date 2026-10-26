#!/usr/bin/env bash
set -euo pipefail
node -e 'const [major,minor]=process.versions.node.split(".").map(Number); if(major!==22 || minor<12) throw Error("Node 22.12+ required")'
for tool in npm npx tar; do command -v "$tool" >/dev/null; done
