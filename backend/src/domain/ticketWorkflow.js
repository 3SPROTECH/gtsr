// Workflow simplifié - 4 statuts
// OPEN        : ticket créé, en attente / non démarré
// IN_PROGRESS : un technicien le traite
// DONE        : terminé
// CANCELLED   : annulé (terminal)

const TRANSITIONS = {
  OPEN:        ['IN_PROGRESS', 'DONE', 'CANCELLED'],
  IN_PROGRESS: ['OPEN', 'DONE', 'CANCELLED'],
  DONE:        ['OPEN'],          // réouverture possible
  CANCELLED:   [],                 // terminal
};

export function canTransition(from, to) {
  if (from === to) return false;
  return (TRANSITIONS[from] || []).includes(to);
}

export function allowedTransitions(from) {
  return TRANSITIONS[from] || [];
}
