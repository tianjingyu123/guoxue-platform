# 国学平台服务端 — 测试报告格式与关键指标

## 1. 报告格式

### 1.1 Jest 控制台输出（默认）

```
PASS  src/modules/circle/circle.service.spec.ts (5.2 s)
  CircleService
    创建圈子
      √ 创建免费圈子成功 (12 ms)
      √ 创建付费圈子成功 (8 ms)
    加入圈子
      √ 加入成功 (15 ms)
      √ 重复加入抛出错误 (3 ms)

Test Suites: 1 passed, 1 total
Tests:       4 passed, 4 total
Snapshots:   0 total
Time:        5.2 s
```

### 1.2 JUnit XML 报告（CI/CD 集成）

文件：`junit.xml`（由 jest-junit 生成）

```xml
<testsuites name="guoxue-server-unit">
  <testsuite name="CircleService" tests="4" failures="0" errors="0" time="5.2">
    <testcase classname="src/modules/circle/circle.service.spec.ts:28"
              name="创建圈子 创建免费圈子成功" time="0.012"/>
    <testcase classname="src/modules/circle/circle.service.spec.ts:36"
              name="创建圈子 创建付费圈子成功" time="0.008"/>
  </testsuite>
</testsuites>
```

用途：GitHub Actions / Jenkins / SonarQube 等 CI 系统可直接解析。

### 1.3 覆盖率报告（HTML + lcov）

- `coverage/lcov-report/index.html` — HTML 可视化报告
- `coverage/lcov.info` — LCOV 格式（CI 上传 Codecov/Coveralls）
- `coverage/coverage-summary.json` — JSON 汇总

## 2. 关键指标定义

| 指标 | 定义 | 当前阈值 | 目标阈值 |
|------|------|----------|----------|
| **Statements** | 代码语句覆盖率 = 已执行语句数 / 总语句数 | 80% | 80% |
| **Branches** | 分支覆盖率 = 已覆盖分支数 / 总分支数 (if/else/case) | 70% | 80% |
| **Functions** | 函数覆盖率 = 已调用函数数 / 总函数数 | 80% | 80% |
| **Lines** | 行覆盖率 = 已执行行数 / 总代码行数 | 80% | 80% |

### 2.1 补充质量指标

| 指标 | 计算方式 | 目标值 |
|------|----------|--------|
| **测试/源码比** | 测试文件数 / 源文件数 | ≥ 0.8 |
| **E2E 覆盖场景** | 完整业务链路测试数 | ≥ 10 |
| **平均测试执行时间** | 总时间 / 测试数 | ≤ 50ms/测试 |
| **Mock 隔离率** | 无真实外部依赖的测试比例 | 100%（src/） |
| **CI 通过率** | 最近 30 天 CI 成功次数 / 总运行次数 | ≥ 95% |

## 3. 报告数据源

| 数据 | 来源 | 输出位置 |
|------|------|----------|
| 单元测试结果 | `jest --testPathPattern "src/"` | 控制台 + junit.xml |
| 集成测试结果 | `jest --config jest.config.ts --testPathPattern "test/"` | 控制台 |
| 覆盖率数据 | `jest --coverage` | `coverage/` 目录 |
| CI 汇总 | GitHub Actions Summary | PR Checks 面板 |

## 4. CI/CD 中的测试流程

```
提交代码
  ├── typecheck (tsc --noEmit)
  ├── lint (eslint)
  ├── test-packages (bazi-engine + ziwei-engine)
  ├── build-server (nest build)
  ├── test-server (单元测试 + 覆盖率)
  │   └── 上传 coverage-report + junit-unit
  ├── e2e (集成测试)
  │   └── 上传 junit-e2e
  └── checks-pass (汇总关卡)
```

## 5. 本地开发命令

```bash
# 运行所有单元测试
pnpm test:server

# 运行集成测试
pnpm test:e2e

# 运行覆盖率报告
pnpm test:coverage

# Pre-commit 自动检查
pnpm precommit

# 跳过 pre-commit（紧急情况）
git commit --no-verify -m "hotfix: xxx"
```

## 6. 覆盖率排除规则

以下文件不纳入覆盖率统计：
- `src/**/*.spec.ts` — 测试文件自身
- `src/.backup/**` — 备份文件
- `src/main.ts` — 应用入口（仅启动逻辑）
- `*.module.ts` — NestJS 模块定义（纯声明式）
