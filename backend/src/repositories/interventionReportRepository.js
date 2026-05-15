import { prisma } from '../config/db.js';

const REPORT_INCLUDE = {
  technician: { select: { id: true, firstName: true, lastName: true, email: true, role: true } },
  ticket: {
    select: {
      id: true, number: true, title: true, status: true, agencyId: true,
      requester: { select: { id: true, firstName: true, lastName: true } },
      agency: { select: { id: true, code: true, name: true } },
    },
  },
  files: true,
};

export const interventionReportRepository = {
  findById: (id) => prisma.interventionReport.findUnique({
    where: { id }, include: REPORT_INCLUDE,
  }),

  findByTicketId: (ticketId) => prisma.interventionReport.findUnique({
    where: { ticketId }, include: REPORT_INCLUDE,
  }),

  list: ({ skip = 0, take = 50, where = {}, orderBy = { createdAt: 'desc' } } = {}) =>
    prisma.interventionReport.findMany({ skip, take, where, orderBy, include: REPORT_INCLUDE }),

  count: (where = {}) => prisma.interventionReport.count({ where }),

  create: ({ ticketId, technicianId, description, files }) =>
    prisma.interventionReport.create({
      data: {
        ticketId, technicianId, description,
        files: files && files.length
          ? { create: files.map((f) => ({ filename: f.originalname, mimetype: f.mimetype, size: f.size })) }
          : undefined,
      },
      include: REPORT_INCLUDE,
    }),
};
