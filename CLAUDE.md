# CLAUDE.md — 国学传统文化综合平台

**计划文件：** `.claude/plans/stateful-knitting-star.md`
**项目目录：** `guoxue-platform/`
**当前阶段：** P2 增强

### 启动时务必
1. 读取 `.claude/plans/stateful-knitting-star.md` 了解完整规划
2. 读取 `.claude/projects/C--Users-Administrator-Desktop/memory/ongoing_task.md` 了解当前进度
3. 检查工具链状态后向用户汇报

### 代码安全准则（不可违反）
1. **修改前先备份：** 目标文件复制到 `.backup/` 目录，加时间戳后缀
2. **方案先行：** 涉及 2 个以上文件或架构变动，先出优化方案，确认后再改
3. **原子提交：** 每个功能点一个 git commit，出错可精确 revert
4. **不删备份：** 修改验证通过后再清理备份文件

### 用户环境
- Windows 11，使用 DeepSeek API（batch 脚本启动）
- 语言偏好：简体中文
- 交互风格：简洁直接，非关键决策不频繁确认

### 多 Agent 并行开发规范（不可违反）

#### 1. 文件隔离（最高优先级）
- **硬规则：任意两个并行 agent 不得操作同一文件。**
- 分区策略：按目录拆分（agent A = modules a-f，agent B = modules g-l）
- 每个 agent prompt 中必须列出 **精确的待修改文件清单**
- 如果两个任务会触及同一文件 → 串行执行，禁止并行

#### 2. 任务粒度控制
- **适合并行：** 机械化重复工作（加装饰器、写 DTO 测试）、独立模块开发
- **禁止并行：** 跨模块架构重构、公共库修改（common/、prisma/、redis/）、schema 变更
- 每个 agent 产出必须能 **独立编译 + 独立测试**

#### 3. 并行数量上限
| 任务类型 | 最大 agent 数 |
|---------|-------------|
| 机械化装饰器/测试生成 | 4 |
| 中等复杂度业务开发 | 2 |
| 架构/公共代码变更 | 1（串行） |

#### 4. Agent Prompt 必须包含的要素
- [ ] 精确的文件路径清单（"只修改以下文件：..."）
- [ ] 代码模式/模板（给出可复制的示例）
- [ ] 验证命令（`npx tsc --noEmit` 或 `npx jest`）
- [ ] "先 Read 再 Edit" 的明确指令
- [ ] 命名规范要求（中文/英文、大小写等）

#### 5. Agent 完成后强制验证（由主线程执行）
```
1. tsc --noEmit          # 零错误
2. jest --no-coverage    # 全部通过
3. git diff --stat       # 确认变更范围
```
任何一步失败 → 串行修复，**不得再启动新的并行 agent**。

#### 6. 代码风格一致性
- Swagger 装饰器：`@ApiTags("中文名")`，summary 用中文描述
- 测试 mock 模式：统一用 `jest.fn()` mock PrismaService，避免混用不同 mock 风格
- 导入路径：模块间引用用 `../../common/`，同模块内用 `./`

#### 7. 事后抽查
- 每个 agent 产出至少抽查 2 个文件
- 检查项：重复代码、不一致命名、缺失导入、遗漏的守卫装饰器
