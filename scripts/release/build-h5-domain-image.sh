#!/usr/bin/env bash
# 只构建候选镜像：不重启、不部署、不修改共享H5或数据库。
set -euo pipefail
if [[ $# -ne 4 ]]; then
  echo '用法: build-h5-domain-image.sh <当前基础镜像repo@sha256:摘要> <h5-domain-候选标签> <server-dist-candidate.zip> <ZIP的SHA256>' >&2
  exit 64
fi
base_image=$1
candidate_tag=$2
dist_zip=$3
expected_hash=$4
[[ "$base_image" =~ ^[^[:space:]]+@sha256:[a-f0-9]{64}$ ]] || { echo '基础镜像必须指定不可变摘要' >&2; exit 64; }
[[ "$candidate_tag" =~ ^h5-domain-[a-z0-9][a-z0-9._-]+$ ]] || { echo '只能使用独立h5-domain-候选标签' >&2; exit 64; }
[[ "$expected_hash" =~ ^[a-f0-9]{64}$ ]] || exit 64
[[ -f "$dist_zip" ]] || { echo '缺少编译包' >&2; exit 66; }
actual_hash=$(sha256sum -- "$dist_zip" | cut -d ' ' -f 1)
[[ "$actual_hash" == "$expected_hash" ]] || { echo '编译包摘要不一致' >&2; exit 65; }
command -v python3 >/dev/null
docker image inspect "$base_image" >/dev/null
if docker image inspect "$candidate_tag" >/dev/null 2>&1; then
  echo '候选标签已经存在，请换新标签，禁止覆盖' >&2
  exit 65
fi
context_dir=$(mktemp -d /tmp/h5-domain-build.XXXXXXXX)
# 校验每个压缩路径，防止解压到临时目录之外。
python3 - "$dist_zip" "$context_dir" <<'PY'
import pathlib, sys, zipfile
target = pathlib.Path(sys.argv[2]).resolve() / 'server-dist'
target.mkdir()
with zipfile.ZipFile(sys.argv[1]) as archive:
    for info in archive.infolist():
        name = info.filename.replace('\\', '/')
        destination = (target / name).resolve()
        if not destination.is_relative_to(target) or ':' in name:
            raise SystemExit('压缩包路径不安全')
        if ((info.external_attr >> 16) & 0o170000) == 0o120000:
            raise SystemExit('压缩包不允许符号链接')
    archive.extractall(target)
if not (target / 'main.js').is_file() or not (target / 'config/h5-entry.js').is_file():
    raise SystemExit('编译包缺少服务入口或域名配置模块')
PY
cat > "$context_dir/Dockerfile" <<'DOCKER'
ARG BASE_IMAGE
FROM ${BASE_IMAGE}
# 仅清理新镜像层内的旧编译输出，不涉及宿主机或运行容器。
RUN rm -rf /app/apps/server/dist
COPY server-dist/ /app/apps/server/dist/
WORKDIR /app
ENTRYPOINT ["node", "apps/server/dist/main.js"]
CMD []
DOCKER
docker build --network=none --build-arg "BASE_IMAGE=$base_image" --tag "$candidate_tag" "$context_dir"
docker image inspect "$candidate_tag" --format '{{.Id}} {{json .Config.Entrypoint}} {{json .Config.Cmd}}'
echo "候选镜像已构建，未部署；构建目录保留于 $context_dir"
