import { prisma } from '../config/db.js';

export const categoryRepository = {
  list: () => prisma.category.findMany({
    orderBy: [{ parentId: 'asc' }, { name: 'asc' }],
    include: { parent: true, children: true },
  }),
  findById: (id) => prisma.category.findUnique({ where: { id }, include: { children: true } }),
  create: (data) => prisma.category.create({ data }),
  update: (id, data) => prisma.category.update({ where: { id }, data }),
  remove: (id) => prisma.category.delete({ where: { id } }),
};
