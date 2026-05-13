// Mock bullmq to avoid ESM (msgpackr) loading issues in Jest
const Queue = class {};
const Job = class {};
const Worker = class {};
const QueueScheduler = class {};
const QueueEvents = class {};

export { Queue, Job, Worker, QueueScheduler, QueueEvents };
