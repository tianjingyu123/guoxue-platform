// Replace circle-data chunk with a version that always returns mock data
const fs = require('fs');
const path = require('path');

const chunkFile = path.resolve(__dirname, '../dist/assets/circle-data.DMxIVbfr.js');

if (!fs.existsSync(chunkFile)) {
  console.log('circle-data chunk not found at:', chunkFile);
  process.exit(1);
}

// Replace the entire chunk with mock-only version
const newChunk = `
/* Mock circle data - replaces tree-shaken original */
var circleApi_list = function(params) {
  var all = [
    {id:"m1",name:"八字命理学习圈",intro:"系统学习八字命理，从入门到精通",cover:"",type:"FREE",memberCount:1280,postCount:56,isJoined:true,category:"命理",tags:["八字","命理","入门"],owner:{nickname:"国学管理员",avatar:""},todayActive:128},
    {id:"m2",name:"紫微斗数研习社",intro:"紫微斗数爱好者学习交流圈",cover:"",type:"FREE",memberCount:980,postCount:32,isJoined:true,category:"占卜",tags:["紫微","斗数"],owner:{nickname:"王玄机",avatar:""},todayActive:56},
    {id:"m3",name:"风水堪舆实战",intro:"风水堪舆实战案例分享",cover:"",type:"FREE",memberCount:650,postCount:28,category:"风水",tags:["风水","堪舆"],owner:{nickname:"赵风水",avatar:""},todayActive:32},
    {id:"m4",name:"周易研习圈",intro:"周易六十四卦研究与探讨",cover:"",type:"YEARLY",price:299,memberCount:1520,postCount:45,isJoined:true,category:"经典",tags:["周易","六爻","易经"],owner:{nickname:"孙易道",avatar:""},todayActive:89},
    {id:"m5",name:"奇门遁甲学社",intro:"奇门遁甲爱好者聚集地",cover:"",type:"FREE",memberCount:420,postCount:18,category:"占卜",tags:["奇门","遁甲"],owner:{nickname:"钱奇门",avatar:""},todayActive:12}
  ];
  var filtered = params && params.category ? all.filter(function(c){return c.category===params.category}) : all;
  return Promise.resolve({data:filtered,total:filtered.length});
};
var circleApi_my = function() {
  return Promise.resolve([
    {id:"m1",name:"八字命理学习圈",memberCount:1280,postCount:56,isJoined:true,category:"命理",owner:{nickname:"国学管理员",avatar:""},todayActive:128},
    {id:"m2",name:"紫微斗数研习社",memberCount:980,postCount:32,isJoined:true,category:"占卜",owner:{nickname:"王玄机",avatar:""},todayActive:56},
    {id:"m4",name:"周易研习圈",memberCount:1520,postCount:45,isJoined:true,category:"经典",owner:{nickname:"孙易道",avatar:""},todayActive:89}
  ]);
};
var circleApi_getRanking = function() {
  return Promise.resolve([
    {id:"m4",name:"周易研习圈",memberCount:1520,postCount:45,rank:1},
    {id:"m1",name:"八字命理学习圈",memberCount:1280,postCount:56,rank:2},
    {id:"m2",name:"紫微斗数研习社",memberCount:980,postCount:32,rank:3},
    {id:"m3",name:"风水堪舆实战",memberCount:650,postCount:28,rank:4},
    {id:"m5",name:"奇门遁甲学社",memberCount:420,postCount:18,rank:5}
  ]);
};
var formatMembers = function(n){return n>=10000?(n/10000).toFixed(1)+"万":String(n);};
var circleCategories = [
  {id:"1",label:"全部",icon:"layers",color:"#c41e3a"},
  {id:"mingli",label:"命理",icon:"compass",color:"#c41e3a"},
  {id:"zhanbu",label:"占卜",icon:"sparkles",color:"#9b59b6"},
  {id:"fengshui",label:"风水",icon:"map-pin",color:"#52c41a"},
  {id:"jingdian",label:"经典",icon:"book-open",color:"#e67e22"},
  {id:"zhongyi",label:"中医",icon:"heart",color:"#e74c3c"}
];
var upcomingLives = [];
var todayActivities = [];
var hotPosts = [];
export { circleApi_list as list, circleApi_my as my, circleApi_getRanking as getRanking, formatMembers, circleCategories, upcomingLives, todayActivities, hotPosts };
`;

fs.writeFileSync(chunkFile, newChunk);
console.log('Replaced circle-data chunk with mock-only version');
console.log('New size:', newChunk.length, 'bytes');
