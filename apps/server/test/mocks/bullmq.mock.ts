// Mock @nestjs/bullmq to avoid ESM (msgpackr) loading issues in Jest
import { Module, ValueProvider } from "@nestjs/common";

const queueTokenMap = new Map<string, string>();

function getQueueToken(name: string): string {
  const token = `BullQueue_${name}`;
  queueTokenMap.set(name, token);
  return token;
}

const BullModule = {
  forRoot: (): any => ({ module: class {}, providers: [] }),
  registerQueue: (...names: { name: string }[]): any => {
    const providers: ValueProvider[] = names.map((n) => ({
      provide: getQueueToken(n.name),
      useValue: {
        add: async () => ({ id: "mock-job-id", data: {} }),
        getJob: async () => undefined,
        getWaitingCount: async () => 0,
        getActiveCount: async () => 0,
        getCompletedCount: async () => 0,
        getFailedCount: async () => 0,
        getDelayedCount: async () => 0,
        addBulk: async () => [],
      },
    }));
    return { module: class {}, providers };
  },
  forRootAsync: (): any => ({ module: class {}, providers: [] }),
  registerQueueAsync: (..._args: any[]): any => ({ module: class {}, providers: [] }),
};

const InjectQueue = (name: string): ParameterDecorator => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((target: any, _key: any, index: number) => {
    // Store metadata for NestJS DI to pick up
    const token = getQueueToken(name);
    Reflect.defineMetadata("self:paramtypes", [token], target);
  }) as any;
};

const Processor = (_name: string): ClassDecorator => (() => {}) as any;

class WorkerHost {
  async process(_job: any): Promise<void> {}
  async onModuleDestroy(): Promise<void> {}
}

class QueueEvents {}

export { BullModule, InjectQueue, Processor, WorkerHost, QueueEvents, getQueueToken };
