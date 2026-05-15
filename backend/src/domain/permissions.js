// RBAC - 3 rôles : USER, TECHNICIAN, ADMIN
//
// Stratégie tickets :
//   USER       -> crée, voit ses tickets, commente, évalue (quand terminé), rouvre
//   TECHNICIAN -> voit UNIQUEMENT ses tickets assignés, commente,
//                 DECLARE résolu/non résolu (l'admin valide ensuite)
//   ADMIN      -> tout : assigne, change statut, escalade, modifie, supprime

export const PERMISSIONS = {
  // Tickets
  'ticket.create':       ['USER'],
  'ticket.viewOwn':      ['USER', 'TECHNICIAN', 'ADMIN'],
  'ticket.viewAll':      ['ADMIN'],
  'ticket.assign':       ['ADMIN'],
  'ticket.escalate':     ['ADMIN'],
  'ticket.changeStatus': ['ADMIN'],
  'ticket.update':       ['ADMIN'],
  'ticket.delete':       ['ADMIN'],
  // Flux : USER décide si le ticket est résolu ou s'il dépose une réclamation
  'ticket.markResolved': ['USER'],         // USER marque son ticket comme résolu (statut -> DONE)
  'ticket.reopen':       ['USER', 'ADMIN'],// USER (owner) ou ADMIN rouvre un ticket DONE avec justification
  'ticket.cancel':       ['USER', 'ADMIN'],// USER (owner) annule son ticket avant prise en charge (OPEN -> CANCELLED)
  'ticket.techDeclare':  ['TECHNICIAN', 'ADMIN'], // Tech assigné déclare RESOLVED / NOT_RESOLVED (en attente confirmation user)
  'ticket.userConfirm':  ['USER'],         // USER confirme ou rejette la déclaration RESOLVED du technicien
  'complaint.create':    ['USER'],         // USER dépose une réclamation avec description + images
  'complaint.manage':    ['ADMIN'],        // ADMIN consulte/traite/renvoie au tech

  // Rapports d'intervention rédigés par le technicien à la clôture
  'interventionReport.create': ['TECHNICIAN', 'ADMIN'],
  'interventionReport.viewAll': ['ADMIN'],
  'interventionReport.viewOwn': ['TECHNICIAN'],

  // Admin (gestion plateforme)
  'user.manage':         ['ADMIN'],
  'agency.manage':       ['ADMIN'],
  'category.manage':     ['ADMIN'],

  // Rapports
  'report.viewAgency':   ['ADMIN'],
  'report.viewGlobal':   ['ADMIN'],
};

export function can(role, action) {
  return PERMISSIONS[action]?.includes(role) ?? false;
}
