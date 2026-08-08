import { Router, Request, Response } from 'express';
import { prisma } from '../utils/prisma';
import { requireAuth, requireRole } from '../middleware/auth';
import { Role, TaskStatus } from '@prisma/client';
import { updateOverdueTasks } from '../utils/taskHelper';

const router = Router();

router.use(requireAuth);

// GET /api/dashboard/owner (OWNER only)
router.get('/owner', requireRole(Role.OWNER), async (req: Request, res: Response) => {
  try {
    const totalEmployees = await prisma.employee.count();

    const allTasks = await prisma.task.findMany();
    const updatedTasks = await updateOverdueTasks(allTasks);

    const totalTasks = updatedTasks.length;
    const completedTasks = updatedTasks.filter((t) => t.status === TaskStatus.COMPLETED).length;
    const overdueTasks = updatedTasks.filter((t) => t.status === TaskStatus.OVERDUE).length;

    return res.status(200).json({
      totalEmployees,
      totalTasks,
      completedTasks,
      overdueTasks,
    });
  } catch (error) {
    console.error('Owner dashboard summary error:', error);
    return res.status(500).json({ error: 'Failed to fetch owner dashboard metrics.' });
  }
});

// GET /api/dashboard/employee (EMPLOYEE only)
router.get('/employee', requireRole(Role.EMPLOYEE), async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const employee = await prisma.employee.findUnique({
      where: { userId: req.user.userId },
    });

    if (!employee) {
      return res.status(404).json({ error: 'Employee profile not found.' });
    }

    const totalEmployees = await prisma.employee.count();

    const employeeTasks = await prisma.task.findMany({
      where: { employeeId: employee.id },
    });

    const updatedTasks = await updateOverdueTasks(employeeTasks);

    const totalTasks = updatedTasks.length;
    const completedTasks = updatedTasks.filter((t) => t.status === TaskStatus.COMPLETED).length;
    const overdueTasks = updatedTasks.filter((t) => t.status === TaskStatus.OVERDUE).length;

    return res.status(200).json({
      totalEmployees,
      totalTasks,
      completedTasks,
      overdueTasks,
    });
  } catch (error) {
    console.error('Employee dashboard summary error:', error);
    return res.status(500).json({ error: 'Failed to fetch employee dashboard metrics.' });
  }
});

export default router;
