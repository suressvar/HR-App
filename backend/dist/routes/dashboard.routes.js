"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const prisma_1 = require("../utils/prisma");
const auth_1 = require("../middleware/auth");
const client_1 = require("@prisma/client");
const taskHelper_1 = require("../utils/taskHelper");
const router = (0, express_1.Router)();
router.use(auth_1.requireAuth);
// GET /api/dashboard/owner (OWNER only)
router.get('/owner', (0, auth_1.requireRole)(client_1.Role.OWNER), async (req, res) => {
    try {
        const totalEmployees = await prisma_1.prisma.employee.count();
        const allTasks = await prisma_1.prisma.task.findMany();
        const updatedTasks = await (0, taskHelper_1.updateOverdueTasks)(allTasks);
        const totalTasks = updatedTasks.length;
        const completedTasks = updatedTasks.filter((t) => t.status === client_1.TaskStatus.COMPLETED).length;
        const overdueTasks = updatedTasks.filter((t) => t.status === client_1.TaskStatus.OVERDUE).length;
        // Compile per-employee progress
        const employeesList = await prisma_1.prisma.employee.findMany({
            orderBy: { name: 'asc' },
        });
        const employeeProgress = await Promise.all(employeesList.map(async (emp) => {
            const empTasks = await prisma_1.prisma.task.findMany({
                where: { employeeId: emp.id },
            });
            const updatedEmpTasks = await (0, taskHelper_1.updateOverdueTasks)(empTasks);
            const total = updatedEmpTasks.length;
            const completed = updatedEmpTasks.filter((t) => t.status === client_1.TaskStatus.COMPLETED).length;
            const overdue = updatedEmpTasks.filter((t) => t.status === client_1.TaskStatus.OVERDUE).length;
            const inProgress = total - (completed + overdue);
            return {
                id: emp.id,
                name: emp.name,
                role: emp.role,
                status: emp.status,
                totalTasks: total,
                completedTasks: completed,
                overdueTasks: overdue,
                inProgressTasks: inProgress,
            };
        }));
        // Retrieve recent 5 self-allocated tasks
        const recentTasks = await prisma_1.prisma.task.findMany({
            orderBy: { createdAt: 'desc' },
            take: 5,
            include: {
                employee: {
                    select: {
                        name: true,
                        role: true,
                    },
                },
            },
        });
        const updatedRecentTasks = await (0, taskHelper_1.updateOverdueTasks)(recentTasks);
        return res.status(200).json({
            totalEmployees,
            totalTasks,
            completedTasks,
            overdueTasks,
            employeeProgress,
            recentSelfAllocatedTasks: updatedRecentTasks,
        });
    }
    catch (error) {
        console.error('Owner dashboard summary error:', error);
        return res.status(500).json({ error: 'Failed to fetch owner dashboard metrics.' });
    }
});
// GET /api/dashboard/employee (EMPLOYEE only)
router.get('/employee', (0, auth_1.requireRole)(client_1.Role.EMPLOYEE), async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required.' });
        }
        const employee = await prisma_1.prisma.employee.findUnique({
            where: { userId: req.user.userId },
        });
        if (!employee) {
            return res.status(404).json({ error: 'Employee profile not found.' });
        }
        const totalEmployees = await prisma_1.prisma.employee.count();
        const employeeTasks = await prisma_1.prisma.task.findMany({
            where: { employeeId: employee.id },
        });
        const updatedTasks = await (0, taskHelper_1.updateOverdueTasks)(employeeTasks);
        const totalTasks = updatedTasks.length;
        const completedTasks = updatedTasks.filter((t) => t.status === client_1.TaskStatus.COMPLETED).length;
        const overdueTasks = updatedTasks.filter((t) => t.status === client_1.TaskStatus.OVERDUE).length;
        return res.status(200).json({
            totalEmployees,
            totalTasks,
            completedTasks,
            overdueTasks,
        });
    }
    catch (error) {
        console.error('Employee dashboard summary error:', error);
        return res.status(500).json({ error: 'Failed to fetch employee dashboard metrics.' });
    }
});
exports.default = router;
