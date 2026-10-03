// 先构建server；只在本机临时HTTP服务中验证编译产物，不连接真实数据库/支付渠道。
const test = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const r = require('node:module').createRequire(path.resolve('apps/server/package.json'))
r('reflect-metadata')
const {ShopController}=r('./dist/modules/shop/shop.controller.js')
const {ShopService}=r('./dist/modules/shop/shop.service.js')
const {ShopOrderService}=r('./dist/modules/shop/shop-order.service.js')
const {JwtAuthGuard}=r('./dist/common/jwt-auth.guard.js')
const {StrictRedisThrottleGuard}=r('./dist/common/redis-throttle.guard.js')
const {RedisService}=r('./dist/redis/redis.service.js')
const {Test}=r('@nestjs/testing')
const passport=r('passport'),{Strategy,ExtractJwt}=r('passport-jwt'),jwt=r('jsonwebtoken'),request=r('supertest')

test('编译后的真实订单接口：JWT/归属/no-store/限流及DB已付确认，不调用支付',async()=>{
  let dbReads=0,deletes=0,rateCount=0
  const row={id:'one',userId:'owner',status:'PAID'}
  const redis={getJson:async()=>[],del:async()=>{deletes++},incrWithTtl:async()=>({count:++rateCount,ttl:60})}
  const orderSvc=new ShopOrderService({order:{findUnique:async()=>{dbReads++;return {...row}}}},redis,{}, {})
  const service=Object.create(ShopService.prototype);service.orderSvc=orderSvc
  const providers=Reflect.getMetadata('design:paramtypes',ShopController).map(token=>({provide:token,useValue:token===ShopService?service:{}}))
  providers.push({provide:RedisService,useValue:redis})
  let builder=Test.createTestingModule({controllers:[ShopController],providers})
  for(const name of Object.getOwnPropertyNames(ShopController.prototype)){
    for(const guard of Reflect.getMetadata('__guards__',ShopController.prototype[name])||[]){
      if(guard!==JwtAuthGuard&&guard!==StrictRedisThrottleGuard)builder=builder.overrideGuard(guard).useValue({canActivate:()=>true})
    }
  }
  passport.use('jwt',new Strategy({jwtFromRequest:ExtractJwt.fromAuthHeaderAsBearerToken(),secretOrKey:'local-current-order-fixture'},(p,done)=>done(null,{id:p.sub,roles:p.roles||[]})))
  const module=await builder.compile(), app=module.createNestApplication({logger:false})
  // 将隔离HTTP请求的IP设为文档保留测试地址，确保实际限流守卫不因环回地址放行。
  app.use((req,res,next)=>{Object.defineProperty(req,'ip',{value:'203.0.113.20'});next()})
  await app.init()
  try{
    const token=id=>jwt.sign({sub:id,roles:['SUPER_ADMIN']},'local-current-order-fixture')
    await request(app.getHttpServer()).get('/shop/orders/one/current').expect(401)
    await request(app.getHttpServer()).get('/shop/orders/one/current').set('Authorization','Bearer invalid').expect(401)
    assert.equal(dbReads,0)
    await request(app.getHttpServer()).get('/shop/orders/one/current?userId=owner').set('Authorization','Bearer '+token('other')).expect(403)
    assert.equal(deletes,0)
    const res=await request(app.getHttpServer()).get('/shop/orders/one/current').set('Authorization','Bearer '+token('owner')).expect(200)
    assert.equal(res.body.status,'PAID');assert.equal(res.headers['cache-control'],'no-store');assert.equal(deletes,1)
    rateCount=10;const before=dbReads
    await request(app.getHttpServer()).get('/shop/orders/one/current').set('Authorization','Bearer '+token('owner')).expect(429)
    assert.equal(dbReads,before)
  }finally{await app.close();passport.unuse('jwt')}
})
