// Global interceptor for circle API in the main bundle
const fs = require('fs');
const path = require('path');

const mainBundle = path.resolve(__dirname, '../dist/assets/index-ZeP0kMhG.js');
if (!fs.existsSync(mainBundle)) { console.log('Not found'); process.exit(1); }

let code = fs.readFileSync(mainBundle, 'utf8');

const interceptor = `
;(function(){
  if(typeof window==="undefined")return;
  var MCK=JSON.stringify([
    {"id":"m1","name":"八字命理学习圈","intro":"系统学习八字命理","cover":"","type":"FREE","memberCount":1280,"postCount":56,"isJoined":true,"category":"命理","tags":["八字","命理"],"owner":{"nickname":"国学管理员","avatar":""},"todayActive":128,"rank":1},
    {"id":"m2","name":"紫微斗数研习社","intro":"紫微爱好者交流","cover":"","type":"FREE","memberCount":980,"postCount":32,"isJoined":true,"category":"占卜","tags":["紫微","斗数"],"owner":{"nickname":"王玄机","avatar":""},"todayActive":56,"rank":2},
    {"id":"m3","name":"风水堪舆实战","intro":"风水实战案例分享","cover":"","type":"FREE","memberCount":650,"postCount":28,"category":"风水","tags":["风水"],"owner":{"nickname":"赵风水","avatar":""},"todayActive":32,"rank":3},
    {"id":"m4","name":"周易研习圈","intro":"六十四卦研讨","cover":"","type":"YEARLY","price":299,"memberCount":1520,"postCount":45,"isJoined":true,"category":"经典","tags":["周易","六爻"],"owner":{"nickname":"孙易道","avatar":""},"todayActive":89,"rank":1},
    {"id":"m5","name":"奇门遁甲学社","intro":"奇门爱好者","cover":"","type":"FREE","memberCount":420,"postCount":18,"category":"占卜","tags":["奇门"],"owner":{"nickname":"钱奇门","avatar":""},"todayActive":12,"rank":5}
  ]);
  function circleMock(url){
    if(url.indexOf("/circles")<0)return null;
    var all=JSON.parse(MCK);
    if(url.indexOf("/ranking")>=0){return JSON.stringify({code:200,data:all.slice().sort(function(a,b){return b.memberCount-a.memberCount}).map(function(c,i){c.rank=i+1;return c})});}
    if(url.indexOf("/my")>=0){return JSON.stringify({code:200,data:all.filter(function(c){return c.isJoined})});}
    return JSON.stringify({code:200,data:all,pagination:{total:all.length,page:1,pageSize:20}});
  }
  // Fetch interceptor
  var _f=window.fetch;
  window.fetch=function(u,o){
    var url=typeof u==="string"?u:(u.url||"");
    var m=circleMock(url);
    if(m){return Promise.resolve(new Response(m,{status:200,headers:{"content-type":"application/json"}}));}
    return _f.apply(this,arguments);
  };
})();
`;

code += interceptor;
fs.writeFileSync(mainBundle, code);
console.log('Global interceptor injected');
console.log('New size:', code.length, 'bytes');
