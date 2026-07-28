#!/usr/bin/env bash
set -Eeuo pipefail

: "${PUBLIC_API_URL:?必须设置 PUBLIC_API_URL}"
: "${PUBLIC_H5_URL:?必须设置 PUBLIC_H5_URL}"
: "${EXPECTED_ORIGIN:?必须设置 EXPECTED_ORIGIN}"

command -v curl >/dev/null || {
  echo "缺少命令：curl" >&2
  exit 1
}

headers_file="$(mktemp)"
trap 'rm -f "$headers_file"' EXIT

api_base="${PUBLIC_API_URL%/}"
h5_url="${PUBLIC_H5_URL%/}/"

curl --fail --silent --show-error \
  --connect-timeout 10 --max-time 30 \
  "${api_base}/api/v1/health" >/dev/null
curl --fail --silent --show-error \
  --connect-timeout 10 --max-time 30 \
  "$h5_url" >/dev/null

curl --fail --silent --show-error \
  --connect-timeout 10 --max-time 30 \
  -H "Origin: ${EXPECTED_ORIGIN}" \
  -D "$headers_file" \
  "${api_base}/api/v1/health" >/dev/null

if ! grep -qi "^access-control-allow-origin: ${EXPECTED_ORIGIN}\r\?$" "$headers_file"; then
  echo "CORS 校验失败：响应未允许 ${EXPECTED_ORIGIN}" >&2
  exit 1
fi

echo "冒烟检查通过：API、H5、CORS"
