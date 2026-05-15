// CDC §7.3 - Matrice priorité/grade selon Impact × Urgence

const MATRIX = {
  LOW: {
    LOW:      { priority: 'LOW',      grade: 'G1' },
    MEDIUM:   { priority: 'LOW',      grade: 'G2' },
    HIGH:     { priority: 'MEDIUM',   grade: 'G2' },
    CRITICAL: { priority: 'HIGH',     grade: 'G3' },
  },
  MEDIUM: {
    LOW:      { priority: 'LOW',      grade: 'G2' },
    MEDIUM:   { priority: 'MEDIUM',   grade: 'G2' },
    HIGH:     { priority: 'HIGH',     grade: 'G3' },
    CRITICAL: { priority: 'CRITICAL', grade: 'G4' },
  },
  HIGH: {
    LOW:      { priority: 'MEDIUM',   grade: 'G3' },
    MEDIUM:   { priority: 'HIGH',     grade: 'G3' },
    HIGH:     { priority: 'CRITICAL', grade: 'G4' },
    CRITICAL: { priority: 'CRITICAL', grade: 'G5' },
  },
  VERY_HIGH: {
    LOW:      { priority: 'HIGH',     grade: 'G3' },
    MEDIUM:   { priority: 'CRITICAL', grade: 'G4' },
    HIGH:     { priority: 'CRITICAL', grade: 'G5' },
    CRITICAL: { priority: 'CRITICAL', grade: 'G5' },
  },
};

export function computePriorityAndGrade(impact, urgency) {
  return MATRIX[impact]?.[urgency] || { priority: 'MEDIUM', grade: 'G2' };
}

// Rôle cible : G1..G4 = TECHNICIAN, G5 = ADMIN (escalade critique)
export function targetRoleForGrade(grade) {
  return grade === 'G5' ? 'ADMIN' : 'TECHNICIAN';
}
