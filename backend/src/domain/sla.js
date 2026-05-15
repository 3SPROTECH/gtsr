// CDC §14.2 - SLA par priorité (en minutes pour précision)
// Calcul en heures ouvrées de l'agence du demandeur (§14.1)

export const SLA_RULES = {
  CRITICAL: { responseMin: 15,   resolutionMin: 120 },     // 15 min / 2 h
  HIGH:     { responseMin: 30,   resolutionMin: 240 },     // 30 min / 4 h
  MEDIUM:   { responseMin: 120,  resolutionMin: 60 * 8 },  // 2 h / 1 jour ouvré (8h)
  LOW:      { responseMin: 60 * 8, resolutionMin: 60 * 8 * 5 }, // 1 jour / 5 jours ouvrés
};

/**
 * Ajoute N minutes ouvrées à une date selon les horaires d'agence.
 * agency: { openingHourStart, openingHourEnd, workingDays: "1,2,3,4,5" }
 * Pour CRITICAL/HIGH (urgence forte) on ajoute en temps calendaire (astreinte §14.1).
 */
export function addBusinessMinutes(startDate, minutes, agency, opts = {}) {
  if (opts.calendar) {
    return new Date(startDate.getTime() + minutes * 60_000);
  }
  const startH = agency?.openingHourStart ?? 8;
  const endH = agency?.openingHourEnd ?? 18;
  const workingDays = (agency?.workingDays ?? '1,2,3,4,5')
    .split(',').map(s => parseInt(s, 10));

  const dailyMin = (endH - startH) * 60;
  let remaining = minutes;
  let cur = new Date(startDate);

  while (remaining > 0) {
    const dow = ((cur.getDay() + 6) % 7) + 1; // 1=lundi..7=dimanche
    const isWorkday = workingDays.includes(dow);

    if (!isWorkday) {
      // sauter au lundi suivant à startH
      cur.setDate(cur.getDate() + 1);
      cur.setHours(startH, 0, 0, 0);
      continue;
    }

    const hour = cur.getHours() + cur.getMinutes() / 60;
    if (hour < startH) cur.setHours(startH, 0, 0, 0);
    if (hour >= endH) {
      cur.setDate(cur.getDate() + 1);
      cur.setHours(startH, 0, 0, 0);
      continue;
    }

    const minutesLeftToday = (endH - cur.getHours()) * 60 - cur.getMinutes();
    if (remaining <= minutesLeftToday) {
      cur = new Date(cur.getTime() + remaining * 60_000);
      remaining = 0;
    } else {
      remaining -= minutesLeftToday;
      cur.setDate(cur.getDate() + 1);
      cur.setHours(startH, 0, 0, 0);
    }
  }
  return cur;
}

export function computeDeadlines(createdAt, priority, agency) {
  const rule = SLA_RULES[priority] || SLA_RULES.MEDIUM;
  // Les priorités haute/critique utilisent du temps calendaire (astreinte)
  const calendar = priority === 'CRITICAL' || priority === 'HIGH';
  return {
    dueResponseAt: addBusinessMinutes(createdAt, rule.responseMin, agency, { calendar }),
    dueResolutionAt: addBusinessMinutes(createdAt, rule.resolutionMin, agency, { calendar }),
  };
}

export function isBreached(now, deadline) {
  return deadline && new Date(now) > new Date(deadline);
}
