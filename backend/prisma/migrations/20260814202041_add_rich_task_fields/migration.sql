-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- AlterEnum
ALTER TYPE "TaskStatus" ADD VALUE 'IN_REVIEW';

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "category" TEXT,
ADD COLUMN     "completionNotes" TEXT,
ADD COLUMN     "estimatedHours" DOUBLE PRECISION,
ADD COLUMN     "priority" "Priority" NOT NULL DEFAULT 'MEDIUM';
