import { notificationRepository } from '../repositories/notificationRepository.js';
import { sendMail } from '../config/mailer.js';

// CDC §9 - événements + canaux
export const notificationService = {
  async notify({ userId, ticketId, title, body, email, channels = ['IN_APP'] }) {
    const tasks = [];

    if (channels.includes('IN_APP')) {
      tasks.push(notificationRepository.create({ userId, ticketId, channel: 'IN_APP', title, body }));
    }
    if (channels.includes('EMAIL') && email) {
      tasks.push(sendMail({ to: email, subject: title, html: `<p>${body}</p>`, text: body })
        .catch(err => console.error('[MAIL ERROR]', err.message)));
    }
    await Promise.all(tasks);
  },

  list(userId, opts) {
    return notificationRepository.listForUser(userId, opts);
  },

  markRead(id, userId) {
    return notificationRepository.markRead(id, userId);
  },

  markAllRead(userId) {
    return notificationRepository.markAllRead(userId);
  },

  countUnread(userId) {
    return notificationRepository.countUnread(userId);
  },
};
