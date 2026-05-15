import { prisma } from '../config/db.js';

export const auditRepository = {
  log: ({ actorId, action, entity, entityId, metadata, ip }) =>
    prisma.auditLog.create({ data: { actorId, action, entity, entityId, metadata, ip } }),

  list: ({ skip = 0, take = 100, actorId, entity } = {}) =>
    prisma.auditLog.findMany({
      where: { ...(actorId && { actorId }), ...(entity && { entity }) },
      skip, take, orderBy: { createdAt: 'desc' },
      include: { actor: { select: { id: true, email: true, firstName: true, lastName: true } } },
    }),
};
