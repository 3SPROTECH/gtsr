import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { prisma } from '../config/db.js';
import { userRepository } from '../repositories/userRepository.js';
import { auditRepository } from '../repositories/auditRepository.js';
import { forgetLastSeen } from '../middlewares/authMiddleware.js';
import { BadRequest, Unauthorized } from '../utils/errors.js';

const MAX_FAILED_LOGINS = 5;
const LOCK_DURATION_MIN = 15;

function signAccess(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email },
    env.jwt.secret,
    { expiresIn: env.jwt.accessExpires },
  );
}

function signRefresh(user) {
  return jwt.sign({ sub: user.id, typ: 'refresh' }, env.jwt.secret, {
    expiresIn: env.jwt.refreshExpires,
  });
}

export const authService = {
  async login(email, password, ip) {
    const user = await userRepository.findByEmail(email.toLowerCase());
    if (!user || !user.isActive) throw Unauthorized('Identifiants invalides');

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw Unauthorized('Compte temporairement verrouillé');
    }

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) {
      await userRepository.incrementFailedLogins(user.id);
      if (user.failedLogins + 1 >= MAX_FAILED_LOGINS) {
        await userRepository.lock(user.id, new Date(Date.now() + LOCK_DURATION_MIN * 60_000));
      }
      throw Unauthorized('Identifiants invalides');
    }

    await userRepository.resetFailedLogins(user.id);

    const accessToken = signAccess(user);
    const refreshToken = signRefresh(user);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await prisma.refreshToken.create({ data: { token: refreshToken, userId: user.id, expiresAt } });

    await auditRepository.log({ actorId: user.id, action: 'LOGIN', entity: 'User', entityId: user.id, ip });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName,
        role: user.role, agencyId: user.agencyId, availability: user.availability,
        agency: user.agency ? { id: user.agency.id, name: user.agency.name, code: user.agency.code } : null,
      },
    };
  },

  async updateAvailability(userId, availability) {
    if (!['AVAILABLE', 'BUSY', 'AWAY'].includes(availability)) throw BadRequest('Statut invalide');
    return userRepository.update(userId, { availability });
  },

  async refresh(token) {
    if (!token) throw Unauthorized('Refresh token manquant');
    let payload;
    try { payload = jwt.verify(token, env.jwt.secret); }
    catch { throw Unauthorized('Refresh token invalide'); }

    const stored = await prisma.refreshToken.findUnique({ where: { token } });
    if (!stored || stored.revoked || stored.expiresAt < new Date())
      throw Unauthorized('Refresh token expiré');

    const user = await userRepository.findByIdWithSecret(payload.sub);
    if (!user || !user.isActive) throw Unauthorized();

    return { accessToken: signAccess(user) };
  },

  async logout(token) {
    if (!token) return;
    const stored = await prisma.refreshToken.findUnique({ where: { token } });
    await prisma.refreshToken.updateMany({ where: { token }, data: { revoked: true } });
    if (stored?.userId) {
      // Marque l'utilisateur hors-ligne immédiatement (le badge "En ligne" repose sur lastSeenAt).
      await userRepository.updateRaw(stored.userId, { lastSeenAt: null }).catch(() => {});
      forgetLastSeen(stored.userId);
    }
  },

  async register(input, actorId) {
    const existing = await userRepository.findByEmail(input.email.toLowerCase());
    if (existing) throw BadRequest('Email déjà utilisé');
    const hash = await bcrypt.hash(input.password, env.bcryptRounds);
    const user = await userRepository.create({
      email: input.email.toLowerCase(),
      password: hash,
      firstName: input.firstName,
      lastName: input.lastName,
      role: input.role || 'USER',
      agencyId: input.agencyId || null,
    });
    await auditRepository.log({ actorId, action: 'USER_CREATE', entity: 'User', entityId: user.id });
    return user;
  },

  async changePassword(userId, oldPwd, newPwd) {
    const user = await userRepository.findByIdWithSecret(userId);
    if (!user) throw Unauthorized();
    const ok = await bcrypt.compare(oldPwd, user.password);
    if (!ok) throw BadRequest('Ancien mot de passe incorrect');
    const hash = await bcrypt.hash(newPwd, env.bcryptRounds);
    await userRepository.updateRaw(userId, { password: hash });
  },
};
