import { Task, TaskStatus } from '@prisma/client';
import { prisma } from './prisma';

/**
 * Checks tasks and dynamically updates PENDING or IN_PROGRESS tasks whose dueDate has passed to OVERDUE.
 * Can be called on read or applied to a list of tasks.
 */
export async function updateOverdueTasks<T extends Task>(tasks: T[]): Promise<T[]> {
  const now = new Date();
  const overdueIdsToUpdate: string[] = [];

  const processedTasks = tasks.map((task) => {
    if (
      (task.status === TaskStatus.PENDING || task.status === TaskStatus.IN_PROGRESS) &&
      new Date(task.dueDate) < now
    ) {
      overdueIdsToUpdate.push(task.id);
      return {
        ...task,
        status: TaskStatus.OVERDUE,
      };
    }
    return task;
  });

  if (overdueIdsToUpdate.length > 0) {
    // Fire and forget asynchronous database update for persistence
    prisma.task
      .updateMany({
        where: {
          id: { in: overdueIdsToUpdate },
          status: { in: [TaskStatus.PENDING, TaskStatus.IN_PROGRESS] },
        },
        data: {
          status: TaskStatus.OVERDUE,
        },
      })
      .catch((err) => console.error('Failed to update overdue tasks in DB:', err));
  }

  return processedTasks;
}
