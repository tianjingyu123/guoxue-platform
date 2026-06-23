// Fix circle-data chunk: replace API calls with mock data returns
// The original calls apiGet (function 's') for list/my/getRanking
// We need to make them use the mock data array (variable 'i') directly
const fs = require('fs');
const path = require('path');

const chunkFile = path.resolve(__dirname, '../dist/assets/circle-data.DMxIVbfr.js');

if (!fs.existsSync(chunkFile)) {
  console.log('Not found');
  process.exit(1);
}

let code = fs.readFileSync(chunkFile, 'utf8');

// The original code pattern:
// list: async e => s(`/circles?category=...`)  → use mock data with {data, total}
// my: async() => s("/circles/my")               → use mock data filtered by isJoined
// getRanking: async() => s("/circles/ranking")   → use mock data sorted + ranked

// Replace the 'o' object (circleApi) with mock-only version
// Original: const o={list:async e=>s(...),my:async()=>s("/circles/my"),getRanking:async()=>s("/circles/ranking"),...
// New: uses mock data array 'i' directly

code = code.replace(
  /list:async e=>s\(`\/circles\?category=\$\{.*?\}`\)/,
  'list:async e=>{const f=(null==e?void 0:e.category)?i.filter(c=>c.category===(null==e?void 0:e.category)):i;return{data:f,total:f.length}}'
);

code = code.replace(
  /my:async\(\)=>s\("\/circles\/my"\)/,
  'my:async()=>i.filter(c=>c.isJoined)'
);

code = code.replace(
  /getRanking:async\(\)=>s\("\/circles\/ranking"\)/,
  'getRanking:async()=>i.slice().sort((a,b)=>b.members-a.members).slice(0,5).map((c,j)=>({...c,rank:j+1}))'
);

fs.writeFileSync(chunkFile, code);
console.log('Fixed circle-data chunk!');
console.log('New size:', code.length, 'bytes');

// Verify the fix
if (code.includes('return{data:f,total:f.length}')) console.log('list: OK - returns {data, total}');
if (code.includes("filter(c=>c.isJoined)")) console.log('my: OK - returns joined circles');
if (code.includes("rank:j+1")) console.log('getRanking: OK - returns ranked circles');
