// Mock QueueModule — 避免 BullMQ ESM 加载问题
import { Global, Module } from "@nestjs/common";

const mockQueueService = {
  add: async () => ({ id: "mock-job-id", data: {} }),
  getJob: async () => undefined,
  getStats: async () => ({ waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 }),
  getAllStats: async () => ({}),
  addBulk: async () => [],
};

@Global()
@Module({
  providers: [{ provide: "QueueService", useValue: mockQueueService }],
  exports: ["QueueService"],
})
class MockQueueModule {}

export { MockQueueModule, mockQueueService };
