// Intercept circle API calls in the main bundle
// When /circles endpoints are called, return mock data
const fs = require('fs');
const path = require('path');

const mainBundle = path.resolve(__dirname, '../dist/assets/index-ZeP0kMhG.js');

if (!fs.existsSync(mainBundle)) {
  console.log('Main bundle not found');
  process.exit(1);
}

let code = fs.readFileSync(mainBundle, 'utf8');

// Add request interceptor at the END of the bundle
const interceptor = `
;(function(){
  if(typeof uni==="undefined")return;
  var _request=uni.request;
  uni.request=function(opts){
    var url=opts.url||\"\";
    // Intercept circle API calls
    if(url.indexOf(\"api/v1/circles\")>=0){
      var mockCircles=[
        {id:\"m1\",name:\"八字命理学习圈\",intro:\"系统学习八字命理\",cover:\"\",type:\"FREE\",memberCount:1280,postCount:56,isJoined:true,category:\"命理\",tags:[\"八字\",\"命理\"],owner:{nickname:\"国学管理员\",avatar:\"\"},todayActive:128,rank:1},
        {id:\"m2\",name:\"紫微斗数研习社\",intro:\"紫微爱好者交流\",cover:\"\",type:\"FREE\",memberCount:980,postCount:32,isJoined:true,category:\"占卜\",tags:[\"紫微\",\"斗数\"],owner:{nickname:\"王玄机\",avatar:\"\"},todayActive:56,rank:2},
        {id:\"m3\",name:\"风水堪舆实战\",intro:\"风水实战案例分享\",cover:\"\",type:\"FREE\",memberCount:650,postCount:28,category:\"风水\",tags:[\"风水\"],owner:{nickname:\"赵风水\",avatar:\"\"},todayActive:32,rank:3},
        {id:\"m4\",name:\"周易研习圈\",intro:\"六十四卦研讨\",cover:\"\",type:\"YEARLY\",price:299,memberCount:1520,postCount:45,isJoined:true,category:\"经典\",tags:[\"周易\",\"六爻\"],owner:{nickname:\"孙易道\",avatar:\"\"},todayActive:89,rank:1},
        {id:\"m5\",name:\"奇门遁甲学社\",intro:\"奇门爱好者\",cover:\"\",type:\"FREE\",memberCount:420,postCount:18,category:\"占卜\",tags:[\"奇门\"],owner:{nickname:\"钱奇门\",avatar:\"\"},todayActive:12,rank:5}
      ];
      var myCircles=mockCircles.filter(function(c){return c.isJoined;});
      var ranking=[].concat(mockCircles).sort(function(a,b){return b.memberCount-a.memberCount;}).slice(0,5).map(function(c,i){c.rank=i+1;return c;});

      var data;
      if(url.indexOf(\"/ranking\")>=0) data=ranking;
      else if(url.indexOf(\"/my\")>=0) data=myCircles;
      else data=mockCircles;

      setTimeout(function(){
        opts.success&&opts.success({statusCode:200,data:{code:200,data:data,pagination:{total:data.length,page:1,pageSize:20},message:\"ok\"}});
        opts.complete&&opts.complete({statusCode:200});
      },100);
      return;
    }
    return _request.call(uni,opts);
  };
})();
`;

code += interceptor;
fs.writeFileSync(mainBundle, code);
console.log('Interceptor injected into:', mainBundle.split('/').pop());
console.log('New size:', code.length, 'bytes');
