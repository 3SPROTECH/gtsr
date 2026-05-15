import { prisma } from '../config/db.js';

const TICKET_INCLUDE = {
  requester: { select: { id: true, firstName: true, lastName: true, email: true } },
  assignee:  { select: { id: true, firstName: true, lastName: true, email: true, role: true, availability: true } },
  agency:    { select: { id: true, code: true, name: true, openingHourStart: true, openingHourEnd: true, workingDays: true } },
  category:  true,
};

export const ticketRepository = {
  create: (data) => prisma.ticket.create({ data, include: TICKET_INCLUDE }),

  findById: (id) => prisma.ticket.findUnique({
    where: { id },
    include: {
      ...TICKET_INCLUDE,
      comments: {
        orderBy: { createdAt: 'asc' },
        include: { author: { select: { id: true, firstName: true, lastName: true, role: true } } },
      },
      attachments: true,
      escalations: { include: { fromUser: true, toUser: true } },
      history: { orderBy: { createdAt: 'asc' } },
      satisfaction: true,
      interventionReport: {
        include: {
          files: true,
          technician: { select: { id: true, firstName: true, lastName: true } },
        },
      },
    },
  }),

  findByNumber: (number) => prisma.ticket.findUnique({
    where: { number }, include: TICKET_INCLUDE,
  }),

  update: (id, data) => prisma.ticket.update({ where: { id }, data, include: TICKET_INCLUDE }),

  list: ({ skip = 0, take = 25, where = {}, orderBy = { createdAt: 'desc' } } = {}) =>
    prisma.ticket.findMany({ skip, take, where, orderBy, include: TICKET_INCLUDE }),

  count: (where = {}) => prisma.ticket.count({ where }),

  addComment: (ticketId, authorId, body, isInternal = false) =>
    prisma.comment.create({
      data: { ticketId, authorId, body, isInternal },
      include: { author: { select: { id: true, firstName: true, lastName: true, role: true } } },
    }),

  recordHistory: (ticketId, actorId, field, oldValue, newValue) =>
    prisma.ticketHistory.create({
      data: { ticketId, actorId, field, oldValue: String(oldValue ?? ''), newValue: String(newValue ?? '') },
    }),

  createEscalation: (data) => prisma.ticketEscalation.create({ data }),

  // KPI helpers (§11.3)
  groupByStatus: (where = {}) =>
    prisma.ticket.groupBy({ by: ['status'], where, _count: { _all: true } }),

  groupByPriority: (where = {}) =>
    prisma.ticket.groupBy({ by: ['priority'], where, _count: { _all: true } }),

  groupByCategory: (where = {}) =>
    prisma.ticket.groupBy({ by: ['categoryId'], where, _count: { _all: true } }),

  groupByAssignee: (where = {}) =>
    prisma.ticket.groupBy({ by: ['assigneeId'], where, _count: { _all: true } }),
};
