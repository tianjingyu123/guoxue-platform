# CLAUDE.md — 国学传统文化综合平台

**计划文件：** `.claude/plans/stateful-knitting-star.md`
**项目目录：** `guoxue-platform/`
**当前阶段：** P0 基建（第1-2周）

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
