import { Badge } from './ui/Badge';
import { STATUS_LABELS, PRIORITY_LABELS } from '../utils/enums';

// Mapping vers les variantes spécifiques de la palette GTSR
const STATUS_VARIANT = {
  OPEN:        'status-open',
  IN_PROGRESS: 'status-progress',
  DONE:        'status-done',
  CANCELLED:   'status-cancelled',
};

const PRIORITY_VARIANT = {
  LOW:      'priority-low',
  MEDIUM:   'priority-medium',
  HIGH:     'priority-high',
  CRITICAL: 'priority-critical',
};

const GRADE_VARIANT = {
  G1: 'grade-G1',
  G2: 'grade-G2',
  G3: 'grade-G3',
  G4: 'grade-G4',
  G5: 'grade-G5',
};

export function StatusBadge({ status }) {
  return <Badge variant={STATUS_VARIANT[status] || 'muted'}>{STATUS_LABELS[status] || status}</Badge>;
}

export function PriorityBadge({ priority }) {
  return <Badge variant={PRIORITY_VARIANT[priority] || 'muted'}>{PRIORITY_LABELS[priority] || priority}</Badge>;
}

export function GradeBadge({ grade }) {
  return <Badge variant={GRADE_VARIANT[grade] || 'muted'} className="font-mono">{grade}</Badge>;
}
