export class AppError extends Error {
  constructor(message, status = 400, code = 'BAD_REQUEST') {
    super(message);
    this.status = status;
    this.code = code;
  }
}
export const BadRequest   = (m) => new AppError(m, 400, 'BAD_REQUEST');
export const Unauthorized = (m = 'Authentification requise') => new AppError(m, 401, 'UNAUTHORIZED');
export const Forbidden    = (m = 'Accès interdit')           => new AppError(m, 403, 'FORBIDDEN');
export const NotFound     = (m = 'Ressource introuvable')    => new AppError(m, 404, 'NOT_FOUND');
export const Conflict     = (m)                              => new AppError(m, 409, 'CONFLICT');
