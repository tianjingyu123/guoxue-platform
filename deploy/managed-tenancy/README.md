# 独立入口Linux交付模板

仅模板，未安装、启用服务或执行云命令，不是正式镜像。当前实际启动验收是本机专用Prisma客户端的编译产物；正式Linux包仍须在隔离构建环境按同一提交生成自己的Prisma客户端、编译共享包与服务端，保留全部模块依赖并核镜像/产物摘要。不能拿其他窗口dist或未检查的共享客户端代替。

`managed-lease@.service.in` 必须替换服务用户/组、Node绝对路径、合同对应的内存/CPU/进程限额后，再在目标Linux运行 `systemd-analyze verify` 和实际受限用户启动验收。客户服务账户不能登录主机、持数据库维护权限或访问另一客户的配置；Unix UID、网络、宿主机及cgroup隔离须实际验证。此处没有声称Windows检查等同Linux隔离，也没有替客户自动选择配额。

每客户独立目录 `/opt/rebu-managed/<instance>/server`，只读配置 `/etc/rebu-managed/<instance>.env`，只读凭据目录 `/run/rebu-managed/<instance>`。实例名由维护登记固定，不能接受HTTP传入路径。环境文件至少显式提供以下项，实际值只放受限文件，不保存仓库、聊天或运行报告：

- `MANAGED_CUSTOMER_ID`：控制面已登记客户。
- `MANAGED_CONTROL_READONLY_URL`：该客户专属只读视图账号，不能复用全控制库账号。
- `MANAGED_LEASE_CREDENTIALS_FILE`：仅本客户引用的受限JSON文件，含固定业务连接和认证密钥；如模型启用，须有本客户签名核验和调用授权。
- `MANAGED_LEASE_PORT`：独立端口；`MANAGED_LEASE_BIND=127.0.0.1`，经已验收的HTTPS网关进入。

配置文件和凭据文件仅维护者及指定服务账户可读；服务只需要PG与已授权供应商的出站连接。代码没有接入正式Redis/BullMQ、COS或向量实例，不能凭配置键存在或SDK安装宣称它们接通。日志只保留泛化失败和ready，不打印环境、连接、请求正文或密钥。

上线前必须验收合同、应用和主体映射、最小权限、订单RLS、固定写围栏、反向代理源IP与正文限制、域名/证书、备份副本、容量和RPO/RTO。服务重启不得自动重放UNKNOWN或DISPATCHING请求。迁出/切换按 [经营与迁出交接](../../docs/operations/多租户经营与迁出交接-20261003.md) 先冻结旧写入者，再受控恢复与换绑定；超时先查状态和审计。

官方定义来源为 [systemd exec源文档](https://github.com/systemd/systemd/blob/main/man/systemd.exec.xml) 与 [资源控制源文档](https://github.com/systemd/systemd/blob/main/man/systemd.resource-control.xml)；目标系统版本及行为仍须实测。官方网页本次返回403，未将文档访问当作目标Linux能力验证。
