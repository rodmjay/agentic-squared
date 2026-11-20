#!/usr/bin/env bash
# Refreshes ds/ with a stripped public copy of the shared design system: comments and package headers removed,
# only the agentic brand kept. The design system is installed outside this repo; DS_COPY points at its copy script.
set -euo pipefail
cd "$(dirname "$0")/.."
: "${DS_COPY:?set DS_COPY to the design system copy script (installed outside this repo)}"
node "$DS_COPY" --public --brand agentic ds brands/agentic/design-system.css i18n.js check-i18n.mjs
