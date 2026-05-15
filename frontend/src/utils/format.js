export const formatDate = (d) => {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
};

export const formatRelative = (d) => {
  if (!d) return '—';
  const ms = new Date(d).getTime() - Date.now();
  const abs = Math.abs(ms);
  const min = Math.round(abs / 60000);
  if (min < 60) return ms > 0 ? `dans ${min} min` : `il y a ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return ms > 0 ? `dans ${h} h` : `il y a ${h} h`;
  const j = Math.round(h / 24);
  return ms > 0 ? `dans ${j} j` : `il y a ${j} j`;
};

export const initials = (firstName = '', lastName = '') =>
  `${(firstName[0] || '').toUpperCase()}${(lastName[0] || '').toUpperCase()}` || '?';
