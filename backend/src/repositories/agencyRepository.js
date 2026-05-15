import { prisma } from '../config/db.js';

export const agencyRepository = {
  list: () => prisma.agency.findMany({
    orderBy: { name: 'asc' },
    include: { manager: { select: { id: true, firstName: true, lastName: true, email: true } } },
  }),
  findById: (id) => prisma.agency.findUnique({
    where: { id },
    include: { manager: true, users: { select: { id: true, firstName: true, lastName: true, role: true } } },
  }),
  create: (data) => prisma.agency.create({ data }),
  update: (id, data) => prisma.agency.update({ where: { id }, data }),
  remove: (id) => prisma.agency.delete({ where: { id } }),
};
