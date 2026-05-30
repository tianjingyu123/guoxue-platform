-- AlterEnum
ALTER TYPE "TaskStatus" ADD VALUE 'EXPIRED';

-- AlterTable
ALTER TABLE "Task" ADD COLUMN "expiresAt" TIMESTAMP(3);
ALTER TABLE "Task" ALTER COLUMN "executorType" DROP NOT NULL;

-- AlterTable
ALTER TABLE "ChurnAction" ADD COLUMN "errorLog" TEXT;
ALTER TABLE "ChurnAction" ADD COLUMN "executedAt" TIMESTAMP(3);
