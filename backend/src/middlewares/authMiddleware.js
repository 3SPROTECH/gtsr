import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { userRepository } from '../repositories/userRepository.js';
import { AppError } from '../utils/errors.js';
import { Unauthorized, Forbidden } from '../utils/errors.js';

// Throttle in-memory pour la mise à jour de lastSeenAt :
// au plus un UPDATE par utilisateur toutes les SEEN_THROTTLE_MS millisecondes.
// Évite un INSERT/UPDATE à chaque appel API tout en gardant une présence "fraîche".
const SEEN_THROTTLE_MS = 30_000;
const lastSeenCache = new Map(); // userId -> timestamp ms

function touchLastSeen(userId) {
  const now = Date.now();
  const prev = lastSeenCache.get(userId) || 0;
  if (now - prev < SEEN_THROTTLE_MS) return;
  lastSeenCache.set(userId, now);
  // fire-and-forget : ne bloque pas la requête, ignore les erreurs (table verrouillée, etc.)
  userRepository.updateRaw(userId, { lastSeenAt: new Date(now) }).catch(() => {
    lastSeenCache.delete(userId); // retry au prochain hit si l'écriture a échoué
  });
}

// Purge l'entrée de cache pour qu'une reconnexion immédiate ne soit pas étouffée par le throttle.
export function forgetLastSeen(userId) {
  lastSeenCache.delete(userId);
}

export async function authenticate(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw Unauthorized('Token manquant');

    let payload;
    try {
      payload = jwt.verify(token, env.jwt.secret);
    } catch (jwtErr) {
      // Tous les soucis JWT (expired, malformed, invalid signature) -> 401
      if (jwtErr.name === 'TokenExpiredError') throw Unauthorized('Token expiré');
      throw Unauthorized('Token invalide');
    }

    const user = await userRepository.findById(payload.sub);
    if (!user || !user.isActive) throw Unauthorized();
    req.user = user;
    touchLastSeen(user.id);
    next();
  } catch (e) {
    next(e instanceof AppError ? e : Unauthorized());
  }
}

export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(Unauthorized());
    if (!roles.includes(req.user.role)) return next(Forbidden());
    next();
  };
}
