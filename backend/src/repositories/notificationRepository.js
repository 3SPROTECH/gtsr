import { prisma } from '../config/db.js';

export const notificationRepository = {
  create: (data) => prisma.notification.create({ data }),

  listForUser: (userId, { skip = 0, take = 25, unreadOnly = false } = {}) =>
    prisma.notification.findMany({
      where: { userId, ...(unreadOnly && { isRead: false }) },
      skip, take, orderBy: { createdAt: 'desc' },
    }),

  markRead: (id, userId) =>
    prisma.notification.updateMany({ where: { id, userId }, data: { isRead: true } }),

  markAllRead: (userId) =>
    prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } }),

  countUnread: (userId) =>
    prisma.notification.count({ where: { userId, isRead: false } }),
};
