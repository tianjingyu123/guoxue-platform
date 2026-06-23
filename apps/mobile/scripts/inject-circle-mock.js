// Inject mock circle data into the circles page chunk
// This bypasses the tree-shaken useMock/API issue
const fs = require('fs');
const path = require('path');

const chunkFile = path.resolve(__dirname, '../dist/assets/pages-circles-index.Iyc5J0cZ.js');

if (!fs.existsSync(chunkFile)) {
  console.log('Circle chunk not found');
  process.exit(1);
}

let code = fs.readFileSync(chunkFile, 'utf8');

const injection = `
/* INJECTED: mock circle data bypass for tree-shaken useMock */
var __INJECTED_CIRCLES__=true;
(function(){
  if(typeof window==="undefined")return;
  window.__CIRCLE_MOCK__={
    data:[
      {id:"m1",name:"八字命理学习圈",intro:"系统学习八字命理，从入门到精通",cover:"",type:"FREE",memberCount:1280,postCount:56,isJoined:true,category:"命理",tags:["八字","命理","入门"],owner:{nickname:"国学管理员",avatar:""},todayActive:128},
      {id:"m2",name:"紫微斗数研习社",intro:"紫微斗数爱好者学习交流圈",cover:"",type:"FREE",memberCount:980,postCount:32,isJoined:true,category:"占卜",tags:["紫微","斗数"],owner:{nickname:"王玄机",avatar:""},todayActive:56},
      {id:"m3",name:"风水堪舆实战",intro:"风水堪舆实战案例与经验分享",cover:"",type:"FREE",memberCount:650,postCount:28,category:"风水",tags:["风水","堪舆"],owner:{nickname:"赵风水",avatar:""},todayActive:32},
      {id:"m4",name:"周易研习圈",intro:"周易六十四卦研究与探讨",cover:"",type:"YEARLY",price:299,memberCount:1520,postCount:45,isJoined:true,category:"经典",tags:["周易","六爻","易经"],owner:{nickname:"孙易道",avatar:""},todayActive:89},
      {id:"m5",name:"奇门遁甲学社",intro:"奇门遁甲爱好者聚集地",cover:"",type:"FREE",memberCount:420,postCount:18,category:"占卜",tags:["奇门","遁甲"],owner:{nickname:"钱奇门",avatar:""},todayActive:12}
    ],
    ranking:[
      {id:"m4",name:"周易研习圈",memberCount:1520,postCount:45,rank:1},
      {id:"m1",name:"八字命理学习圈",memberCount:1280,postCount:56,rank:2},
      {id:"m2",name:"紫微斗数研习社",memberCount:980,postCount:32,rank:3},
      {id:"m3",name:"风水堪舆实战",memberCount:650,postCount:28,rank:4},
      {id:"m5",name:"奇门遁甲学社",memberCount:420,postCount:18,rank:5}
    ],
    myCircles:[
      {id:"m1",name:"八字命理学习圈",memberCount:1280,postCount:56,isJoined:true,category:"命理",owner:{nickname:"国学管理员",avatar:""},todayActive:128},
      {id:"m2",name:"紫微斗数研习社",memberCount:980,postCount:32,isJoined:true,category:"占卜",owner:{nickname:"王玄机",avatar:""},todayActive:56},
      {id:"m4",name:"周易研习圈",memberCount:1520,postCount:45,isJoined:true,category:"经典",owner:{nickname:"孙易道",avatar:""},todayActive:89}
    ]
  };
})();
`;

code = injection + code;
fs.writeFileSync(chunkFile, code);
console.log('Injected mock data into:', chunkFile.split('/').pop());
console.log('New size:', code.length, 'bytes');
