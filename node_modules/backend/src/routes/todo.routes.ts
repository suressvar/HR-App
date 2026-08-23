import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { requireAuth } from '../middleware/auth';

const router = Router();

const createTodoSchema = z.object({
  title: z.string().min(1, 'Title is required'),
});

const updateTodoSchema = z.object({
  completed: z.boolean(),
});

// All todo routes require authentication
router.use(requireAuth);

// GET /api/todos
router.get('/', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const todos = await prisma.todo.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: 'desc' },
    });

    return res.status(200).json(todos);
  } catch (error) {
    console.error('Fetch todos error:', error);
    return res.status(500).json({ error: 'Failed to fetch to-do items.' });
  }
});

// POST /api/todos
router.post('/', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const parseResult = createTodoSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues.map((e) => e.message).join(', ');
      return res.status(400).json({ error: errorMessage });
    }

    const { title } = parseResult.data;

    const todo = await prisma.todo.create({
      data: {
        userId: req.user.userId,
        title,
        completed: false,
      },
    });

    return res.status(201).json(todo);
  } catch (error) {
    console.error('Create todo error:', error);
    return res.status(500).json({ error: 'Failed to create to-do item.' });
  }
});

// PATCH /api/todos/:id
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const parseResult = updateTodoSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues.map((e) => e.message).join(', ');
      return res.status(400).json({ error: errorMessage });
    }

    const { completed } = parseResult.data;
    const { id } = req.params;

    const existingTodo = await prisma.todo.findUnique({
      where: { id },
    });

    if (!existingTodo) {
      return res.status(404).json({ error: 'To-do item not found.' });
    }

    if (existingTodo.userId !== req.user.userId) {
      return res.status(403).json({ error: 'Forbidden: You do not own this to-do item.' });
    }

    const updatedTodo = await prisma.todo.update({
      where: { id },
      data: { completed },
    });

    return res.status(200).json(updatedTodo);
  } catch (error) {
    console.error('Update todo error:', error);
    return res.status(500).json({ error: 'Failed to update to-do item.' });
  }
});

// DELETE /api/todos/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const { id } = req.params;

    const existingTodo = await prisma.todo.findUnique({
      where: { id },
    });

    if (!existingTodo) {
      return res.status(404).json({ error: 'To-do item not found.' });
    }

    if (existingTodo.userId !== req.user.userId) {
      return res.status(403).json({ error: 'Forbidden: You do not own this to-do item.' });
    }

    await prisma.todo.delete({
      where: { id },
    });

    return res.status(200).json({ message: 'To-do item deleted successfully.' });
  } catch (error) {
    console.error('Delete todo error:', error);
    return res.status(500).json({ error: 'Failed to delete to-do item.' });
  }
});

export default router;
