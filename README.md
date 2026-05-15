# GTSR — Gestion de Tickets Support Technique à Distance

Plateforme helpdesk conforme au CDC-HELPDESK-2026-001.

## Architecture

### Backend — Clean Architecture (Layered)
```
backend/src/
├── config/         → Env, DB (Prisma), Mailer
├── domain/         → Entités, enums, règles métier pures
├── repositories/   → Couche d'accès aux données (Prisma)
├── services/       → Logique métier (orchestration)
├── controllers/    → Handlers HTTP (Express)
├── routes/         → Définition des routes
├── middlewares/    → Auth (JWT), RBAC, error handler, validation
├── validators/     → Schémas Zod
└── utils/          → Helpers (SLA, priorité, etc.)
```

### Frontend — Feature-based + Atomic Design
```
frontend/src/
├── api/            → Client Axios + endpoints
├── components/     → Composants UI réutilisables
├── features/       → Modules métier (auth, tickets, ...)
├── layouts/        → AppLayout, AuthLayout
├── pages/          → Pages routées
├── stores/         → Zustand (auth, ui)
├── hooks/          → Custom hooks
└── utils/          → Helpers
```

## Stack technique

| Couche | Technologie |
|---|---|
| Frontend | React 18 + Vite + TailwindCSS + React Router + Zustand + Axios + React Hook Form |
| Backend | Node.js + Express + Prisma ORM |
| BDD | PostgreSQL 15+ |
| Auth | JWT (access + refresh) + bcrypt |
| Validation | Zod (back) + React Hook Form (front) |
| Mails | Nodemailer (SMTP) |
| Sécurité | Helmet, CORS, rate-limit |

## Couverture du CDC

| Section CDC | Statut |
|---|---|
| 4. Périmètre fonctionnel (cœur) | OK |
| 5. Acteurs et rôles (RBAC 7 profils) | OK |
| 6. Gestion des tickets (CRUD + workflow) | OK |
| 7. Classification / Matrice priorité-grade | OK |
| 8. Workflow (10 statuts + escalade) | OK |
| 9. Notifications (email + in-app) | OK |
| 11. Tableaux de bord / KPI | OK |
| 12. API REST + Sécurité | OK |
| 13. Sécurité (JWT, bcrypt, RBAC, audit log) | OK |
| 14. SLA (calcul automatique) | OK |
| 10.1 Prise en main à distance | Stub (intégration TeamViewer/AnyDesk) |
| 12.5 SSO SAML/AD | Stub |
| App mobile native | Hors périmètre (PWA possible via web responsive) |
| Visioconférence | Stub |

## Installation rapide

### Prérequis
- Node.js >= 18
- PostgreSQL >= 14
- npm

### Backend
```bash
cd backend
cp .env.example .env       # éditer DATABASE_URL et JWT_SECRET
npm install
npx prisma migrate dev --name init
npm run seed               # crée admin + données démo
npm run dev                # http://localhost:4000
```

### Frontend
```bash
cd frontend
cp .env.example .env
npm install
npm run dev                # http://localhost:5173
```

### Compte initial (après seed)
Le seed crée uniquement le strict minimum : une agence par défaut « Siège » et un administrateur.

| Rôle | Email | Password |
|---|---|---|
| Administrateur | admin@gtsr.local | Admin@123 |

Tout le reste (utilisateurs, agences supplémentaires, catégories,
tickets) est à créer via l'interface.
