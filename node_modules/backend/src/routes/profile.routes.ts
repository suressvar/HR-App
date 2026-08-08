import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { requireAuth } from '../middleware/auth';
import { Role } from '@prisma/client';

const router = Router();

const updateProfileSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  personalInfo: z.string().optional(),
});

router.use(requireAuth);

// GET /api/profile
router.get('/', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    if (req.user.role === Role.OWNER) {
      const ownerProfile = await prisma.ownerProfile.findUnique({
        where: { userId: req.user.userId },
        include: {
          user: {
            select: { id: true, email: true, role: true, createdAt: true },
          },
        },
      });
      if (!ownerProfile) {
        return res.status(404).json({ error: 'Owner profile not found.' });
      }
      return res.status(200).json(ownerProfile);
    } else {
      const employeeProfile = await prisma.employee.findUnique({
        where: { userId: req.user.userId },
        include: {
          user: {
            select: { id: true, email: true, role: true, createdAt: true },
          },
        },
      });
      if (!employeeProfile) {
        return res.status(404).json({ error: 'Employee profile not found.' });
      }
      return res.status(200).json(employeeProfile);
    }
  } catch (error) {
    console.error('Fetch profile error:', error);
    return res.status(500).json({ error: 'Failed to fetch profile.' });
  }
});

// PATCH /api/profile — Update caller's own details (no role or userId mutation allowed)
router.patch('/', async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required.' });
    }

    const parseResult = updateProfileSchema.safeParse(req.body);
    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues.map((e) => e.message).join(', ');
      return res.status(400).json({ error: errorMessage });
    }

    const dataToUpdate = parseResult.data;

    if (req.user.role === Role.OWNER) {
      const updated = await prisma.ownerProfile.update({
        where: { userId: req.user.userId },
        data: {
          ...(dataToUpdate.name && { name: dataToUpdate.name }),
          ...(dataToUpdate.email && { email: dataToUpdate.email }),
          ...(dataToUpdate.phone && { phone: dataToUpdate.phone }),
          ...(dataToUpdate.personalInfo !== undefined && { personalInfo: dataToUpdate.personalInfo }),
        },
      });
      return res.status(200).json(updated);
    } else {
      const updated = await prisma.employee.update({
        where: { userId: req.user.userId },
        data: {
          ...(dataToUpdate.name && { name: dataToUpdate.name }),
          ...(dataToUpdate.email && { email: dataToUpdate.email }),
          ...(dataToUpdate.phone && { phone: dataToUpdate.phone }),
          ...(dataToUpdate.address && { address: dataToUpdate.address }),
        },
      });
      return res.status(200).json(updated);
    }
  } catch (error) {
    console.error('Update profile error:', error);
    return res.status(500).json({ error: 'Failed to update profile.' });
  }
});

export default router;
