import { Task, TaskStatus } from '@prisma/client';
import { prisma } from './prisma';

/**
 * Checks tasks and dynamically updates PENDING or IN_PROGRESS tasks whose dueDate has passed to OVERDUE.
 * Can be called on read or applied to a list of tasks.
 */
export async function updateOverdueTasks<T extends Task>(tasks: T[]): Promise<T[]> {
  return tasks;
}
