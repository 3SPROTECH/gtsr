// CDC §11 - Tableaux de bord et KPI
import { prisma } from '../config/db.js';
import { can } from '../domain/permissions.js';
import { Forbidden } from '../utils/errors.js';

function scopeFor(actor, agencyId) {
  if (actor.role === 'USER') return { requesterId: actor.id };
  // ADMIN peut filtrer par agence via le sélecteur (sinon voit tout)
  if (actor.role === 'ADMIN' && agencyId) return { agencyId };
  return {}; // TECHNICIAN voit tout (limité par d'autres règles)
}

export const reportService = {
  // §11.1 - dashboard global / par rôle
  async dashboard(actor, { from, to, agencyId } = {}) {
    const where = { ...scopeFor(actor, agencyId) };
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to)   where.createdAt.lte = new Date(to);
    }

    const [total, byStatusRaw, byPriorityRaw, byGradeRaw, slaBreached, satisfaction] = await Promise.all([
      prisma.ticket.count({ where }),
      prisma.ticket.groupBy({ by: ['status'],   where, _count: { status:   true } }),
      prisma.ticket.groupBy({ by: ['priority'], where, _count: { priority: true } }),
      prisma.ticket.groupBy({ by: ['grade'],    where, _count: { grade:    true } }),
      prisma.ticket.count({ where: { ...where, slaBreached: true } }),
      prisma.satisfactionSurvey.aggregate({
        where: Object.keys(where).length ? { ticket: { is: where } } : undefined,
        _avg: { rating: true },
        _count: { rating: true },
      }),
    ]);

    const slaRate = total ? Math.round(((total - slaBreached) / total) * 100) : 100;

    const backlog = await prisma.ticket.count({
      where: { ...where, status: { in: ['OPEN', 'IN_PROGRESS'] } },
    });
    const resolved = await prisma.ticket.count({
      where: { ...where, status: 'DONE' },
    });

    return {
      total, backlog, resolved, slaBreached, slaRate,
      satisfaction: {
        avg: satisfaction._avg.rating ?? null,
        count: satisfaction._count.rating ?? 0,
      },
      byStatus:   byStatusRaw.map(s   => ({ status:   s.status,   count: s._count.status })),
      byPriority: byPriorityRaw.map(s => ({ priority: s.priority, count: s._count.priority })),
      byGrade:    byGradeRaw.map(s    => ({ grade:    s.grade,    count: s._count.grade })),
    };
  },

  async technicianDashboard(actor) {
    if (!['TECHNICIAN', 'ADMIN'].includes(actor.role)) throw Forbidden();
    const [myOpen, myInProgress, atRisk, resolvedByMe] = await Promise.all([
      prisma.ticket.count({ where: { assigneeId: actor.id, status: { in: ['OPEN', 'IN_PROGRESS'] } } }),
      prisma.ticket.count({ where: { assigneeId: actor.id, status: 'IN_PROGRESS' } }),
      prisma.ticket.count({
        where: {
          assigneeId: actor.id,
          status: { in: ['OPEN', 'IN_PROGRESS'] },
          dueResolutionAt: { lte: new Date(Date.now() + 60 * 60 * 1000) },
        },
      }),
      prisma.ticket.count({ where: { assigneeId: actor.id, status: 'DONE' } }),
    ]);
    return { myOpen, myInProgress, atRisk, resolvedByMe };
  },

  async topCategories(actor, { agencyId, limit = 5 } = {}) {
    const where = scopeFor(actor, agencyId);
    const groups = await prisma.ticket.groupBy({
      by: ['categoryId'],
      where,
      _count: { categoryId: true },
      orderBy: { _count: { categoryId: 'desc' } },
      take: limit,
    });
    const ids = groups.map(g => g.categoryId).filter(Boolean);
    const cats = ids.length
      ? await prisma.category.findMany({ where: { id: { in: ids } } })
      : [];
    return groups.map(g => ({
      categoryId: g.categoryId,
      name: cats.find(c => c.id === g.categoryId)?.name || 'Non catégorisé',
      count: g._count.categoryId,
    }));
  },

  async techWorkload(actor, { agencyId } = {}) {
    if (!can(actor.role, 'report.viewGlobal')) throw Forbidden();
    const rows = await prisma.ticket.groupBy({
      by: ['assigneeId'],
      where: {
        status: { in: ['OPEN', 'IN_PROGRESS'] },
        assigneeId: { not: null },
        ...(agencyId && { agencyId }),
      },
      _count: { assigneeId: true },
    });
    const ids = rows.map(r => r.assigneeId).filter(Boolean);
    const users = ids.length
      ? await prisma.user.findMany({
          where: { id: { in: ids } },
          select: { id: true, firstName: true, lastName: true, role: true },
        })
      : [];
    return rows.map(r => ({
      assigneeId: r.assigneeId,
      tech: users.find(u => u.id === r.assigneeId),
      open: r._count.assigneeId,
    }));
  },
};
