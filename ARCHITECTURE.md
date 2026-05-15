# Architecture & Design Patterns — GTSR

## 1. Vue d'ensemble

```
┌─────────────────────────────┐       HTTP/JSON       ┌─────────────────────────────┐
│   FRONTEND  (React + Vite)  │  ◄─────────────────►  │   BACKEND  (Node + Express) │
│   Feature-based + Atomic    │       /api/*          │   Clean Layered Architecture│
└─────────────────────────────┘                       └──────────────┬──────────────┘
                                                                     │ Prisma ORM
                                                                     ▼
                                                            ┌────────────────┐
                                                            │  PostgreSQL    │
                                                            └────────────────┘
```

## 2. Backend — Clean Architecture (Layered)

Inspiré de **Hexagonal Architecture / Onion Architecture**.
Chaque couche dépend uniquement des couches **inférieures**, jamais l'inverse.

```
┌─────────────────────────────────────────────────────────────┐
│  routes/ ─────────► Express Router (HTTP endpoints)         │  ← Transport
├─────────────────────────────────────────────────────────────┤
│  controllers/ ────► HTTP handlers (req/res, status codes)   │  ← Interface
├─────────────────────────────────────────────────────────────┤
│  middlewares/ ────► auth (JWT), validate (Zod), errors      │  ← Cross-cutting
├─────────────────────────────────────────────────────────────┤
│  services/ ───────► Logique métier (orchestration)          │  ← Application
├─────────────────────────────────────────────────────────────┤
│  domain/ ─────────► Règles pures (SLA, matrice, workflow)   │  ← Domain
├─────────────────────────────────────────────────────────────┤
│  repositories/ ───► Accès données (Prisma queries)          │  ← Infrastructure
├─────────────────────────────────────────────────────────────┤
│  config/ ─────────► DB, env, mailer (adapters)              │  ← Infrastructure
└─────────────────────────────────────────────────────────────┘
```

### Patterns appliqués

| Pattern | Emplacement | Rôle |
|---|---|---|
| **Repository** | `repositories/*.js` | Isole les requêtes Prisma. Les services ne connaissent pas l'ORM. |
| **Service / Application** | `services/*.js` | Orchestration des cas d'usage (créer ticket, escalader, etc.). |
| **Domain Model** | `domain/*.js` | Règles métier pures testables sans DB : `priorityMatrix`, `sla`, `workflow`, `permissions`. |
| **DTO / Validator** | `validators/schemas.js` | Schémas Zod, garde-fou des entrées HTTP. |
| **Middleware (Chain of Responsibility)** | `middlewares/*` | Auth, validation, error handling. |
| **RBAC** | `domain/permissions.js` | Table action → rôles autorisés. |
| **Factory** | `app.js` (`createApp`) | Construit l'app Express, injectable en tests. |
| **Singleton** | `config/db.js` (PrismaClient) | Une seule instance Prisma. |

### Flux d'une requête type (`POST /api/tickets`)

```
Client
  │ HTTP POST /api/tickets { title, impact, urgency, ... }
  ▼
[routes/ticketRoutes.js]            authenticate → validate(createTicketSchema)
  ▼
[controllers/ticketController.create]
  ▼
[services/ticketService.create]
  │   ├─ domain/permissions.can('ticket.create', role)
  │   ├─ domain/priorityMatrix.computePriorityAndGrade(impact, urgency)
  │   ├─ domain/sla.computeDeadlines(now, priority, agency)
  │   ├─ domain/ticketNumber.generateTicketNumber()
  │   ├─ repositories/ticketRepository.create(...)
  │   ├─ repositories/auditRepository.log(...)
  │   └─ services/notificationService.notify(...)
  ▼
HTTP 201 { id, number, ... }
```

## 3. Frontend — Feature-Based + Atomic Composition

```
src/
├── api/            ← couche transport (Axios + intercepteurs JWT)
│   ├── client.js       Axios instance + refresh-token automatique
│   └── endpoints.js    Surfaces API typées (authApi, ticketsApi, ...)
│
├── stores/         ← état global (Zustand)
│   ├── authStore.js    session + persist localStorage
│   └── uiStore.js      sidebar, toasts
│
├── components/     ← UI atomiques réutilisables (Badge, Modal, Spinner, Toast)
├── layouts/        ← layouts haut niveau (AppLayout, ProtectedRoute)
├── features/       ← modules métier (auth, tickets, admin, dashboard, notifications)
├── utils/          ← format, enums (labels FR + couleurs)
└── App.jsx         ← React Router (routes protégées par rôle)
```

### Patterns frontend

| Pattern | Emplacement | Rôle |
|---|---|---|
| **Container/Presentational** implicite | features/*Page.jsx | Pages gèrent l'état, sous-composants présentent. |
| **Custom hooks** (extensible) | hooks/ | À utiliser pour mutualiser la logique d'écran. |
| **Store + Selector** | Zustand | État partagé immutable, persistance opt-in. |
| **HOC-like guard** | `ProtectedRoute`, `RoleGate` | Cloisonnement par rôle. |
| **Interceptor** | `api/client.js` | Refresh JWT transparent en cas de 401. |

## 4. Base de données (Prisma)

Modèles principaux : `User`, `Agency`, `Category`, `Ticket`, `Comment`,
`Attachment`, `TicketEscalation`, `TicketHistory`,
`Notification`, `SatisfactionSurvey`, `AuditLog`, `RefreshToken`, `TicketCounter`.

Énumérations alignées sur le CDC §6/§7/§8 :
`Role`, `TicketStatus`, `TicketType`, `Priority`, `Grade`, `Impact`, `Urgency`,
`CreationChannel`, `NotificationChannel`.

## 5. Sécurité (CDC §13)

- Authentification JWT (access 15 min + refresh 7 j stocké en DB révocable)
- `bcrypt` (rounds configurables), verrouillage compte après 5 échecs
- RBAC strict (`domain/permissions.js`)
- Validation Zod systématique sur les entrées
- `helmet`, `cors` whitelist, `express-rate-limit`
- Journal d'audit (`AuditLog`) sur toutes les actions sensibles
- Cloisonnement par agence côté `ticketService.buildWhere`

## 6. Conformité au cahier des charges

| CDC | Couverture |
|---|---|
| §5 - Acteurs/Rôles (7) | `Role` + RBAC complet |
| §6 - Champs ticket | Modèle `Ticket` + `Attachment` |
| §6.2 - Modes création | Champ `channel` (WEB/MOBILE/EMAIL/PHONE/CHATBOT/API) |
| §6.3 - Catégories hiérarchiques | Modèle `Category` self-référencé |
| §7.1 - Priorités | Enum `Priority` + delais SLA |
| §7.2 - Grades G1..G5 | Enum `Grade` + `targetRoleForGrade` |
| §7.3 - Matrice priorité/grade | `domain/priorityMatrix.js` |
| §8.1 - 10 statuts | Enum `TicketStatus` |
| §8.2 - Cycle de vie | `domain/ticketWorkflow.js` |
| §8.3 - Règles d'escalade | `TicketEscalation` + `ticketService.escalate` |
| §9 - Notifications | `Notification` + `notificationService` (in-app + email) |
| §10.2 - Chat | `Comment` (avec mode `isInternal`) |
| §11 - Dashboards/KPI | `reportService` + `DashboardPage` |
| §13.1 - Auth | JWT + bcrypt + verrouillage + MFA flag |
| §13.4 - Audit | `AuditLog` |
| §14.1/§14.2 - SLA en heures ouvrées | `domain/sla.js` |

## 7. Points d'extension (stubs documentés)

- **§10.1 Prise en main à distance** : ajouter `RemoteSession` model + adapter TeamViewer/AnyDesk
- **§10.3 Visio** : URL embed Teams/Zoom/Jitsi
- **§10.5 Scripts à distance** : `ScriptLibrary` + worker Bash/PowerShell
- **§12.5 / §13.1 SSO SAML / Azure AD** : remplacer `authService.login` par strategy SAML
- **§13.1 MFA** : ajouter TOTP (speakeasy)
- **App mobile** : la SPA est déjà responsive, PWA possible (ajouter `vite-plugin-pwa`)
