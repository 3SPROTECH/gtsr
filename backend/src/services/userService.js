import bcrypt from 'bcryptjs';
import { env } from '../config/env.js';
import { prisma } from '../config/db.js';
import { userRepository } from '../repositories/userRepository.js';
import { auditRepository } from '../repositories/auditRepository.js';
import { can } from '../domain/permissions.js';
import { BadRequest, Forbidden, NotFound } from '../utils/errors.js';

const ONLINE_WINDOW_MS = 5 * 60_000;

export const userService = {
  async list(actor, filters, paging) {
    // ADMIN gère tout, TECHNICIAN peut lister pour assigner un ticket
    if (!['ADMIN', 'TECHNICIAN'].includes(actor.role)) throw Forbidden();
    const [items, total] = await Promise.all([
      userRepository.list({ ...filters, ...paging }),
      userRepository.count(filters),
    ]);
    return { items, total };
  },

  async create(input, actor) {
    if (!can(actor.role, 'user.manage')) throw Forbidden();
    const exist = await userRepository.findByEmail(input.email.toLowerCase());
    if (exist) throw BadRequest('Email déjà utilisé');
    const hash = await bcrypt.hash(input.password, env.bcryptRounds);
    const user = await userRepository.create({
      email: input.email.toLowerCase(),
      password: hash,
      firstName: input.firstName,
      lastName: input.lastName,
      role: input.role || 'USER',
      agencyId: input.agencyId || null,
    });
    await auditRepository.log({ actorId: actor.id, action: 'USER_CREATE', entity: 'User', entityId: user.id });
    return user;
  },

  async update(id, patch, actor) {
    if (!can(actor.role, 'user.manage') && actor.id !== id) throw Forbidden();
    const exists = await userRepository.findById(id);
    if (!exists) throw NotFound();
    const data = {};
    ['firstName', 'lastName', 'role', 'agencyId', 'isActive'].forEach(k => {
      if (patch[k] !== undefined) data[k] = patch[k];
    });
    if (patch.password) data.password = await bcrypt.hash(patch.password, env.bcryptRounds);

    // Un utilisateur ne peut pas changer son propre rôle
    if (actor.id === id && !can(actor.role, 'user.manage')) delete data.role;

    const u = await userRepository.update(id, data);
    await auditRepository.log({ actorId: actor.id, action: 'USER_UPDATE', entity: 'User', entityId: id });
    return u;
  },

  async remove(id, actor) {
    if (!can(actor.role, 'user.manage')) throw Forbidden();
    await userRepository.remove(id);
    await auditRepository.log({ actorId: actor.id, action: 'USER_DELETE', entity: 'User', entityId: id });
  },

  getById(id) {
    return userRepository.findById(id);
  },

  // Compte des utilisateurs actifs dans les 5 dernières minutes (présence "en ligne").
  // Exclut l'acteur lui-même : un admin qui consulte la sidebar ne doit pas se compter.
  async onlineCount(actor) {
    if (actor.role !== 'ADMIN') throw Forbidden();
    const since = new Date(Date.now() - ONLINE_WINDOW_MS);
    return prisma.user.count({
      where: {
        isActive: true,
        lastSeenAt: { gte: since },
        id: { not: actor.id },
      },
    });
  },
};
