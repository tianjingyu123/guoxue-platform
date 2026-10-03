const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");

// 必须显式选择隔离目标，禁止复用应用 REDIS_URL 或默认连接本机业务 Redis。
function parseQaRedisTarget(env) {
  if (env.NODE_ENV !== "test" || env.QA_REDIS_CONFIRM !== "ISOLATED_TEST_REDIS") {
    throw new Error("拒绝执行：仅限 test 环境，并需确认 ISOLATED_TEST_REDIS");
  }
  let target;
  try {
    target = new URL(env.QA_REDIS_URL);
  } catch {
    throw new Error("缺少有效的 QA_REDIS_URL；不会回退使用业务连接");
  }
  const port = Number(target.port || 6379);
  const isolatedContainer = target.hostname === "redis" && port === 6379;
  const isolatedLoopback = ["127.0.0.1", "localhost"].includes(target.hostname) && port === 56380;
  if (
    target.protocol !== "redis:" ||
    target.username ||
    target.password ||
    target.search ||
    target.hash ||
    target.pathname !== "/15" ||
    (!isolatedContainer && !isolatedLoopback)
  ) {
    throw new Error("拒绝连接：仅允许隔离 redis 容器或本机 56380 端口的 15 号测试库");
  }
  return { host: target.hostname, port, db: 15 };
}

function validateRedisServer(info, policy) {
  const version = info.match(/^redis_version:([^\r\n]+)$/m)?.[1];
  assert.equal(Number(version?.split(".")[0]), 7, "隔离环境必须使用 Redis 7");
  assert.equal(policy, "noeviction", "队列 Redis 必须使用 noeviction");
  return version;
}

async function runSmoke(env = process.env) {
  const target = parseQaRedisTarget(env);
  const Redis = require("ioredis");
  const { Queue, Worker, QueueEvents } = require("bullmq");
  const connection = { ...target, connectTimeout: 3000, retryStrategy: () => null };
  const redis = new Redis({ ...connection, lazyConnect: true, maxRetriesPerRequest: 1 });
  const queueName = `admin-qa-${randomUUID()}`;
  const connectionErrors = [];
  const captureError = (error) => connectionErrors.push(error.message);
  redis.on("error", captureError);
  let queue;
  let worker;
  let events;
  // 网络或关闭异常不能让验收无限挂起；超时必须失败，不能生成通过结果。
  const watchdog = setTimeout(() => {
    console.error(
      JSON.stringify({
        ok: false,
        queue: queueName,
        error: "队列验收超时，须检查本次独立队列残留",
      }),
    );
    process.exit(1);
  }, 45000);
  watchdog.unref();
  try {
    await redis.connect();
    const version = validateRedisServer(
      await redis.info("server"),
      (await redis.config("GET", "maxmemory-policy"))[1],
    );
    queue = new Queue(queueName, { connection });
    events = new QueueEvents(queueName, { connection });
    worker = new Worker(
      queueName,
      async (job) => {
        if (job.name === "failure") throw new Error("QA_EXPECTED_FAILURE");
        if (job.name === "retry" && job.attemptsMade === 0) throw new Error("QA_EXPECTED_RETRY");
        return { verified: true };
      },
      { connection, concurrency: 1 },
    );
    for (const resource of [queue, events, worker]) resource.on("error", captureError);
    await Promise.all([queue.waitUntilReady(), events.waitUntilReady(), worker.waitUntilReady()]);

    const success = await queue.add("success", { qa: true });
    assert.deepEqual(await success.waitUntilFinished(events, 10000), { verified: true });
    const retry = await queue.add(
      "retry",
      { qa: true },
      { attempts: 2, backoff: { type: "fixed", delay: 100 } },
    );
    assert.deepEqual(await retry.waitUntilFinished(events, 10000), { verified: true });
    const retried = await queue.getJob(retry.id);
    assert.equal(retried.attemptsMade, 2, "必须实际失败一次并重试成功");

    const failure = await queue.add("failure", { qa: true }, { attempts: 1 });
    await assert.rejects(failure.waitUntilFinished(events, 10000), /QA_EXPECTED_FAILURE/);
    assert.equal(await failure.getState(), "failed");
    assert.deepEqual(connectionErrors, [], "队列验收期间出现连接错误");
    return {
      ok: true,
      redisVersion: version,
      policy: "noeviction",
      checks: ["enqueue", "consume", "success", "retry", "failure"],
    };
  } finally {
    try {
      await worker?.close();
      // 只清理本进程新建的随机队列，不使用 FLUSHDB、FLUSHALL 或业务队列名称。
      await queue?.obliterate({ force: false });
    } finally {
      const closed = await Promise.allSettled([events?.close(), queue?.close()]);
      redis.disconnect();
      clearTimeout(watchdog);
      assert.ok(
        closed.every((result) => result.status === "fulfilled"),
        "队列连接未全部正常关闭",
      );
    }
  }
}

module.exports = { parseQaRedisTarget, validateRedisServer, runSmoke };

if (require.main === module) {
  runSmoke()
    .then((result) => console.log(JSON.stringify(result)))
    .catch((error) => {
      console.error(JSON.stringify({ ok: false, error: error.message }));
      process.exitCode = 1;
    });
}
