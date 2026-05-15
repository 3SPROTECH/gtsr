import { prisma } from '../config/db.js';
import { ticketRepository } from '../repositories/ticketRepository.js';
import { userRepository } from '../repositories/userRepository.js';
import { agencyRepository } from '../repositories/agencyRepository.js';
import { auditRepository } from '../repositories/auditRepository.js';
import { interventionReportRepository } from '../repositories/interventionReportRepository.js';
import { notificationService } from './notificationService.js';
import { computePriorityAndGrade } from '../domain/priorityMatrix.js';
import { computeDeadlines, isBreached } from '../domain/sla.js';
import { canTransition, allowedTransitions } from '../domain/ticketWorkflow.js';
import { generateTicketNumber } from '../domain/ticketNumber.js';
import { can } from '../domain/permissions.js';
import { BadRequest, Forbidden, NotFound } from '../utils/errors.js';

// Aucun ticket ne peut basculer en DONE sans rapport d'intervention déposé par le technicien.
async function requireInterventionReport(ticketId) {
  const report = await interventionReportRepository.findByTicketId(ticketId);
  if (!report) {
    throw BadRequest('Le technicien doit déposer son rapport d\'intervention avant la clôture du ticket.');
  }
}

export const ticketService = {

  // CDC §6 - création
  async create(input, actor) {
    if (!can(actor.role, 'ticket.create')) throw Forbidden();

    // Demandeur : par défaut = l'acteur (sauf si N1/admin crée pour autrui via phone)
    const requesterId = input.requesterId || actor.id;
    const requester = await userRepository.findById(requesterId);
    if (!requester) throw BadRequest('Demandeur introuvable');

    const agencyId = input.agencyId || requester.agencyId;
    if (!agencyId) throw BadRequest('Agence requise');

    const agency = await agencyRepository.findById(agencyId);
    if (!agency) throw BadRequest('Agence introuvable');

    // §7.3 - calcul auto priorité + grade
    const impact = input.impact || 'LOW';
    const urgency = input.urgency || 'MEDIUM';
    const { priority, grade } = computePriorityAndGrade(impact, urgency);

    // §14 - SLA
    const now = new Date();
    const { dueResponseAt, dueResolutionAt } = computeDeadlines(now, priority, agency);

    const number = await generateTicketNumber(now);

    const ticket = await ticketRepository.create({
      number,
      title: input.title,
      description: input.description,
      type: input.type || 'INCIDENT',
      channel: input.channel || 'WEB',
      impact, urgency, priority, grade,
      requesterId, agencyId,
      categoryId: input.categoryId || null,
      assigneeId: input.assigneeId || null,
      status: 'OPEN',
      dueResponseAt, dueResolutionAt,
    });

    await auditRepository.log({
      actorId: actor.id, action: 'TICKET_CREATE',
      entity: 'Ticket', entityId: ticket.id, metadata: { number },
    });

    // Notification - accusé de réception au demandeur
    await notificationService.notify({
      userId: requesterId,
      ticketId: ticket.id,
      email: requester.email,
      channels: ['IN_APP', 'EMAIL'],
      title: `Ticket ${number} créé`,
      body: `Votre demande "${input.title}" a été enregistrée (priorité ${priority}, grade ${grade}).`,
    });

    // Notifier tous les administrateurs (pour qu'ils puissent traiter / assigner)
    const admins = await userRepository.list({ role: 'ADMIN' });
    for (const admin of (admins.items ?? admins)) {
      await notificationService.notify({
        userId: admin.id, ticketId: ticket.id, email: admin.email,
        channels: ['IN_APP', 'EMAIL'],
        title: `Nouveau ticket ${number}`,
        body: `Nouvelle demande "${input.title}" (priorité ${priority}) à traiter ou assigner.`,
      });
    }

    return ticket;
  },

  // Vue selon profil (§5.1 / §13.2)
  buildWhere(actor, filters = {}) {
    const where = {};
    if (filters.status)     where.status     = filters.status;
    if (filters.priority)   where.priority   = filters.priority;
    if (filters.grade)      where.grade      = filters.grade;
    if (filters.categoryId) where.categoryId = filters.categoryId;
    if (filters.assigneeId) where.assigneeId = filters.assigneeId;
    if (filters.agencyId)   where.agencyId   = filters.agencyId;
    if (filters.q) {
      where.OR = [
        { title:       { contains: filters.q, mode: 'insensitive' } },
        { description: { contains: filters.q, mode: 'insensitive' } },
        { number:      { contains: filters.q, mode: 'insensitive' } },
      ];
    }
    if (filters.from || filters.to) {
      where.createdAt = {};
      if (filters.from) where.createdAt.gte = new Date(filters.from);
      if (filters.to)   where.createdAt.lte = new Date(filters.to);
    }
    // SLA à risque : échéance dans les 24h OU dépassée, et ticket encore ouvert
    if (filters.slaRisk === '1' || filters.slaRisk === true) {
      const horizon = new Date(Date.now() + 24 * 60 * 60 * 1000);
      where.status = where.status || { notIn: ['DONE', 'CANCELLED'] };
      where.dueResolutionAt = { lte: horizon };
    }

    // Cloisonnement par rôle
    switch (actor.role) {
      case 'USER':
        // Voit uniquement ses propres tickets
        where.requesterId = actor.id;
        break;
      case 'TECHNICIAN':
        // Voit uniquement les tickets que l'admin lui a assignés
        where.assigneeId = actor.id;
        break;
      // ADMIN : voit tout
    }
    return where;
  },

  // Mappe le paramètre `sort` envoyé par l'UI vers un orderBy Prisma.
  // Sécurité : whitelist stricte — toute valeur inconnue retombe sur le tri par défaut.
  buildOrderBy(sort) {
    switch (sort) {
      case 'createdAt_asc':   return { createdAt: 'asc' };
      case 'priority':        return [{ priority: 'desc' }, { createdAt: 'desc' }]; // CRITICAL en haut (enum order)
      case 'sla':             return [{ dueResolutionAt: 'asc' }, { createdAt: 'desc' }];
      case 'createdAt_desc':
      default:                return { createdAt: 'desc' };
    }
  },

  async list(actor, filters, paging, sort) {
    const where = this.buildWhere(actor, filters);
    const orderBy = this.buildOrderBy(sort);
    const [items, total] = await Promise.all([
      ticketRepository.list({ where, skip: paging.skip, take: paging.take, orderBy }),
      ticketRepository.count(where),
    ]);
    return { items, total };
  },

  async getById(id, actor) {
    const ticket = await ticketRepository.findById(id);
    if (!ticket) throw NotFound('Ticket introuvable');
    // Contrôle d'accès :
    //   USER       -> seulement ses propres tickets
    //   TECHNICIAN -> seulement les tickets que l'admin lui a assignés
    //   ADMIN      -> tout
    if (actor.role === 'USER' && ticket.requesterId !== actor.id) throw Forbidden();
    if (actor.role === 'TECHNICIAN' && ticket.assigneeId !== actor.id) throw Forbidden();
    return ticket;
  },

  // §6 update (réservé ADMIN ; USER peut éditer son propre ticket avant prise en charge)
  async update(id, patch, actor) {
    const ticket = await ticketRepository.findById(id);
    if (!ticket) throw NotFound();
    // USER : peut modifier son ticket tant qu'il n'a pas été démarré ; sinon ADMIN
    const isOwnerEditable = actor.role === 'USER' && ticket.requesterId === actor.id && ticket.status === 'OPEN';
    if (!isOwnerEditable && actor.role !== 'ADMIN') throw Forbidden();

    const updates = {};
    const history = [];

    const writable = ['title', 'description', 'categoryId', 'impact', 'urgency', 'priority', 'grade', 'type'];
    for (const f of writable) {
      if (patch[f] !== undefined && patch[f] !== ticket[f]) {
        updates[f] = patch[f];
        history.push({ field: f, oldValue: ticket[f], newValue: patch[f] });
      }
    }

    // recalcul automatique priorité/grade si impact ou urgence changent
    if (patch.impact || patch.urgency) {
      const impact = patch.impact ?? ticket.impact;
      const urgency = patch.urgency ?? ticket.urgency;
      const { priority, grade } = computePriorityAndGrade(impact, urgency);
      if (priority !== ticket.priority) {
        updates.priority = priority;
        history.push({ field: 'priority', oldValue: ticket.priority, newValue: priority });
      }
      if (grade !== ticket.grade) {
        updates.grade = grade;
        history.push({ field: 'grade', oldValue: ticket.grade, newValue: grade });
      }
      // recalcul deadlines si priorité change
      if (updates.priority) {
        const { dueResponseAt, dueResolutionAt } = computeDeadlines(ticket.createdAt, updates.priority, ticket.agency);
        updates.dueResponseAt = dueResponseAt;
        updates.dueResolutionAt = dueResolutionAt;
      }
    }

    const updated = await ticketRepository.update(id, updates);
    for (const h of history) {
      await ticketRepository.recordHistory(id, actor.id, h.field, h.oldValue, h.newValue);
    }
    await auditRepository.log({ actorId: actor.id, action: 'TICKET_UPDATE', entity: 'Ticket', entityId: id });
    return updated;
  },

  // §8 - changement de statut (réservé ADMIN)
  async changeStatus(id, newStatus, actor, opts = {}) {
    if (!can(actor.role, 'ticket.changeStatus')) throw Forbidden();
    const ticket = await ticketRepository.findById(id);
    if (!ticket) throw NotFound();
    if (!canTransition(ticket.status, newStatus)) {
      throw BadRequest(`Transition ${ticket.status} -> ${newStatus} interdite. Autorisées: ${allowedTransitions(ticket.status).join(', ') || 'aucune'}`);
    }

    const data = { status: newStatus };
    const now = new Date();

    if (newStatus === 'IN_PROGRESS' && !ticket.takenChargeAt) data.takenChargeAt = now;
    if (newStatus === 'DONE') {
      await requireInterventionReport(id);
      data.resolvedAt = now;
      data.closedAt = now;
      if (opts.resolutionNote) data.resolutionNote = opts.resolutionNote;
    }
    if (newStatus === 'CANCELLED') {
      data.closedAt = now;
    }
    if (newStatus === 'OPEN') {
      // réouverture
      data.resolvedAt = null;
      data.closedAt = null;
    }

    // marquage SLA breached éventuel
    if (isBreached(now, ticket.dueResponseAt) || isBreached(now, ticket.dueResolutionAt)) {
      data.slaBreached = true;
    }

    const updated = await ticketRepository.update(id, data);
    await ticketRepository.recordHistory(id, actor.id, 'status', ticket.status, newStatus);
    await auditRepository.log({
      actorId: actor.id, action: 'TICKET_STATUS', entity: 'Ticket', entityId: id,
      metadata: { from: ticket.status, to: newStatus },
    });

    // §9 Notifs
    if (ticket.requesterId) {
      const requester = await userRepository.findById(ticket.requesterId);
      await notificationService.notify({
        userId: requester.id, ticketId: id, email: requester.email,
        channels: ['IN_APP', 'EMAIL'],
        title: `Ticket ${ticket.number} : ${newStatus}`,
        body: `Le statut de votre ticket est passé à ${newStatus}.`,
      });
    }
    return updated;
  },

  // Assignation
  async assign(id, assigneeId, actor) {
    if (!can(actor.role, 'ticket.assign')) throw Forbidden();
    const ticket = await ticketRepository.findById(id);
    if (!ticket) throw NotFound();
    const assignee = await userRepository.findById(assigneeId);
    if (!assignee) throw BadRequest('Technicien introuvable');

    // L'assignation passe automatiquement le ticket en IN_PROGRESS s'il était OPEN,
    // et réinitialise toute déclaration précédente du technicien.
    const data = { assigneeId, techResolution: null, techResolutionNote: null, techResolvedAt: null };
    if (ticket.status === 'OPEN') {
      data.status = 'IN_PROGRESS';
      if (!ticket.takenChargeAt) data.takenChargeAt = new Date();
    }
    const updated = await ticketRepository.update(id, data);
    await ticketRepository.recordHistory(id, actor.id, 'assigneeId', ticket.assigneeId, assigneeId);
    await auditRepository.log({ actorId: actor.id, action: 'TICKET_ASSIGN', entity: 'Ticket', entityId: id });

    await notificationService.notify({
      userId: assignee.id, ticketId: id, email: assignee.email,
      channels: ['IN_APP', 'EMAIL'],
      title: `Ticket ${ticket.number} assigné`,
      body: `Le ticket "${ticket.title}" vous est assigné.`,
    });
    return updated;
  },

  // §8.3 Escalade
  async escalate(id, toLevel, reason, actor, isAuto = false) {
    if (!can(actor.role, 'ticket.escalate')) throw Forbidden();
    if (!reason || reason.trim().length < 3) throw BadRequest('Justification obligatoire');
    const ticket = await ticketRepository.findById(id);
    if (!ticket) throw NotFound();

    await ticketRepository.createEscalation({
      ticketId: id, fromUserId: actor.id, fromLevel: actor.role,
      toLevel, reason, isAuto,
    });

    // L'escalade ne change pas le statut (on reste IN_PROGRESS) ; on garde juste la trace
    const updated = ticket;
    await ticketRepository.recordHistory(id, actor.id, 'escalation', actor.role, toLevel);

    // §8.3 - notifier les ADMIN si escalade vers ADMIN
    if (toLevel === 'ADMIN') {
      const admins = await userRepository.list({ role: 'ADMIN' });
      for (const s of admins) {
        await notificationService.notify({
          userId: s.id, ticketId: id, email: s.email,
          channels: ['IN_APP', 'EMAIL'],
          title: `Escalade ${ticket.number} → ADMIN`,
          body: `Ticket escaladé : ${reason}`,
        });
      }
    }
    return updated;
  },

  // Commentaires
  async addComment(id, body, isInternal, actor) {
    const ticket = await ticketRepository.findById(id);
    if (!ticket) throw NotFound();
    if (actor.role === 'USER' && ticket.requesterId !== actor.id) throw Forbidden();
    if (isInternal && actor.role === 'USER') throw Forbidden();

    const comment = await ticketRepository.addComment(id, actor.id, body, !!isInternal);

    // Notifier l'autre partie (§9)
    const targets = new Set();
    if (actor.id !== ticket.requesterId) targets.add(ticket.requesterId);
    if (ticket.assigneeId && actor.id !== ticket.assigneeId) targets.add(ticket.assigneeId);

    for (const userId of targets) {
      const u = await userRepository.findById(userId);
      if (u) {
        if (isInternal && u.id === ticket.requesterId) continue;
        await notificationService.notify({
          userId: u.id, ticketId: id, email: u.email,
          channels: ['IN_APP'],
          title: `Nouveau commentaire sur ${ticket.number}`,
          body: body.slice(0, 200),
        });
      }
    }
    return comment;
  },

  // §8.2 (10) Satisfaction
  async submitSatisfaction(id, rating, comment, actor) {
    const ticket = await ticketRepository.findById(id);
    if (!ticket) throw NotFound();
    if (ticket.requesterId !== actor.id) throw Forbidden();
    if (ticket.status !== 'DONE') throw BadRequest('Le ticket doit être terminé pour être évalué');
    if (rating < 1 || rating > 5) throw BadRequest('Note 1..5');
    if (ticket.satisfaction) throw BadRequest('Déjà noté');

    return prisma.satisfactionSurvey.create({
      data: { ticketId: id, userId: actor.id, rating, comment },
    });
  },

  // L'utilisateur (créateur) marque son ticket comme résolu => statut DONE
  async userMarkResolved(id, note, actor) {
    if (!can(actor.role, 'ticket.markResolved')) throw Forbidden();
    const ticket = await ticketRepository.findById(id);
    if (!ticket) throw NotFound();
    if (ticket.requesterId !== actor.id) throw Forbidden('Vous n\'êtes pas le demandeur de ce ticket');
    if (!['IN_PROGRESS', 'OPEN'].includes(ticket.status)) {
      throw BadRequest('Vous pouvez confirmer la résolution uniquement pour un ticket en cours.');
    }

    await requireInterventionReport(id);

    const now = new Date();
    const updated = await ticketRepository.update(id, {
      status: 'DONE',
      resolvedAt: now,
      closedAt: now,
      resolutionNote: note || null,
    });

    await ticketRepository.recordHistory(id, actor.id, 'status', ticket.status, 'DONE');
    await auditRepository.log({ actorId: actor.id, action: 'TICKET_USER_RESOLVED', entity: 'Ticket', entityId: id });

    // Notifier le tech assigné + admin
    if (ticket.assigneeId) {
      const tech = await userRepository.findById(ticket.assigneeId);
      if (tech) await notificationService.notify({
        userId: tech.id, ticketId: id, email: tech.email, channels: ['IN_APP', 'EMAIL'],
        title: `Ticket ${ticket.number} - clôturé par l'utilisateur`,
        body: `${actor.firstName} ${actor.lastName} a marqué le ticket "${ticket.title}" comme résolu.`,
      });
    }
    const admins = await userRepository.list({ role: 'ADMIN' });
    for (const a of (admins.items ?? admins)) {
      await notificationService.notify({
        userId: a.id, ticketId: id, email: a.email, channels: ['IN_APP'],
        title: `Ticket ${ticket.number} clôturé`,
        body: `Le demandeur a confirmé la résolution.`,
      });
    }
    return updated;
  },

  // Technicien assigné déclare 'RESOLVED' ou 'NOT_RESOLVED'.
  // Si RESOLVED : le ticket reste IN_PROGRESS, en attente de confirmation du demandeur.
  // Si NOT_RESOLVED : trace + notif admin pour réaffectation.
  async techDeclare(id, resolution, note, actor) {
    if (!can(actor.role, 'ticket.techDeclare')) throw Forbidden();
    if (!['RESOLVED', 'NOT_RESOLVED'].includes(resolution)) throw BadRequest('Résolution invalide');
    const ticket = await ticketRepository.findById(id);
    if (!ticket) throw NotFound();
    if (actor.role === 'TECHNICIAN' && ticket.assigneeId !== actor.id) throw Forbidden('Ticket non assigné à vous');
    if (ticket.status !== 'IN_PROGRESS') throw BadRequest('Déclaration possible uniquement quand le ticket est en cours.');

    const now = new Date();
    const updated = await ticketRepository.update(id, {
      techResolution: resolution,
      techResolutionNote: note || null,
      techResolvedAt: now,
      // Si le tech avait déjà déclaré et que le user avait rejeté, on repart d'une page blanche côté user
      userConfirmation: null,
      userConfirmationNote: null,
      userConfirmedAt: null,
    });

    await ticketRepository.recordHistory(id, actor.id, 'techResolution', ticket.techResolution || null, resolution);
    await auditRepository.log({
      actorId: actor.id, action: 'TICKET_TECH_DECLARE', entity: 'Ticket', entityId: id,
      metadata: { resolution, note: note || null },
    });

    if (resolution === 'RESOLVED') {
      // Notifier le demandeur pour qu'il confirme
      const requester = await userRepository.findById(ticket.requesterId);
      if (requester) await notificationService.notify({
        userId: requester.id, ticketId: id, email: requester.email,
        channels: ['IN_APP', 'EMAIL'],
        title: `Ticket ${ticket.number} : le technicien indique que c'est résolu`,
        body: `${actor.firstName} ${actor.lastName} indique avoir résolu le problème. Merci de confirmer ou de signaler si le problème persiste.`,
      });
    } else {
      // NOT_RESOLVED : notifier admins pour reprise
      const admins = await userRepository.list({ role: 'ADMIN' });
      for (const a of (admins.items ?? admins)) {
        await notificationService.notify({
          userId: a.id, ticketId: id, email: a.email, channels: ['IN_APP', 'EMAIL'],
          title: `Ticket ${ticket.number} déclaré non résolu`,
          body: `${actor.firstName} ${actor.lastName} signale ne pas pouvoir résoudre. ${note ? `Note : ${note.slice(0, 200)}` : ''}`,
        });
      }
    }
    return updated;
  },

  // USER (demandeur) confirme ou rejette la déclaration RESOLVED du technicien.
  async userConfirm(id, confirmation, note, actor) {
    if (!can(actor.role, 'ticket.userConfirm')) throw Forbidden();
    if (!['CONFIRMED', 'REJECTED'].includes(confirmation)) throw BadRequest('Confirmation invalide');
    const ticket = await ticketRepository.findById(id);
    if (!ticket) throw NotFound();
    if (ticket.requesterId !== actor.id) throw Forbidden();
    if (ticket.status !== 'IN_PROGRESS') throw BadRequest('Confirmation possible uniquement quand le ticket est en cours.');
    if (ticket.techResolution !== 'RESOLVED') throw BadRequest('Le technicien n\'a pas encore déclaré la résolution.');
    if (confirmation === 'REJECTED' && (!note || note.trim().length < 3)) {
      throw BadRequest('Justification requise pour signaler que le problème persiste (min 3 caractères).');
    }

    if (confirmation === 'CONFIRMED') {
      await requireInterventionReport(id);
    }

    const now = new Date();
    const data = {
      userConfirmation: confirmation,
      userConfirmationNote: note || null,
      userConfirmedAt: now,
    };
    if (confirmation === 'CONFIRMED') {
      data.status = 'DONE';
      data.resolvedAt = now;
      data.closedAt = now;
      data.resolutionNote = ticket.techResolutionNote || note || null;
    } else {
      // REJECTED : on remet le tech au travail, on efface sa déclaration précédente
      data.techResolution = null;
      data.techResolutionNote = null;
      data.techResolvedAt = null;
    }

    const updated = await ticketRepository.update(id, data);
    await ticketRepository.recordHistory(id, actor.id, 'userConfirmation', ticket.userConfirmation || null, confirmation);
    if (data.status) await ticketRepository.recordHistory(id, actor.id, 'status', ticket.status, 'DONE');
    await auditRepository.log({
      actorId: actor.id, action: 'TICKET_USER_CONFIRM', entity: 'Ticket', entityId: id,
      metadata: { confirmation, note: note || null },
    });
    // Traçabilité : ajouter la justification de rejet comme commentaire visible
    if (confirmation === 'REJECTED') {
      await ticketRepository.addComment(id, actor.id, `Problème persistant — ${note}`, false);
    }

    // Notifier le tech assigné + admins
    const targets = new Set();
    if (ticket.assigneeId) targets.add(ticket.assigneeId);
    const admins = await userRepository.list({ role: 'ADMIN' });
    for (const a of (admins.items ?? admins)) targets.add(a.id);

    for (const userId of targets) {
      const u = await userRepository.findById(userId);
      if (!u) continue;
      await notificationService.notify({
        userId: u.id, ticketId: id, email: u.email, channels: ['IN_APP', 'EMAIL'],
        title: confirmation === 'CONFIRMED'
          ? `Ticket ${ticket.number} confirmé résolu`
          : `Ticket ${ticket.number} : le problème persiste`,
        body: confirmation === 'CONFIRMED'
          ? `${actor.firstName} ${actor.lastName} a confirmé la résolution.`
          : `${actor.firstName} ${actor.lastName} signale que le problème persiste. ${note ? `Note : ${note.slice(0, 200)}` : ''}`,
      });
    }
    return updated;
  },

  // USER (demandeur) rouvre un ticket terminé en justifiant ; ADMIN peut aussi rouvrir.
  async reopen(id, reason, actor) {
    if (!can(actor.role, 'ticket.reopen')) throw Forbidden();
    if (!reason || reason.trim().length < 3) throw BadRequest('Justification requise (min 3 caractères)');
    const ticket = await ticketRepository.findById(id);
    if (!ticket) throw NotFound();
    if (actor.role === 'USER' && ticket.requesterId !== actor.id) throw Forbidden();
    if (ticket.status !== 'DONE') throw BadRequest('Seul un ticket terminé peut être rouvert.');

    const updated = await ticketRepository.update(id, {
      status: 'OPEN',
      resolvedAt: null,
      closedAt: null,
      // Reset déclarations tech + confirmations user pour repartir propre
      techResolution: null,
      techResolutionNote: null,
      techResolvedAt: null,
      userConfirmation: null,
      userConfirmationNote: null,
      userConfirmedAt: null,
    });

    await ticketRepository.recordHistory(id, actor.id, 'status', 'DONE', 'OPEN');
    // Justification gardée comme commentaire pour traçabilité
    await ticketRepository.addComment(id, actor.id, `Ticket rouvert — ${reason}`, false);
    await auditRepository.log({
      actorId: actor.id, action: 'TICKET_REOPEN', entity: 'Ticket', entityId: id,
      metadata: { reason },
    });

    // Notifier tech assigné + admins
    const targets = new Set();
    if (ticket.assigneeId) targets.add(ticket.assigneeId);
    const admins = await userRepository.list({ role: 'ADMIN' });
    for (const a of (admins.items ?? admins)) targets.add(a.id);

    for (const userId of targets) {
      const u = await userRepository.findById(userId);
      if (u) await notificationService.notify({
        userId: u.id, ticketId: id, email: u.email, channels: ['IN_APP', 'EMAIL'],
        title: `Ticket ${ticket.number} rouvert`,
        body: `${actor.firstName} ${actor.lastName} a rouvert le ticket : ${reason.slice(0, 200)}`,
      });
    }

    return updated;
  },

  // USER (demandeur) annule son ticket avant prise en charge ; ADMIN peut aussi annuler.
  async cancel(id, reason, actor) {
    if (!can(actor.role, 'ticket.cancel')) throw Forbidden();
    const ticket = await ticketRepository.findById(id);
    if (!ticket) throw NotFound();
    if (actor.role === 'USER') {
      if (ticket.requesterId !== actor.id) throw Forbidden();
      if (ticket.status !== 'OPEN') throw BadRequest('Vous pouvez annuler uniquement avant la prise en charge.');
    } else if (!['OPEN', 'IN_PROGRESS'].includes(ticket.status)) {
      throw BadRequest('Ce ticket ne peut plus être annulé.');
    }

    const now = new Date();
    const updated = await ticketRepository.update(id, {
      status: 'CANCELLED',
      closedAt: now,
      resolutionNote: reason || null,
    });

    await ticketRepository.recordHistory(id, actor.id, 'status', ticket.status, 'CANCELLED');
    await auditRepository.log({
      actorId: actor.id, action: 'TICKET_CANCEL', entity: 'Ticket', entityId: id,
      metadata: { reason: reason || null },
    });

    // Notifier les admins (et tech si déjà assigné)
    const targets = new Set();
    if (ticket.assigneeId && ticket.assigneeId !== actor.id) targets.add(ticket.assigneeId);
    const admins = await userRepository.list({ role: 'ADMIN' });
    for (const a of (admins.items ?? admins)) if (a.id !== actor.id) targets.add(a.id);

    for (const userId of targets) {
      const u = await userRepository.findById(userId);
      if (u) await notificationService.notify({
        userId: u.id, ticketId: id, email: u.email, channels: ['IN_APP'],
        title: `Ticket ${ticket.number} annulé`,
        body: `${actor.firstName} ${actor.lastName} a annulé le ticket "${ticket.title}".${reason ? ` Raison : ${reason.slice(0, 200)}` : ''}`,
      });
    }

    return updated;
  },

  async remove(id, actor) {
    const ticket = await ticketRepository.findById(id);
    if (!ticket) throw NotFound();
    // ADMIN peut tout supprimer ; USER peut supprimer son propre ticket si encore OPEN
    const isOwnerEditable = actor.role === 'USER' && ticket.requesterId === actor.id && ticket.status === 'OPEN';
    if (actor.role !== 'ADMIN' && !isOwnerEditable) {
      throw Forbidden('Vous pouvez supprimer votre ticket uniquement tant qu\'il n\'a pas été démarré');
    }
    await prisma.ticket.delete({ where: { id } });
    await auditRepository.log({
      actorId: actor.id, action: 'TICKET_DELETE', entity: 'Ticket', entityId: id,
      metadata: { number: ticket.number },
    });
  },

  allowedTransitions: (status) => allowedTransitions(status),
};
