"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const zod_1 = require("zod");
const prisma_1 = require("../utils/prisma");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const createTodoSchema = zod_1.z.object({
    title: zod_1.z.string().min(1, 'Title is required'),
});
const updateTodoSchema = zod_1.z.object({
    completed: zod_1.z.boolean(),
});
// All todo routes require authentication
router.use(auth_1.requireAuth);
// GET /api/todos
router.get('/', async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required.' });
        }
        const todos = await prisma_1.prisma.todo.findMany({
            where: { userId: req.user.userId },
            orderBy: { createdAt: 'desc' },
        });
        return res.status(200).json(todos);
    }
    catch (error) {
        console.error('Fetch todos error:', error);
        return res.status(500).json({ error: 'Failed to fetch to-do items.' });
    }
});
// POST /api/todos
router.post('/', async (req, res) => {
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
        const todo = await prisma_1.prisma.todo.create({
            data: {
                userId: req.user.userId,
                title,
                completed: false,
            },
        });
        return res.status(201).json(todo);
    }
    catch (error) {
        console.error('Create todo error:', error);
        return res.status(500).json({ error: 'Failed to create to-do item.' });
    }
});
// PATCH /api/todos/:id
router.patch('/:id', async (req, res) => {
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
        const existingTodo = await prisma_1.prisma.todo.findUnique({
            where: { id },
        });
        if (!existingTodo) {
            return res.status(404).json({ error: 'To-do item not found.' });
        }
        if (existingTodo.userId !== req.user.userId) {
            return res.status(403).json({ error: 'Forbidden: You do not own this to-do item.' });
        }
        const updatedTodo = await prisma_1.prisma.todo.update({
            where: { id },
            data: { completed },
        });
        return res.status(200).json(updatedTodo);
    }
    catch (error) {
        console.error('Update todo error:', error);
        return res.status(500).json({ error: 'Failed to update to-do item.' });
    }
});
// DELETE /api/todos/:id
router.delete('/:id', async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required.' });
        }
        const { id } = req.params;
        const existingTodo = await prisma_1.prisma.todo.findUnique({
            where: { id },
        });
        if (!existingTodo) {
            return res.status(404).json({ error: 'To-do item not found.' });
        }
        if (existingTodo.userId !== req.user.userId) {
            return res.status(403).json({ error: 'Forbidden: You do not own this to-do item.' });
        }
        await prisma_1.prisma.todo.delete({
            where: { id },
        });
        return res.status(200).json({ message: 'To-do item deleted successfully.' });
    }
    catch (error) {
        console.error('Delete todo error:', error);
        return res.status(500).json({ error: 'Failed to delete to-do item.' });
    }
});
exports.default = router;
