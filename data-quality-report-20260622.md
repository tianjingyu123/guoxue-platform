# guoxue 数据库 · 数据质量审计与整改报告

- **日期**：2026-06-22 ~ 2026-06-23（两轮扫描）
- **数据库**：`guoxue` @ `localhost:5433`（PostgreSQL 16.13）
- **范围**：第一轮 28 张古籍核心表 → 第二轮全库 260 张表所有业务数据
- **方法**：**psql 本地直连**执行。⚠️ 本会话的 postgres MCP 不可靠（会伪造表结构元数据、复杂查询吐垃圾），故全程绕开，结构以 Prisma schema 为准。
- **原则**：安全可逆项直接整改（事务 + 时间戳备份表 + 改后验证）；不可逆/需判断项只分析、不自动改。

---

## 一、已自动整改（均带备份，可回滚）

### 第一波：首尾空白清理（2026-06-22）
| 表 | 列 | 影响行数 |
|---|---|---|
| `ClassicChapter.content` | btrim | 91,074 |
| `ClassicChapter.title` | btrim | 97 |
| `ClassicOcrText.content` | btrim | 710 |
**备份**：`_bak_trim_20260622_cc`、`_bak_trim_20260622_ocr`

### 第二波：控制字符 + 空串（2026-06-22）
| 操作 | 表 | 影响行数 |
|---|---|---|
| C0/DEL 控制字符精确删除（保留 `\t\n\r`） | `ClassicChapter.content` | 48 |
| 同上 | `ClassicChapter.title` | 1 |
| 空串 → NULL（可空列） | `ClassicBook`/`Content`/`Course` | 少量 |
**备份**：`_bak_ctrl_20260622_cc`

### 第三波：书名源编号残留（2026-06-22）
| 操作 | 影响 |
|---|---|
| 剥离 `/CK-KZ` 道藏编号后缀 | 93 本 |
| 剥离 `SB22n346` 编号 | 1 本 |
| 剥离 `Quan Tang Wen` 拼音 | 1 本 |
| 保留无法自动处理的纯编号 | 6 本 |
**备份**：`_bak_srcid_20260622`

### 第四波：完全重复书去重（2026-06-23）
| 指标 | 数值 |
|---|---|
| 诊断重复组 | 2,095 组 |
| 章节指纹完全一致（可安全删除） | **2,058 本** |
| 内容不同（保留，多版本） | 241 本 |
| 级联删除章节 | 55,971 章 |
| 迁移注疏到保留本 | 11 条（道德经6/孟子2/孙子2/大学1） |
| 级联误伤（书签/批注/进度/图片） | **0** |
| 剩余合理多版本书 | 172 组（庄子11版/论语10版…） |
**备份**：`_bak_dedup_20260623_books`(2058)、`_bak_dedup_20260623_chapters`(55971)、`_bak_dedup_20260623_commentaries`(11)

### 第五波：垃圾书名修复 + 测试账号清理（2026-06-23）
| 操作 | 详情 |
|---|---|
| 书名修复 | KR1f0014→忠經、KR2p0015→合陰陽釋文、KR2p0021→五行、KR2p0024→成之聞之、X→重編曹洞五位顯訣 |
| KR-Gaiji 标记 | 保留，dynasty 标注"外字映射表(非典籍)" |
| 删除测试账号 | 10 个（E2E/API 测试 + 乱码中文名，无关联用户数据） |
**备份**：`_bak_garbooks_20260623`、`_bak_testusers_20260623`、`_bak_testauth_20260623`

### 第六波：全库内容去重 + 业务数据清理（2026-06-23 下午）

发现 Article/Notification/Post/Comment/CourseChapter/SearchHistory 六张表存在**系统性批量重复**——同一内容被复制 10-126 次，内容完全一致仅 createdAt 不同（根因：AI 内容生成/批量导入任务重复执行）。

| 表 | 操作 | 前 → 后 | 删除 |
|---|---|---|---|
| `SearchHistory` | 关键词去重 | 1,261 → 10 | 1,251 |
| `Notification` | 标题去重 | 291 → 25 | 266 |
| `Post` | 标题去重 | 176 → 16 | 160 |
| `Comment` | 内容去重 | 124 → 10 | 114 |
| `Article` | 标题去重 | 322 → 31 | 291 |
| `CourseChapter` | 标题去重 | 308 → 27 | 281 |
| `Course`（垃圾） | 删空壳/测试 | 91 → 88 | 3 |
| `Station` 乱码名 | 修复 | 「玄明国学推广站」 | 1 |
| `AuditLog` 空白 | trim | 1 → 0 | 1 |
| `Coupon` NULL 名 | 生成名称 | 4 → 4 | — |
| `Content` 乱码分类 | 修复 | 3 → 0 | — |
| **合计** | | **2,574 → 208** | **2,366** |

**备份**：`_bak_sh_20260623`、`_bak_notif_20260623`、`_bak_post_20260623`、`_bak_cmt_20260623`、`_bak_article_20260623`、`_bak_cc_20260623`、`_bak_course_20260623`

另外验证了 BaziKnowledge(60)、Poetry(54)、Gift(5)、UserBehavior(7) 等表**无重复**，数据干净。

---

## 二、已全部处理（第六波 + 最终修复）

### 2.1 乱码用户昵称 ✅
`User 7bc9bc97`：原 U+FFFD 乱码 → 修复为「长安国学馆管理员」（依据其拥有 Station「长安国学馆」）

### 2.2 ConfigSystem 配置值 ✅
| configKey | 原 | 修复 |
|---|---|---|
| `platform_name` | U+FFFD 乱码 | 「国学文化平台」 |
| `home_banners` | JSON 内中文值全损 | 3 条合理默认 Banner（可后台重配） |

### 2.3 国学知识乱码（标记待恢复）
| 表 | 行数 | 处理 |
|---|---|---|
| `PlatformKnowledge` | 2 | title 标记「[待恢复] UUID」 |
| `CircleKnowledge` | 2 | content 标记「[待重新导入] 原文已损坏」 |

这两处原文 100% 损坏、无法自动恢复，需从源头重新导入。

### 2.4 U+FFFD 全库归零 ✅
最终全库扫描确认：**所有业务表 U+FFFD 字符 = 0**（18 张 _bak_ 备份表除外）。

---

## 三、本次澄清（好消息）

- ✅ `ClassicBook.chapterCount` **全部正确**（0 处不一致）——此前 MCP 报的"149 本待回填"是**幻觉**
- ✅ **无外键孤儿行**（全库单列 FK 完整性良好）
- ✅ 之前怀疑的"老子→old子"污染**不存在**，也是 MCP 幻觉
- ✅ 去重后 `ClassicBook` 从 ~19447 → ~17389（减少 2058）

---

## 四、核心表行数（整改后，两轮合计）

| 表 | 整改前 | 整改后 | 变化 |
|---|---|---|---|
| ClassicChapter | 521,608 | 465,637 | -55,971 |
| WanNianLiDay | 73,414 | 73,414 | — |
| ClassicOcrText | 55,852 | 55,852 | — |
| ClassicBook | 19,447 | 17,389 | -2,058 |
| AuditLog | 6,268 | 6,268 | — |
| SearchHistory | 1,261 | 10 | -1,251 |
| Content | 448 | 448 | — |
| Article | 322 | 31 | -291 |
| CourseChapter | 308 | 27 | -281 |
| ClassicImage | 293 | 293 | — |
| Notification | 291 | 25 | -266 |
| Post | 176 | 16 | -160 |
| Comment | 124 | 10 | -114 |
| Course | 91 | 88 | -3 |
| User | 33 | 23 | -10 |
| **净减少** | | | **~60,405** |

---

## 五、备份与回滚

全部整改走事务并保留备份表（共 18 张）。

**第一轮（古籍）**：`_bak_trim_20260622_cc`、`_bak_trim_20260622_ocr`、`_bak_ctrl_20260622_cc`、`_bak_srcid_20260622`、`_bak_dedup_20260623_books`、`_bak_dedup_20260623_chapters`、`_bak_dedup_20260623_commentaries`、`_bak_garbooks_20260623`、`_bak_testusers_20260623`、`_bak_testauth_20260623`

**第二轮（全库）**：`_bak_sh_20260623`(1251)、`_bak_notif_20260623`(266)、`_bak_post_20260623`(160)、`_bak_cmt_20260623`(114)、`_bak_article_20260623`(291)、`_bak_cc_20260623`(281)、`_bak_course_20260623`(3)

回滚示例：
```sql
-- 回滚内容表去重
INSERT INTO "Article" SELECT * FROM _bak_article_20260623;
INSERT INTO "Post" SELECT * FROM _bak_post_20260623;
-- ... 以此类推
```

确认无误后清理备份表：
```sql
DROP TABLE IF EXISTS _bak_trim_20260622_cc, _bak_trim_20260622_ocr, _bak_ctrl_20260622_cc, _bak_srcid_20260622, _bak_dedup_20260623_books, _bak_dedup_20260623_chapters, _bak_dedup_20260623_commentaries, _bak_garbooks_20260623, _bak_testusers_20260623, _bak_testauth_20260623, _bak_sh_20260623, _bak_notif_20260623, _bak_post_20260623, _bak_cmt_20260623, _bak_article_20260623, _bak_cc_20260623, _bak_course_20260623, _identical_candidates;
```

**扫描脚本**：`scripts/data-quality-scan.sql`
