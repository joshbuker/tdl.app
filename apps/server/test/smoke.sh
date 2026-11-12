#!/usr/bin/env bash
# Smoke test for the container image and compose.yaml: start the stack, sign up,
# log in, read /me, then tear everything down. Exits non-zero on any failure.
#
# Uses its own Compose project name and a throwaway env file, so it never touches
# a real deployment's containers, volumes or .env.
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
port="${SMOKE_PORT:-3999}"
base="http://localhost:${port}"
work="$(mktemp -d)"
env_file="${work}/smoke.env"

cat >"${env_file}" <<EOF
POSTGRES_PASSWORD=smoke-test-password
AUTH_SECRET=$(head -c 32 /dev/urandom | base64 | tr -d '\n')
ORIGIN=${base}
TRUST_PROXY=false
TDL_PORT=${port}
EOF

compose() {
  docker compose --project-directory "${repo_root}" --file "${repo_root}/compose.yaml" \
    --project-name tdl-smoke --env-file "${env_file}" "$@"
}

cleanup() {
  status=$?
  if [ "${status}" -ne 0 ]; then
    echo "smoke: FAILED; server logs follow" >&2
    compose logs server >&2 || true
  fi
  compose down --volumes --remove-orphans >/dev/null 2>&1 || true
  rm -rf "${work}"
  exit "${status}"
}
trap cleanup EXIT

fail() {
  echo "smoke: $*" >&2
  exit 1
}

echo "smoke: starting the stack"
compose up --detach --build --wait --wait-timeout 180

# POSTs JSON to a path and prints the response headers and body; fails on a non-200 status.
post_json() {
  local path="$1" body="$2" out="${work}/response"
  local code
  code="$(curl --silent --show-error --output "${out}" --dump-header "${work}/headers" --write-out '%{http_code}' \
    --header 'content-type: application/json' --header 'user-agent: smoke' \
    --data "${body}" "${base}${path}")"
  [ "${code}" = 200 ] || fail "POST ${path} returned ${code}: $(cat "${out}")"
}

token_from_headers() {
  tr -d '\r' <"${work}/headers" | sed -n 's/^set-auth-token: //Ip' | head -n 1
}

echo "smoke: signing up"
post_json /api/auth/sign-up/email '{"email":"smoke@example.com","password":"correct horse battery","name":"Smoke Test","username":"smoke","givenName":"Smoke","familyName":"Test","acceptTerms":true}'
[ -n "$(token_from_headers)" ] || fail "sign-up returned no session token"

echo "smoke: logging in"
post_json /api/auth/sign-in/username '{"username":"smoke","password":"correct horse battery"}'
token="$(token_from_headers)"
[ -n "${token}" ] || fail "log-in returned no session token"

echo "smoke: reading /me"
me="$(curl --silent --show-error --fail-with-body --header "authorization: Bearer ${token}" "${base}/me")" \
  || fail "GET /me failed: ${me}"
case "${me}" in
  *'"username":"smoke"'*) ;;
  *) fail "GET /me returned an unexpected body: ${me}" ;;
esac

echo "smoke: PASS"
