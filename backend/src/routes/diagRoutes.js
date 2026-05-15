// Endpoint de diagnostic - teste chaque opération Prisma indépendamment
// Accès : GET /api/_diag  (auth requise)

import { Router } from 'express';
import { prisma } from '../config/db.js';
import { authenticate } from '../middlewares/authMiddleware.js';

const router = Router();

const safe = async (label, fn) => {
  try { const r = await fn(); return { label, ok: true, sample: r }; }
  catch (e) { return { label, ok: false, name: e.name, msg: e.message, code: e.code, meta: e.meta }; }
};

router.get('/', authenticate, async (req, res) => {
  const tests = [
    safe('user.findUnique(SAFE_USER select)', () =>
      prisma.user.findUnique({
        where: { id: req.user.id },
        select: {
          id: true, email: true, firstName: true, lastName: true, role: true,
          isActive: true, mfaEnabled: true, agencyId: true, createdAt: true, updatedAt: true,
          agency: { select: { id: true, code: true, name: true } },
        },
      })),
    safe('ticket.count()', () => prisma.ticket.count()),
    safe('ticket.findMany take=5', () => prisma.ticket.findMany({ take: 5 })),
    safe('ticket.groupBy by:status', () =>
      prisma.ticket.groupBy({ by: ['status'], _count: { status: true } })),
    safe('ticket.groupBy by:priority', () =>
      prisma.ticket.groupBy({ by: ['priority'], _count: { priority: true } })),
    safe('ticket.groupBy by:grade', () =>
      prisma.ticket.groupBy({ by: ['grade'], _count: { grade: true } })),
    safe('ticket.groupBy by:categoryId+orderBy', () =>
      prisma.ticket.groupBy({
        by: ['categoryId'], _count: { categoryId: true },
        orderBy: { _count: { categoryId: 'desc' } }, take: 5,
      })),
    safe('ticket.groupBy by:assigneeId', () =>
      prisma.ticket.groupBy({
        by: ['assigneeId'],
        where: { assigneeId: { not: null } },
        _count: { assigneeId: true },
      })),
    safe('satisfactionSurvey.aggregate (no where)', () =>
      prisma.satisfactionSurvey.aggregate({ _avg: { rating: true }, _count: { rating: true } })),
    safe('notification.findMany', () =>
      prisma.notification.findMany({ where: { userId: req.user.id }, take: 5 })),
    safe('category.findMany', () => prisma.category.findMany({ take: 5 })),
    safe('user.findMany', () => prisma.user.findMany({ take: 5, select: { id: true, email: true, role: true } })),
  ];

  const results = await Promise.all(tests);
  res.json({
    user: { id: req.user.id, role: req.user.role, email: req.user.email },
    summary: {
      ok: results.filter(r => r.ok).length,
      ko: results.filter(r => !r.ok).length,
    },
    results,
  });
});

export default router;
