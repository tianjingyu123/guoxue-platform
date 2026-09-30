#!/bin/sh
set -eu

case "$(hostname)" in
  VM-0-10-ubuntu) role=app ;;
  VM-0-14-ubuntu) role=operations ;;
  *) echo 'UNKNOWN_TARGET_NODE'; exit 65 ;;
esac

ROOT_DIR=/opt/guoxue \
ENV_FILE=/opt/guoxue/shared/.env.production \
DEPLOY_TARGET=tencent \
NODE_ROLE="$role" \
COMPOSE_PROJECT_NAME=guoxue \
ROLLBACK_VERIFY_ONLY=true \
  bash /opt/guoxue/current/scripts/release/rollback-fixed-release.sh \
    preprod-cd055084-20260903-r1 preprod-cd055084-20260903-r1
