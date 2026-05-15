import { ZodError } from 'zod';
import { AppError } from '../utils/errors.js';

export function notFoundHandler(_req, res) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route inconnue' } });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Données invalides', details: err.errors },
    });
  }
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message } });
  }

  // Log COMPLET en console + détails renvoyés au client en mode dev
  const isDev = process.env.NODE_ENV !== 'production';
  console.error('\n[UNHANDLED ERROR]', req.method, req.originalUrl);
  console.error('  name :', err.name);
  console.error('  msg  :', err.message);
  if (err.code)       console.error('  code :', err.code);
  if (err.meta)       console.error('  meta :', err.meta);
  if (err.stack)      console.error(err.stack.split('\n').slice(0, 6).join('\n'));

  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: isDev ? (err.message || 'Erreur interne') : 'Erreur interne',
      ...(isDev && err.name && { name: err.name }),
      ...(isDev && err.code && { prismaCode: err.code }),
    },
  });
}
