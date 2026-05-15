import { z } from 'zod';

// --- Auth ---
export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const passwordSchema = z.string()
  .min(8, 'Min 8 caractères')
  .regex(/[A-Z]/, 'Doit contenir une majuscule')
  .regex(/[a-z]/, 'Doit contenir une minuscule')
  .regex(/[0-9]/, 'Doit contenir un chiffre');

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1),
  newPassword: passwordSchema,
});

export const updateAvailabilitySchema = z.object({
  availability: z.enum(['AVAILABLE', 'BUSY', 'AWAY']),
});

// --- User ---
export const RoleEnum = z.enum(['USER', 'TECHNICIAN', 'ADMIN']);

export const createUserSchema = z.object({
  email: z.string().email(),
  password: passwordSchema,
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  role: RoleEnum.optional(),
  agencyId: z.string().optional().nullable(),
});

export const updateUserSchema = z.object({
  firstName: z.string().min(1).max(80).optional(),
  lastName:  z.string().min(1).max(80).optional(),
  role: RoleEnum.optional(),
  agencyId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
  password: passwordSchema.optional(),
});

// --- Agency ---
export const agencySchema = z.object({
  code: z.string().min(2).max(20),
  name: z.string().min(2).max(120),
  address: z.string().max(200).optional().nullable(),
  timezone: z.string().optional(),
  openingHourStart: z.number().int().min(0).max(23).optional(),
  openingHourEnd:   z.number().int().min(1).max(24).optional(),
  workingDays: z.string().regex(/^[1-7](,[1-7])*$/).optional(),
  managerId: z.string().nullable().optional(),
});

// --- Category ---
export const categorySchema = z.object({
  name: z.string().min(2).max(80),
  parentId: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

// --- Ticket ---
export const TicketTypeEnum = z.enum(['INCIDENT', 'REQUEST', 'QUESTION', 'EVOLUTION']);
export const ImpactEnum     = z.enum(['LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH']);
export const UrgencyEnum    = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
export const PriorityEnum   = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
export const GradeEnum      = z.enum(['G1', 'G2', 'G3', 'G4', 'G5']);
export const StatusEnum     = z.enum(['OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED']);

export const createTicketSchema = z.object({
  title: z.string().min(3).max(200),
  description: z.string().min(3),
  type: TicketTypeEnum.optional(),
  impact: ImpactEnum.optional(),
  urgency: UrgencyEnum.optional(),
  categoryId: z.string().nullable().optional(),
  channel: z.enum(['WEB', 'MOBILE', 'EMAIL', 'PHONE', 'CHATBOT', 'API']).optional(),
  requesterId: z.string().optional(),
  agencyId: z.string().optional(),
  assigneeId: z.string().optional(),
});

export const updateTicketSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  description: z.string().min(3).optional(),
  type: TicketTypeEnum.optional(),
  impact: ImpactEnum.optional(),
  urgency: UrgencyEnum.optional(),
  priority: PriorityEnum.optional(),
  grade: GradeEnum.optional(),
  categoryId: z.string().nullable().optional(),
});

export const statusChangeSchema = z.object({
  status: StatusEnum,
  resolutionNote: z.string().optional(),
});

export const assignSchema = z.object({
  assigneeId: z.string().min(1),
});

export const escalateSchema = z.object({
  toLevel: z.enum(['TECHNICIAN', 'ADMIN']),
  reason: z.string().min(3),
});

export const declareResolutionSchema = z.object({
  resolution: z.enum(['RESOLVED', 'NOT_RESOLVED']),
  note: z.string().optional().nullable(),
});

export const userConfirmSchema = z.object({
  confirmation: z.enum(['CONFIRMED', 'REJECTED']),
  note: z.string().optional().nullable(),
}).refine((d) => d.confirmation !== 'REJECTED' || (d.note && d.note.trim().length >= 3), {
  message: 'Une justification est requise pour signaler que le problème persiste (min 3 caractères).',
  path: ['note'],
});

export const reopenSchema = z.object({
  reason: z.string().min(3, 'Justification requise (min 3 caractères)'),
});

export const cancelSchema = z.object({
  reason: z.string().min(3, 'Raison requise (min 3 caractères)').optional().nullable(),
});

export const commentSchema = z.object({
  body: z.string().min(1),
  isInternal: z.boolean().optional(),
});

export const satisfactionSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().optional(),
});

// --- Rapport d'intervention ---
export const interventionReportSchema = z.object({
  description: z.string().min(3, 'Description requise (min 3 caractères)'),
});

// --- Pagination ---
export const pagingSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
}).passthrough();
