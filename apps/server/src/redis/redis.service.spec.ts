import { RedisService } from "./redis.service"

describe("RedisService", () => {
  let service: RedisService

  beforeEach(() => {
    // 不设 REDIS_URL，使用内存降级模式
    delete process.env.REDIS_URL
    service = new RedisService()
  })

  afterEach(async () => {
    await service.onModuleDestroy()
  })

  // ═══════════════════ 基础 SET/GET ═══════════════════

  describe("set/get", () => {
    it("设置后能获取字符串值", async () => {
      await service.set("key1", "hello")
      const val = await service.get("key1")
      expect(val).toBe("hello")
    })

    it("获取不存在的 key 返回 null", async () => {
      const val = await service.get("nonexistent")
      expect(val).toBeNull()
    })

    it("设置带 TTL 的值过期后返回 null", async () => {
      await service.set("key-expire", "data", 1)
      // 模拟过期：直接访问内部 memory
      const entry = (service as any).memory.get("key-expire")
      entry.expiry = Date.now() - 1000
      const val = await service.get("key-expire")
      expect(val).toBeNull()
    })

    it("覆盖已存在的 key", async () => {
      await service.set("key1", "first")
      await service.set("key1", "second")
      const val = await service.get("key1")
      expect(val).toBe("second")
    })

    it("getDel 原子消费后不可再次读取", async () => {
      await service.set("one-time", "payload", 60)
      await expect(service.getDel("one-time")).resolves.toBe("payload")
      await expect(service.getDel("one-time")).resolves.toBeNull()
      await expect(service.get("one-time")).resolves.toBeNull()
    })

    it("getDel 不返回已过期值", async () => {
      await service.set("one-time-expired", "payload", 60)
      const entry = (service as any).memory.get("one-time-expired")
      entry.expiry = Date.now() - 1000
      await expect(service.getDel("one-time-expired")).resolves.toBeNull()
    })
  })

  // ═══════════════════ JSON ═══════════════════

  describe("getJson/setJson", () => {
    it("设置并获取 JSON 对象", async () => {
      await service.setJson("user:1", { id: "u1", name: "张三" })
      const val = await service.getJson<{ id: string; name: string }>("user:1")
      expect(val).toEqual({ id: "u1", name: "张三" })
    })

    it("获取不存在的 JSON key 返回 null", async () => {
      const val = await service.getJson("no-json")
      expect(val).toBeNull()
    })

    it("非法 JSON 数据返回 null", async () => {
      await service.set("bad-json", "not-valid-json{{{")
      // 直接通过 get 设置非 JSON，然后通过 getJson 读取
      const val = await service.getJson("bad-json")
      expect(val).toBeNull()
    })

    it("JSON 值带 TTL", async () => {
      await service.setJson("temp", { data: 1 }, 3600)
      const val = await service.getJson<{ data: number }>("temp")
      expect(val).toEqual({ data: 1 })
    })
  })

  // ═══════════════════ DEL / TTL ═══════════════════

  describe("del/ttl", () => {
    it("删除存在的 key", async () => {
      await service.set("key-del", "val")
      await service.del("key-del")
      const val = await service.get("key-del")
      expect(val).toBeNull()
    })

    it("删除不存在的 key 不报错", async () => {
      await expect(service.del("no-key")).resolves.toBeUndefined()
    })

    it("TTL: 永久有效的 key 返回 -1", async () => {
      await service.set("forever", "val")
      const ttl = await service.ttl("forever")
      expect(ttl).toBe(-1)
    })

    it("TTL: 不存在的 key 返回 -2", async () => {
      const ttl = await service.ttl("ghost")
      expect(ttl).toBe(-2)
    })

    it("TTL: 过期 key 返回 -2", async () => {
      await service.set("short", "val", 1)
      const entry = (service as any).memory.get("short")
      entry.expiry = Date.now() - 1000
      const ttl = await service.ttl("short")
      expect(ttl).toBe(-2)
    })

    it("TTL: 返回剩余秒数", async () => {
      await service.set("alive", "val", 3600)
      const ttl = await service.ttl("alive")
      expect(ttl).toBeGreaterThan(0)
      expect(ttl).toBeLessThanOrEqual(3600)
    })
  })

  // ═══════════════════ SET NX ═══════════════════

  describe("setNX", () => {
    it("首次 SET NX 返回 true", async () => {
      const result = await service.setNX("lock:1", "holder1", 60)
      expect(result).toBe(true)
    })

    it("重复 SET NX 同一 key 返回 false", async () => {
      await service.setNX("lock:2", "holder1", 60)
      const result = await service.setNX("lock:2", "holder2", 60)
      expect(result).toBe(false)
    })

    it("SET NX 过期后可重新获取", async () => {
      await service.setNX("lock:3", "holder1", 1)
      const entry = (service as any).memory.get("lock:3")
      entry.expiry = Date.now() - 1000
      const result = await service.setNX("lock:3", "holder2", 60)
      expect(result).toBe(true)
    })
  })

  // ═══════════════════ MGET JSON ═══════════════════

  describe("mgetJson", () => {
    it("批量获取 JSON 值", async () => {
      await service.setJson("a:1", { x: 1 })
      await service.setJson("a:2", { x: 2 })
      const results = await service.mgetJson<{ x: number }>(["a:1", "a:2", "a:3"])
      expect(results).toEqual([{ x: 1 }, { x: 2 }, null])
    })

    it("全部不存在时返回 null 数组", async () => {
      const results = await service.mgetJson(["none:1", "none:2"])
      expect(results).toEqual([null, null])
    })
  })

  // ═══════════════════ DEL BY PATTERN ═══════════════════

  describe("delByPattern", () => {
    it("按模式删除匹配的 key", async () => {
      await service.set("cache:user:1", "a")
      await service.set("cache:user:2", "b")
      await service.set("cache:order:1", "c")

      await service.delByPattern("cache:user:*")

      expect(await service.get("cache:user:1")).toBeNull()
      expect(await service.get("cache:user:2")).toBeNull()
      expect(await service.get("cache:order:1")).toBe("c")
    })

    it("模式无匹配时不报错", async () => {
      await expect(service.delByPattern("nothing:*")).resolves.toBeUndefined()
    })
  })

  // ═══════════════════ BUFFER ═══════════════════

  describe("getBuffer/setBuffer", () => {
    it("设置并获取 Buffer", async () => {
      const buf = Buffer.from([0x01, 0x02, 0x03, 0xFF])
      await service.setBuffer("bin", buf)
      const result = await service.getBuffer("bin")
      expect(result).toBeInstanceOf(Buffer)
      expect(result!.equals(buf)).toBe(true)
    })

    it("获取不存在的 Buffer key 返回 null", async () => {
      const val = await service.getBuffer("no-bin")
      expect(val).toBeNull()
    })

    it("Buffer 带 TTL", async () => {
      const buf = Buffer.from("temp-data")
      await service.setBuffer("tmp-bin", buf, 3600)
      const result = await service.getBuffer("tmp-bin")
      expect(result!.toString()).toBe("temp-data")
    })
  })

  // ═══════════════════ SET 操作 ═══════════════════

  describe("sadd/srem/scard", () => {
    it("SADD 添加成员返回 1", async () => {
      const result = await service.sadd("set:1", "member-a")
      expect(result).toBe(1)
    })

    it("SADD 重复成员返回 0", async () => {
      await service.sadd("set:2", "member-a")
      const result = await service.sadd("set:2", "member-a")
      expect(result).toBe(0)
    })

    it("SREM 删除成员返回 1", async () => {
      await service.sadd("set:3", "member-a")
      const result = await service.srem("set:3", "member-a")
      expect(result).toBe(1)
    })

    it("SREM 不存在的成员返回 0", async () => {
      const result = await service.srem("set:4", "ghost")
      expect(result).toBe(0)
    })

    it("SCARD 统计成员数", async () => {
      await service.sadd("set:5", "a")
      await service.sadd("set:5", "b")
      await service.sadd("set:5", "c")
      const count = await service.scard("set:5")
      expect(count).toBe(3)
    })

    it("SCARD 空集合返回 0", async () => {
      const count = await service.scard("empty-set")
      expect(count).toBe(0)
    })
  })

  // ═══════════════════ SORTED SET 操作 ═══════════════════

  describe("zset presence helpers", () => {
    it("按成员删除与按分数清理过期项", async () => {
      await service.zadd("presence:1", 100, "a")
      await service.zadd("presence:1", 200, "b")
      await service.zadd("presence:1", 300, "c")

      await expect(service.zrem("presence:1", "b")).resolves.toBe(1)
      await expect(service.zremrangebyscore("presence:1", 0, 150)).resolves.toBe(1)
      await expect(service.zcard("presence:1")).resolves.toBe(1)
    })

    it("DEL 在内存降级模式同时清理 sorted set", async () => {
      await service.zadd("presence:2", 100, "a")
      await service.del("presence:2")
      await expect(service.zcard("presence:2")).resolves.toBe(0)
    })
  })

  // ═══════════════════ 限流 incrWithTtl ═══════════════════

  describe("incrWithTtl", () => {
    it("首次递增返回 count=1", async () => {
      const result = await service.incrWithTtl("rate:1", 60)
      expect(result.count).toBe(1)
      expect(result.ttl).toBeGreaterThan(0)
    })

    it("连续递增返回递增后的 count", async () => {
      await service.incrWithTtl("rate:2", 60)
      await service.incrWithTtl("rate:2", 60)
      const result = await service.incrWithTtl("rate:2", 60)
      expect(result.count).toBe(3)
    })

    it("过期后重新从 1 开始", async () => {
      await service.incrWithTtl("rate:3", 60)
      // 模拟过期
      const entry = (service as any).memory.get("rate:3")
      entry.expiry = Date.now() - 1000
      const result = await service.incrWithTtl("rate:3", 60)
      expect(result.count).toBe(1)
    })
  })

  // ═══════════════════ 边界场景 ═══════════════════

  describe("边界场景", () => {
    it("并行写入同一 key", async () => {
      await Promise.all([
        service.set("parallel", "a"),
        service.set("parallel", "b"),
        service.set("parallel", "c"),
      ])
      const val = await service.get("parallel")
      // 最后一次写入生效
      expect(["a", "b", "c"]).toContain(val!)
    })

    it("空字符串 key", async () => {
      await service.set("", "empty-key")
      const val = await service.get("")
      expect(val).toBe("empty-key")
    })

    it("值含特殊字符", async () => {
      await service.setJson("special", { text: "中文\n\t\"测试\"", num: 123, bool: true })
      const val = await service.getJson("special")
      expect(val).toEqual({ text: "中文\n\t\"测试\"", num: 123, bool: true })
    })

    it("大量 key 操作", async () => {
      for (let i = 0; i < 100; i++) {
        await service.set(`bulk:${i}`, `val-${i}`)
      }
      for (let i = 0; i < 100; i++) {
        expect(await service.get(`bulk:${i}`)).toBe(`val-${i}`)
      }
    })

    it("onModuleDestroy 无需清理（无 Redis 客户端）", async () => {
      await expect(service.onModuleDestroy()).resolves.toBeUndefined()
    })
  })
})
