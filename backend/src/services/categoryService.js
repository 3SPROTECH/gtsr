import { categoryRepository } from '../repositories/categoryRepository.js';
import { auditRepository } from '../repositories/auditRepository.js';
import { can } from '../domain/permissions.js';
import { Forbidden } from '../utils/errors.js';

export const categoryService = {
  list: () => categoryRepository.list(),
  async create(data, actor) {
    if (!can(actor.role, 'category.manage')) throw Forbidden();
    const c = await categoryRepository.create(data);
    await auditRepository.log({ actorId: actor.id, action: 'CATEGORY_CREATE', entity: 'Category', entityId: c.id });
    return c;
  },
  async update(id, data, actor) {
    if (!can(actor.role, 'category.manage')) throw Forbidden();
    return categoryRepository.update(id, data);
  },
  async remove(id, actor) {
    if (!can(actor.role, 'category.manage')) throw Forbidden();
    return categoryRepository.remove(id);
  },
};
