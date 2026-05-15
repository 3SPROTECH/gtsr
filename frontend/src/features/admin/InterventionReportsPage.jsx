import { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { interventionReportsApi, adminApi } from '../../api/endpoints';
import { Spinner } from '../../components/Spinner';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '../../components/ui/Dialog';
import { Input, Label, Select } from '../../components/ui/Input';
import { Icons, Icon } from '../../components/Icons';
import { toast, extractApiError } from '../../components/Toast';
import { formatDate, formatRelative, initials } from '../../utils/format';

export default function InterventionReportsPage() {
  const navigate = useNavigate();
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [technicians, setTechnicians] = useState([]);
  const [filters, setFilters] = useState({ technicianId: '', q: '', from: '', to: '' });
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    adminApi.users.list({ role: 'TECHNICIAN', limit: 200 })
      .then((r) => setTechnicians(r.items || []))
      .catch(() => {});
  }, []);

  const load = () => {
    setLoading(true);
    const params = { limit: 100 };
    if (filters.technicianId) params.technicianId = filters.technicianId;
    if (filters.q) params.q = filters.q;
    if (filters.from) params.from = filters.from;
    if (filters.to) params.to = filters.to;
    interventionReportsApi.list(params)
      .then(setData)
      .catch((e) => toast.error(extractApiError(e)))
      .finally(() => setLoading(false));
  };
  // Recharge dès qu'un filtre change
  useEffect(load, [filters.technicianId, filters.q, filters.from, filters.to]);

  const setF = (patch) => setFilters((f) => ({ ...f, ...patch }));
  const reset = () => setFilters({ technicianId: '', q: '', from: '', to: '' });

  // Compte rapide par technicien (sur la page courante) — pratique pour repérer les écarts
  const perTech = useMemo(() => {
    const m = new Map();
    for (const r of data.items) {
      const k = r.technician?.id;
      if (!k) continue;
      const entry = m.get(k) || { id: k, name: `${r.technician.firstName} ${r.technician.lastName}`, count: 0 };
      entry.count++;
      m.set(k, entry);
    }
    return [...m.values()].sort((a, b) => b.count - a.count);
  }, [data.items]);

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1>Rapports d'intervention</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Rapports déposés par les techniciens · {data.total} rapport{data.total > 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Filtres */}
      <Card className="p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div className="lg:col-span-2">
            <Label>Recherche</Label>
            <Input placeholder="N° ticket, titre, description…"
              value={filters.q} onChange={(e) => setF({ q: e.target.value })} />
          </div>
          <div>
            <Label>Technicien</Label>
            <Select value={filters.technicianId} onChange={(e) => setF({ technicianId: e.target.value })}>
              <option value="">Tous</option>
              {technicians.map((t) => (
                <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Du</Label>
            <Input type="date" value={filters.from} max={filters.to || undefined}
              onChange={(e) => setF({ from: e.target.value })} />
          </div>
          <div>
            <Label>Au</Label>
            <Input type="date" value={filters.to} min={filters.from || undefined}
              onChange={(e) => setF({ to: e.target.value })} />
          </div>
        </div>
        {(filters.technicianId || filters.q || filters.from || filters.to) && (
          <div className="mt-3 flex justify-end">
            <Button variant="ghost" size="sm" onClick={reset}>
              <Icon glyph={Icons.reset} size="sm" /> Réinitialiser les filtres
            </Button>
          </div>
        )}
      </Card>

      {/* Compteurs par technicien (résumé visuel) */}
      {perTech.length > 0 && !filters.technicianId && (
        <Card className="p-4">
          <div className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-2">
            Répartition par technicien
          </div>
          <div className="flex flex-wrap gap-2">
            {perTech.map((t) => (
              <button
                key={t.id}
                onClick={() => setF({ technicianId: t.id })}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted hover:bg-accent border border-border text-xs transition-colors"
                title="Filtrer sur ce technicien"
              >
                <span className="font-medium">{t.name}</span>
                <Badge variant="muted">{t.count}</Badge>
              </button>
            ))}
          </div>
        </Card>
      )}

      <Card>
        {loading ? <div className="p-8 flex justify-center"><Spinner /></div> : data.items.length === 0 ? (
          <div className="p-16 text-center">
            <Icon glyph={Icons.attach} size="xl" className="text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground">Aucun rapport pour ces critères.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Ticket</th>
                <th>Demandeur</th>
                <th>Technicien</th>
                <th>Compte-rendu</th>
                <th>Fichiers</th>
                <th>Date</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((r) => (
                <tr key={r.id}>
                  <td>
                    <Link to={`/tickets/${r.ticket?.id}`} className="font-mono text-xs text-primary hover:underline">
                      {r.ticket?.number}
                    </Link>
                    <div className="text-xs text-foreground truncate max-w-[220px]">{r.ticket?.title}</div>
                  </td>
                  <td className="text-sm">
                    {r.ticket?.requester ? `${r.ticket.requester.firstName} ${r.ticket.requester.lastName}` : '—'}
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-info-subtle text-info flex items-center justify-center text-[10px] font-semibold shrink-0">
                        {initials(r.technician?.firstName, r.technician?.lastName)}
                      </div>
                      <span className="text-sm">{r.technician?.firstName} {r.technician?.lastName}</span>
                    </div>
                  </td>
                  <td>
                    <span className="text-sm text-foreground line-clamp-2 max-w-[320px]">{r.description}</span>
                  </td>
                  <td>
                    {r.files?.length > 0
                      ? <Badge variant="muted"><Icon glyph={Icons.attach} size="xs" /> {r.files.length}</Badge>
                      : <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                  <td className="text-xs text-muted-foreground">{formatDate(r.createdAt)}</td>
                  <td className="text-right">
                    <Button variant="outline" size="sm" onClick={() => setSelected(r)}>
                      <Icon glyph={Icons.eye} size="sm" /> Détails
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* === Modal détail rapport === */}
      <Dialog open={!!selected} onClose={() => setSelected(null)} size="lg">
        <DialogHeader
          icon={<Icon glyph={Icons.attach} size="md" />}
          description={selected?.ticket ? `Ticket ${selected.ticket.number} · ${selected.ticket.title}` : ''}
          onClose={() => setSelected(null)}
        >
          Rapport d'intervention
        </DialogHeader>
        <DialogBody>
          {selected && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <InfoRow label="Technicien"
                  value={selected.technician ? `${selected.technician.firstName} ${selected.technician.lastName}` : '—'}
                  sub={selected.technician?.email} />
                <InfoRow label="Demandeur"
                  value={selected.ticket?.requester ? `${selected.ticket.requester.firstName} ${selected.ticket.requester.lastName}` : '—'} />
                <InfoRow label="Agence" value={selected.ticket?.agency?.name || '—'} />
                <InfoRow label="Déposé le" value={formatDate(selected.createdAt)} sub={formatRelative(selected.createdAt)} />
              </div>

              <div>
                <Label>Compte-rendu</Label>
                <div className="bg-muted/40 border border-border rounded-lg p-4 text-sm whitespace-pre-wrap">
                  {selected.description}
                </div>
              </div>

              {selected.files?.length > 0 && (
                <div>
                  <Label>{selected.files.length} fichier(s) joint(s)</Label>
                  <ul className="space-y-1">
                    {selected.files.map((f) => (
                      <li key={f.id} className="flex items-center gap-2 bg-muted/40 border border-border rounded-md px-3 py-2">
                        <Icon glyph={Icons.attach} size="sm" className="text-muted-foreground" />
                        <span className="flex-1 truncate text-sm">{f.filename}</span>
                        <span className="text-[11px] text-muted-foreground">{(f.size / 1024).toFixed(1)} Ko</span>
                        <button type="button"
                           onClick={() => interventionReportsApi.openFile(selected.id, f.id).catch(() => toast.error('Ouverture impossible'))}
                           className="text-xs text-primary hover:underline">
                          Ouvrir
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setSelected(null)}>Fermer</Button>
          {selected?.ticket?.id && (
            <Button onClick={() => navigate(`/tickets/${selected.ticket.id}`)}>
              <Icon glyph={Icons.eye} size="sm" /> Voir le ticket
            </Button>
          )}
        </DialogFooter>
      </Dialog>
    </div>
  );
}

function InfoRow({ label, value, sub }) {
  return (
    <div className="bg-muted/40 border border-border rounded-lg p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">{label}</div>
      <div className="text-sm text-foreground">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}
