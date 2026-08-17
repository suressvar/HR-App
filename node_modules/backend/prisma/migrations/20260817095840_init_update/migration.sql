-- CreateEnum
CREATE TYPE "TaskFrequency" AS ENUM ('ONE_TIME', 'DAILY', 'WEEKLY', 'YEARLY');

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "frequency" "TaskFrequency" NOT NULL DEFAULT 'ONE_TIME';
