// Mapping enums backend -> labels FR + couleurs (palette corporate sobre)

export const ROLE_LABELS = {
  USER: 'Utilisateur',
  TECHNICIAN: 'Technicien',
  ADMIN: 'Administrateur',
};

export const STATUS_LABELS = {
  OPEN:        'Ouvert',
  IN_PROGRESS: 'En cours',
  DONE:        'Terminé',
  CANCELLED:   'Annulé',
};

export const STATUS_COLORS = {
  OPEN:        'bg-[#DBEAFE] text-[#1E40AF]',
  IN_PROGRESS: 'bg-[#FEF3C7] text-[#92400E]',
  DONE:        'bg-[#D1FAE5] text-[#065F46]',
  CANCELLED:   'bg-[#FEE2E2] text-[#991B1B]',
};

export const PRIORITY_LABELS = {
  LOW:      'Faible',
  MEDIUM:   'Moyenne',
  HIGH:     'Haute',
  CRITICAL: 'Critique',
};

export const PRIORITY_COLORS = {
  LOW:      'bg-[#D1FAE5] text-[#065F46]',
  MEDIUM:   'bg-[#FEF3C7] text-[#92400E]',
  HIGH:     'bg-[#FFE8D6] text-[#9A3412]',
  CRITICAL: 'bg-[#FEE2E2] text-[#991B1B]',
};

export const GRADE_LABELS = {
  G1: 'G1 - Très facile',
  G2: 'G2 - Facile',
  G3: 'G3 - Moyenne',
  G4: 'G4 - Difficile',
  G5: 'G5 - Critique',
};

export const TYPE_LABELS = {
  INCIDENT:  'Incident',
  REQUEST:   'Demande',
  QUESTION:  'Question',
  EVOLUTION: 'Évolution',
};

export const IMPACT_LABELS = {
  LOW:        'Faible (1 personne)',
  MEDIUM:     'Moyen (1 équipe)',
  HIGH:       'Élevé (1 agence)',
  VERY_HIGH:  'Très élevé (multi-agences)',
};

export const URGENCY_LABELS = {
  LOW:      'Faible',
  MEDIUM:   'Moyenne',
  HIGH:     'Haute',
  CRITICAL: 'Critique',
};

export const CHANNEL_LABELS = {
  WEB: 'Portail web', MOBILE: 'Mobile', EMAIL: 'E-mail',
  PHONE: 'Téléphone', CHATBOT: 'Chatbot', API: 'API',
};

// Disponibilité (utilisée surtout par les techniciens, visible par tous)
export const AVAILABILITY_LABELS = {
  AVAILABLE: 'Disponible',
  BUSY:      'Occupé',
  AWAY:      'Absent',
};

export const AVAILABILITY_DOT = {
  AVAILABLE: 'bg-success',
  BUSY:      'bg-warning',
  AWAY:      'bg-muted-foreground/60',
};
