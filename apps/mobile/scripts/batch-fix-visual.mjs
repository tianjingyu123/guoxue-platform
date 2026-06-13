/**
 * 批量视觉修复脚本 (纯 Node.js，无外部依赖)
 * 1. 替换 emoji 表情为简洁文字标签
 * 2. 替换硬编码颜色为 Tailwind 设计令牌
 */
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PAGES_DIR = path.resolve(__dirname, '..', 'src', 'pages');

// ============================================================
// Emoji → 中文文字标签
// ============================================================
const emojiMap = [
  // 导航/操作类
  ['📱', '手机'],
  ['🎬', '视频'],
  ['📷', '拍照'],
  ['🖼', '相册'],
  ['📤', '上传'],
  ['📥', '下载'],
  ['📨', '发送'],
  ['📄', '文件'],
  ['📋', '列表'],
  ['📖', '阅读'],
  ['📚', '书库'],
  ['🔍', '搜索'],
  ['🔒', '锁定'],
  ['🔓', '公开'],
  ['🔑', '密码'],
  ['🔔', '通知'],
  ['🔇', '静音'],
  ['🔊', '音量'],
  ['🎵', '音乐'],

  // 互动/社交类
  ['❤️', '喜欢'],
  ['💬', '评论'],
  ['👁', '浏览'],
  ['👀', '浏览'],
  ['👍', '赞'],
  ['👎', '踩'],
  ['🎉', '庆祝'],
  ['💡', '提示'],
  ['⭐', '收藏'],
  ['🌟', '精选'],
  ['✨', '推荐'],
  ['🔥', '热门'],
  ['🏆', '冠军'],
  ['🥇', '第一'],
  ['🥈', '第二'],
  ['🥉', '第三'],
  ['🎯', '目标'],
  ['💯', '满分'],

  // 用户/人物类
  ['👤', '用户'],
  ['👥', '多人'],
  ['🙋', '举手'],
  ['🧑', '用户'],
  ['👨', '用户'],
  ['👩', '用户'],

  // 购物/电商类
  ['🛒', '购物车'],
  ['🛍', '商品'],
  ['🏷', '标签'],
  ['💰', '收益'],
  ['💳', '支付'],
  ['🪙', '积分'],

  // 时间/状态类
  ['⏰', '提醒'],
  ['⏳', '等待'],
  ['🔄', '刷新'],
  ['✅', '完成'],
  ['📅', '日历'],

  // 警告/状态类
  ['⚠️', '注意'],
  ['❌', '错误'],
  ['🚫', '禁止'],
  ['⭕', '占位'],

  // 国学专用
  ['☯', '太极'],
  ['🏯', '国学'],
  ['⛩', '牌坊'],
  ['🎋', '竹'],
  ['🪷', '莲花'],

  // 天气/自然
  ['☀', '晴'],
  ['🌙', '月'],

  // 通讯/工具
  ['🔗', '链接'],
  ['📎', '附件'],
  ['📝', '记录'],
  ['📢', '公告'],
  ['📣', '广播'],
  ['🎤', '麦克风'],
  ['🎧', '耳机'],
  ['📺', '视频'],
  ['🎲', '占卜'],
  ['🎨', '设计'],

  // 其他常用
  ['✚', '+'],
];

// ============================================================
// 硬编码颜色 → Tailwind 设计令牌
// ============================================================
const colorMap = [
  // primary 色系
  { from: /bg-\[#C41E3A\]/gi, to: 'bg-primary' },
  { from: /text-\[#C41E3A\]/gi, to: 'text-primary' },
  { from: /border-\[#C41E3A\]/gi, to: 'border-primary' },
  { from: /ring-\[#C41E3A\]/gi, to: 'ring-primary' },
  { from: /from-\[#C41E3A\]/gi, to: 'from-primary' },
  { from: /to-\[#C41E3A\]/gi, to: 'to-primary' },
  { from: /placeholder-\[#C41E3A\]/gi, to: 'placeholder-primary' },
  { from: /divide-\[#C41E3A\]/gi, to: 'divide-primary' },
  { from: /outline-\[#C41E3A\]/gi, to: 'outline-primary' },
  { from: /caret-\[#C41E3A\]/gi, to: 'caret-primary' },
  { from: /accent-\[#C41E3A\]/gi, to: 'accent-primary' },
  { from: /shadow-\[#C41E3A\]/gi, to: 'shadow-primary' },

  // accent 色系
  { from: /bg-\[#C9A96E\]/gi, to: 'bg-accent' },
  { from: /text-\[#C9A96E\]/gi, to: 'text-accent' },
  { from: /border-\[#C9A96E\]/gi, to: 'border-accent' },
  { from: /from-\[#C9A96E\]/gi, to: 'from-accent' },
  { from: /to-\[#C9A96E\]/gi, to: 'to-accent' },

  // background
  { from: /bg-\[#FAF8F5\]/gi, to: 'bg-background' },

  // foreground
  { from: /text-\[#2C2C2C\]/gi, to: 'text-foreground' },
  { from: /bg-\[#2C2C2C\]/gi, to: 'bg-foreground' },

  // border
  { from: /border-\[#E8E0D5\]/gi, to: 'border-border' },
  { from: /divide-\[#E8E0D5\]/gi, to: 'divide-border' },

  // secondary/muted
  { from: /bg-\[#F5F1EB\]/gi, to: 'bg-secondary' },
  { from: /bg-\[#F0EBE5\]/gi, to: 'bg-muted' },

  // card
  { from: /bg-\[#ffffff\]/gi, to: 'bg-card' },
  { from: /bg-\[#FFFFFF\]/gi, to: 'bg-card' },
  { from: /bg-\[#fff\]/gi, to: 'bg-card' },

  // text soft/ink
  { from: /text-\[#999999\]/gi, to: 'text-muted-foreground' },
  { from: /text-\[#999\]/gi, to: 'text-muted-foreground' },
  { from: /text-\[#666666\]/gi, to: 'text-ink-soft' },
  { from: /text-\[#666\]/gi, to: 'text-ink-soft' },

  // dark red
  { from: /bg-\[#8B0000\]/gi, to: 'bg-primary/70' },
  { from: /to-\[#8B0000\]/gi, to: 'to-primary/70' },

  // brand colors
  { from: /bg-\[#52C41A\]/gi, to: 'bg-success' },
  { from: /text-\[#52C41A\]/gi, to: 'text-success' },
  { from: /border-\[#52C41A\]/gi, to: 'border-success' },
  { from: /bg-\[#FF4D4F\]/gi, to: 'bg-danger' },
  { from: /text-\[#FF4D4F\]/gi, to: 'text-danger' },
  { from: /border-\[#FF4D4F\]/gi, to: 'border-danger' },
  { from: /bg-\[#1890FF\]/gi, to: 'bg-info' },
  { from: /text-\[#1890FF\]/gi, to: 'text-info' },
  { from: /border-\[#1890FF\]/gi, to: 'border-info' },
  { from: /bg-\[#FA8C16\]/gi, to: 'bg-warning' },
  { from: /text-\[#FA8C16\]/gi, to: 'text-warning' },
  { from: /bg-\[#722ED1\]/gi, to: 'bg-operator' },
  { from: /text-\[#722ED1\]/gi, to: 'text-operator' },
  { from: /bg-\[#EB2F96\]/gi, to: 'bg-live' },
  { from: /text-\[#EB2F96\]/gi, to: 'text-live' },

  // gradients
  { from: /from-\[#1a1a2e\]/gi, to: 'from-gray-900' },
  { from: /to-\[#16213e\]/gi, to: 'to-gray-800' },
];

// 递归获取所有 .vue 文件
function findVueFiles(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // 跳过备份目录
      if (entry.name.startsWith('pages_backup') || entry.name === 'node_modules') continue;
      results.push(...findVueFiles(fullPath));
    } else if (entry.name.endsWith('.vue') && !entry.name.endsWith('.bak')) {
      results.push(fullPath);
    }
  }
  return results;
}

async function main() {
  const files = findVueFiles(PAGES_DIR);
  console.log(`扫描到 ${files.length} 个 Vue 文件\n`);

  let totalFilesModified = 0;
  let totalEmojiCount = 0;
  let totalColorCount = 0;

  for (const file of files) {
    const original = fs.readFileSync(file, 'utf8');
    let content = original;
    let fileEmojiCount = 0;
    let fileColorCount = 0;

    // 替换 emoji（只替换 text 标签内的，避免影响 URL 和其他内容）
    for (const [emoji, label] of emojiMap) {
      // 匹配模式：<text ...>emoji</text> 或 >emoji< 或直接出现的 emoji
      const before = content.length;
      // 用正则全局替换所有出现的 emoji
      const escaped = emoji.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(escaped, 'g');
      const matches = content.match(regex);
      if (matches) {
        content = content.replace(regex, '');
        fileEmojiCount += matches.length;
      }
    }

    // 替换硬编码颜色
    for (const { from, to } of colorMap) {
      const matches = content.match(from);
      if (matches) {
        fileColorCount += matches.length;
        content = content.replaceAll(from, to);
      }
    }

    if (content !== original) {
      // 备份原文件
      const bakPath = file + '.bak';
      if (!fs.existsSync(bakPath)) {
        fs.writeFileSync(bakPath, original, 'utf8');
      }

      fs.writeFileSync(file, content, 'utf8');
      totalFilesModified++;
      totalEmojiCount += fileEmojiCount;
      totalColorCount += fileColorCount;

      const relPath = path.relative(PAGES_DIR, file);
      console.log(`✅ ${relPath}: ${fileEmojiCount} emoji + ${fileColorCount} 颜色`);
    }
  }

  console.log(`\n========== 汇总 ==========`);
  console.log(`修改文件数: ${totalFilesModified}/${files.length}`);
  console.log(`Emoji 移除数: ${totalEmojiCount}`);
  console.log(`颜色替换数: ${totalColorCount}`);
  console.log(`原文件备份: .bak`);
}

main().catch(console.error);
