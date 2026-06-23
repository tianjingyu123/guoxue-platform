// Patch circle page chunk to inject mock data fallback
const fs = require('fs');
const path = require('path');

const chunkFile = path.resolve(__dirname, '../dist/assets/pages-circles-index.Iyc5J0cZ.js');

if (!fs.existsSync(chunkFile)) {
  console.log('Circle chunk not found, skipping');
  process.exit(0);
}

let code = fs.readFileSync(chunkFile, 'utf8');

// Inject a global fetch override that provides mock circle data
const patch = `
;(function(){
  if(typeof window==="undefined")return;
  var _fetch=window.fetch;
  window.fetch=function(u,o){
    var url=typeof u==="string"?u:(u.url||"");
    return _fetch.apply(this,arguments).then(function(r){
      if(r.ok)return r;
      // Fallback mock circle data
      if(url.indexOf("/circles")>=0&&url.indexOf("/my")<0&&url.indexOf("/ranking")<0){
        return new Response(JSON.stringify({
          code:200,
          data:[
            {id:"m1",name:"八字命理学习圈",intro:"学习八字知识",cover:"",type:"FREE",memberCount:1280,postCount:56,tags:["八字","命理"],owner:{nickname:"国学管理员",avatar:""}},
            {id:"m2",name:"紫微斗数研习社",intro:"紫微爱好者交流",cover:"",type:"FREE",memberCount:980,postCount:32,tags:["紫微","斗数"],owner:{nickname:"王玄机",avatar:""}},
            {id:"m3",name:"风水堪舆实战",intro:"风水实战案例分享",cover:"",type:"FREE",memberCount:650,postCount:28,tags:["风水"],owner:{nickname:"赵风水",avatar:""}},
            {id:"m4",name:"周易研习圈",intro:"六十四卦研讨",cover:"",type:"YEARLY",price:299,memberCount:1520,postCount:45,tags:["周易","六爻"],owner:{nickname:"孙易道",avatar:""}},
            {id:"m5",name:"奇门遁甲学社",intro:"奇门爱好者聚集地",cover:"",type:"FREE",memberCount:420,postCount:18,tags:["奇门"],owner:{nickname:"钱奇门",avatar:""}}
          ],
          pagination:{total:5,page:1,pageSize:20}
        }),{headers:{"content-type":"application/json"}});
      }
      if(url.indexOf("/circles/ranking")>=0){
        return new Response(JSON.stringify({
          code:200,
          data:[
            {id:"m4",name:"周易研习圈",memberCount:1520,postCount:45,rank:1},
            {id:"m1",name:"八字命理学习圈",memberCount:1280,postCount:56,rank:2},
            {id:"m2",name:"紫微斗数研习社",memberCount:980,postCount:32,rank:3},
          ]
        }),{headers:{"content-type":"application/json"}});
      }
      return r;
    });
  };
})();
`;

code += patch;
fs.writeFileSync(chunkFile, code);
console.log('Patched circle chunk:', chunkFile, '->', code.length, 'bytes');
