# 仅用于隔离验证，不替换或升级生产数据库。
# 官方 PostgreSQL 18.4 amd64 镜像摘要经官方 Registry 只读核对。
FROM pgvector/pgvector:0.8.6-pg18-trixie@sha256:78bf48b801e792f99e3ac62b5036fd3876e9be48afda16c1e331af1c75ceb2ff AS vector
FROM postgres:18.4-trixie@sha256:4cc13dede823cab4e05290c7fb3350fb4e599ecabd9b07e6706b5d5e8f5bc929
# 同为PG18和Debian trixie；实际版本、扩展加载和向量运算仍须运行时验证。
COPY --from=vector /usr/lib/postgresql/18/lib/vector.so /usr/lib/postgresql/18/lib/vector.so
COPY --from=vector /usr/share/postgresql/18/extension/vector* /usr/share/postgresql/18/extension/
COPY --from=vector /usr/share/doc/pgvector/ /usr/share/doc/pgvector/
