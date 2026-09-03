type Handler = (message: string) => void | Promise<void>;

/** 与 RedisService 的发布、订阅和异步退订契约一致，不跳过模块生命周期。 */
export function createRedisPubSubMock() {
  const channels = new Map<string, Set<Handler>>();
  return {
    subscribe: jest.fn(async (channel: string, handler: Handler) => {
      if (!channels.has(channel)) channels.set(channel, new Set());
      channels.get(channel)!.add(handler);
      return async () => {
        channels.get(channel)?.delete(handler);
        if (channels.get(channel)?.size === 0) channels.delete(channel);
      };
    }),
    publish: jest.fn(async (channel: string, message: string) => {
      const handlers = [...(channels.get(channel) || [])];
      await Promise.all(handlers.map((handler) => handler(message)));
      return handlers.length;
    }),
  };
}
