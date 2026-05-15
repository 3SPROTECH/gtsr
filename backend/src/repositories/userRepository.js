import { prisma } from '../config/db.js';

const SAFE_USER = {
  id: true, email: true, firstName: true, lastName: true, role: true,
  isActive: true, mfaEnabled: true, availability: true, lastSeenAt: true,
  agencyId: true, createdAt: true, updatedAt: true,
  agency: { select: { id: true, code: true, name: true } },
};

export const userRepository = {
  findByEmail: (email) =>
    prisma.user.findUnique({ where: { email }, include: { agency: true } }),

  findById: (id) =>
    prisma.user.findUnique({ where: { id }, select: SAFE_USER }),

  findByIdWithSecret: (id) =>
    prisma.user.findUnique({ where: { id } }),

  list: ({ skip = 0, take = 50, role, agencyId, q } = {}) =>
    prisma.user.findMany({
      where: {
        ...(role && { role }),
        ...(agencyId && { agencyId }),
        ...(q && {
          OR: [
            { email:     { contains: q, mode: 'insensitive' } },
            { firstName: { contains: q, mode: 'insensitive' } },
            { lastName:  { contains: q, mode: 'insensitive' } },
          ],
        }),
      },
      skip, take, orderBy: { createdAt: 'desc' },
      select: SAFE_USER,
    }),

  count: ({ role, agencyId, q } = {}) =>
    prisma.user.count({
      where: {
        ...(role && { role }),
        ...(agencyId && { agencyId }),
        ...(q && {
          OR: [
            { email:     { contains: q, mode: 'insensitive' } },
            { firstName: { contains: q, mode: 'insensitive' } },
            { lastName:  { contains: q, mode: 'insensitive' } },
          ],
        }),
      },
    }),

  create: (data) => prisma.user.create({ data, select: SAFE_USER }),

  update: (id, data) => prisma.user.update({ where: { id }, data, select: SAFE_USER }),

  updateRaw: (id, data) => prisma.user.update({ where: { id }, data }),

  remove: (id) => prisma.user.delete({ where: { id } }),

  incrementFailedLogins: (id) =>
    prisma.user.update({ where: { id }, data: { failedLogins: { increment: 1 } } }),

  resetFailedLogins: (id) =>
    prisma.user.update({ where: { id }, data: { failedLogins: 0, lockedUntil: null } }),

  lock: (id, until) =>
    prisma.user.update({ where: { id }, data: { lockedUntil: until } }),
};
