// CDC §6.1 - Format TKT-AAAAMM-NNNNN (compteur mensuel séquentiel)

import { prisma } from '../config/db.js';

export async function generateTicketNumber(date = new Date()) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const id = `${yyyy}${mm}`;

  // upsert atomique du compteur via transaction
  return prisma.$transaction(async (tx) => {
    const counter = await tx.ticketCounter.upsert({
      where: { id },
      update: { current: { increment: 1 } },
      create: { id, current: 1 },
    });
    const seq = String(counter.current).padStart(5, '0');
    return `TKT-${id}-${seq}`;
  });
}
