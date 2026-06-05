const fs = require('fs');
const path = require('path');

const baseDir = 'C:/Users/Administrator/Desktop/guoxue-platform/apps/mobile/src/pages';

// Remaining fixes - more targeted replacements
const fileFixes = {
  // im/chat.vue
  'im/chat.vue': [
    ['pages/shop/product?id=', 'pages/shop/product-detail?id='],
  ],
  // im/contacts.vue - add-friend page doesn't exist, redirect to search
  'im/contacts.vue': [
    ["pages/im/add-friend'", "pages/search/search'"],
  ],
  // im/group-list.vue - create-group doesn't exist
  'im/group-list.vue': [
    ["pages/im/create-group'", "pages/im/group-detail'"],
  ],
  // teacher/dashboard.vue - missing pages/ prefix
  'teacher/dashboard.vue': [
    ["'teacher/income'", "'pages/teacher/dashboard?tab=income'"],
    ["'teacher/courses'", "'pages/teacher/dashboard?tab=courses'"],
    ["`teacher/courses/${id}`", "`pages/teacher/dashboard?courseId=${id}`"],
  ],
  // bazi/bazi.vue - history page doesn't exist
  'bazi/bazi.vue': [
    ['pages/bazi/bazi-history', 'pages/bazi/bazi'],
  ],
  // circles/circle-bots.vue
  'circles/circle-bots.vue': [
    ["pages/circles/bot-manage'", "pages/circles/circle-bots'"],
    ["pages/circles/bot-create'", "pages/circles/circle-bots'"],
  ],
  // classics/ai-assistant.vue
  'classics/ai-assistant.vue': [
    ["pages/classics/reader'", "pages/reader/reader'"],
    ["pages/classics/lists'", "pages/classics/classics'"],
    ['pages/classics/list/${', 'pages/classics/classic-detail?id=${'],
  ],
  // courses/course-detail.vue - teacher detail doesn't exist
  'courses/course-detail.vue': [
    ['pages/teacher/detail', 'pages/teacher/dashboard'],
  ],
  // offline/course-detail.vue - same issue
  'offline/course-detail.vue': [
    ['pages/teacher/detail', 'pages/teacher/dashboard'],
  ],
  // institute/events.vue
  'institute/events.vue': [
    ['pages/institute/event-detail', 'pages/institute/events'],
  ],
  // institute/index.vue
  'institute/index.vue': [
    ['pages/institute/instructors', 'pages/institute/member-detail'],
    ['pages/institute/event-detail', 'pages/institute/events'],
  ],
  // mine/points.vue
  'mine/points.vue': [
    ['pages/mine/points-history', 'pages/mine/points'],
  ],
  // mine/submissions.vue
  'mine/submissions.vue': [
    ['pages/mine/submission-detail', 'pages/mine/submissions'],
  ],
  // offline/orders.vue
  'offline/orders.vue': [
    ['pages/offline/review', 'pages/offline/course-detail'],
    ['pages/offline/orders/detail', 'pages/orders/order-detail'],
  ],
  // shop/after-sale-rejected.vue
  'shop/after-sale-rejected.vue': [
    ["pages/shop/dispute'", "pages/shop/my-after-sales'"],
    ["pages/customer-service/chat'", "pages/customer-service/index'"],
  ],
  // mine/received-comments.vue - dynamic path, leave as-is
};

let totalFixes = 0;

for (const [relPath, replacements] of Object.entries(fileFixes)) {
  const fullPath = path.join(baseDir, relPath);
  if (!fs.existsSync(fullPath)) {
    console.log('SKIP (not found): ' + relPath);
    continue;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let changed = false;

  for (const [search, replace] of replacements) {
    if (content.includes(search)) {
      content = content.split(search).join(replace);
      changed = true;
      console.log('FIX: ' + relPath + ' → ' + search + ' → ' + replace);
    }
  }

  if (changed) {
    fs.writeFileSync(fullPath, content, 'utf8');
    totalFixes++;
  }
}

console.log('\nRemaining files fixed: ' + totalFixes);
