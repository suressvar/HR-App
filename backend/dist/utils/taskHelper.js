"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateOverdueTasks = updateOverdueTasks;
const client_1 = require("@prisma/client");
const prisma_1 = require("./prisma");
/**
 * Checks tasks and dynamically updates PENDING or IN_PROGRESS tasks whose dueDate has passed to OVERDUE.
 * Can be called on read or applied to a list of tasks.
 */
async function updateOverdueTasks(tasks) {
    const now = new Date();
    const overdueIdsToUpdate = [];
    const processedTasks = tasks.map((task) => {
        if ((task.status === client_1.TaskStatus.PENDING || task.status === client_1.TaskStatus.IN_PROGRESS) &&
            new Date(task.dueDate) < now) {
            overdueIdsToUpdate.push(task.id);
            return {
                ...task,
                status: client_1.TaskStatus.OVERDUE,
            };
        }
        return task;
    });
    if (overdueIdsToUpdate.length > 0) {
        // Fire and forget asynchronous database update for persistence
        prisma_1.prisma.task
            .updateMany({
            where: {
                id: { in: overdueIdsToUpdate },
                status: { in: [client_1.TaskStatus.PENDING, client_1.TaskStatus.IN_PROGRESS] },
            },
            data: {
                status: client_1.TaskStatus.OVERDUE,
            },
        })
            .catch((err) => console.error('Failed to update overdue tasks in DB:', err));
    }
    return processedTasks;
}
