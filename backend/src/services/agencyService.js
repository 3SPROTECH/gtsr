import { agencyRepository } from '../repositories/agencyRepository.js';
import { auditRepository } from '../repositories/auditRepository.js';
import { can } from '../domain/permissions.js';
import { Forbidden, NotFound } from '../utils/errors.js';

export const agencyService = {
  list: () => agencyRepository.list(),
  getById: async (id) => {
    const a = await agencyRepository.findById(id);
    if (!a) throw NotFound();
    return a;
  },
  async create(data, actor) {
    if (!can(actor.role, 'agency.manage')) throw Forbidden();
    const a = await agencyRepository.create(data);
    await auditRepository.log({ actorId: actor.id, action: 'AGENCY_CREATE', entity: 'Agency', entityId: a.id });
    return a;
  },
  async update(id, data, actor) {
    if (!can(actor.role, 'agency.manage')) throw Forbidden();
    const a = await agencyRepository.update(id, data);
    await auditRepository.log({ actorId: actor.id, action: 'AGENCY_UPDATE', entity: 'Agency', entityId: id });
    return a;
  },
  async remove(id, actor) {
    if (!can(actor.role, 'agency.manage')) throw Forbidden();
    await agencyRepository.remove(id);
    await auditRepository.log({ actorId: actor.id, action: 'AGENCY_DELETE', entity: 'Agency', entityId: id });
  },
};
