// Seed minimal et idempotent - aucune donnée existante n'est supprimée.
//   - 1 agence "Siège" (créée si absente)
//   - 1 administrateur (créé si absent)
//   - 6 catégories fixes (créées si absentes)
//
// Tout autre élément (utilisateurs, tickets) reste à créer via l'interface.

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const FIXED_CATEGORIES = [
  'Matériel (Hardware)',
  'Logiciel (Software)',
  'Réseau et Connectivité',
  'Messagerie et Collaboration',
  'Compte et Accès',
  'Sécurité',
];

async function main() {
  console.log('🌱 Seeding (idempotent)…');

  // --- Agence par défaut ---
  const agency = await prisma.agency.upsert({
    where: { code: 'HQ' },
    update: {},
    create: {
      code: 'HQ',
      name: 'Siège',
      address: '',
      timezone: 'Europe/Paris',
      openingHourStart: 8,
      openingHourEnd: 18,
      workingDays: '1,2,3,4,5',
    },
  });

  // --- Admin par défaut ---
  const adminPwd = await bcrypt.hash('Admin@123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@gtsr.local' },
    update: {},
    create: {
      email: 'admin@gtsr.local',
      password: adminPwd,
      firstName: 'Admin',
      lastName: 'GTSR',
      role: 'ADMIN',
      agencyId: agency.id,
    },
  });

  // --- Catégories fixes (créées si absentes) ---
  let createdCats = 0;
  for (const name of FIXED_CATEGORIES) {
    const exists = await prisma.category.findFirst({ where: { name, parentId: null } });
    if (!exists) {
      await prisma.category.create({ data: { name } });
      createdCats++;
    }
  }

  console.log(`✅ Seed terminé.  Catégories fixes ajoutées : ${createdCats} / ${FIXED_CATEGORIES.length}`);
  console.log('');
  console.log('Connexion initiale :');
  console.log('  Email    : admin@gtsr.local');
  console.log('  Password : Admin@123');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
