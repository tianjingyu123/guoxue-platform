import { AsyncLocalStorage } from "async_hooks";

export interface RequestContextData {
  traceId: string;
  userId?: string;
  stationId?: string;
  path?: string;
  method?: string;
}

const storage = new AsyncLocalStorage<RequestContextData>();

export const RequestContext = {
  run(ctx: RequestContextData, fn: () => void) {
    storage.run(ctx, fn);
  },

  get(): RequestContextData | undefined {
    return storage.getStore();
  },

  traceId(): string | undefined {
    return storage.getStore()?.traceId;
  },

  userId(): string | undefined {
    return storage.getStore()?.userId;
  },

  stationId(): string | undefined {
    return storage.getStore()?.stationId;
  },
};
