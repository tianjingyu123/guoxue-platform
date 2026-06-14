const fs = require('fs');
const path = 'C:/Users/Administrator/Desktop/guoxue-platform/packages/shared/src/types/tools/index.ts';
let lines = fs.readFileSync(path, 'utf8').split('\n');

const toRemove = new Set([
  'benming-fo', 'qimen-bazhen', 'bagua-yijing', 'liuren-tianjiang',
  'tiangan-hehua', 'shichen-lunming', 'taisui-chaxun', 'minggua-chaxun',
  'shengxiao-peidui', 'sanyuan-jiuyun', 'ziwei-sihua', 'nayin-xiangjie'
]);

const filtered = [];
for (const line of lines) {
  let skip = false;
  for (const key of toRemove) {
    if (line.includes('./' + key)) {
      skip = true;
      break;
    }
  }
  if (!skip) filtered.push(line);
}

console.log('Before: ' + lines.length + ' lines');
console.log('After: ' + filtered.length + ' lines');
fs.writeFileSync(path, filtered.join('\n'));
console.log('Done');
