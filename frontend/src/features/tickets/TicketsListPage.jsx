import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ticketsApi, adminApi } from '../../api/endpoints';
import { useAuthStore } from '../../stores/authStore';
import { StatusBadge, PriorityBadge, GradeBadge } from '../../components/Badge';
import { Spinner } from '../../components/Spinner';
import { Icons, Icon } from '../../components/Icons';
import { STATUS_LABELS, PRIORITY_LABELS, GRADE_LABELS } from '../../utils/enums';
import { formatDate, formatRelative } from '../../utils/format';

const STATUS_COLUMNS = ['OPEN', 'IN_PROGRESS', 'DONE', 'CANCELLED'];

const SORT_OPTIONS = [
  { value: 'createdAt_desc', label: 'Plus récents d\'abord' },
  { value: 'createdAt_asc',  label: 'Plus anciens d\'abord' },
  { value: 'priority',       label: 'Priorité (haute → basse)' },
  { value: 'sla',            label: 'SLA restant (urgent d\'abord)' },
];

const INITIAL_FILTERS = {
  q: '', status: '', priority: '', categoryId: '', agencyId: '',
  slaRisk: '', from: '', to: '', sort: 'createdAt_desc', page: 1,
};

export default function TicketsListPage() {
  const role = useAuthStore((s) => s.user?.role);
  const isAdmin = role === 'ADMIN';
  const canCreate = role === 'USER';

  const [view, setView] = useState('list'); // 'list' | 'kanban'
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [categories, setCategories] = useState([]);
  const [agencies, setAgencies] = useState([]);

  // Charge les listes auxiliaires une seule fois
  useEffect(() => {
    adminApi.categories.list().then(setCategories).catch(() => {});
    if (isAdmin) adminApi.agencies.list().then(setAgencies).catch(() => {});
  }, [isAdmin]);

  // En vue Kanban, on charge davantage de tickets et on ignore le filtre statut (les colonnes le portent)
  useEffect(() => {
    setLoading(true);
    const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== '' && v !== null && v !== false));
    if (view === 'kanban') {
      delete params.status;
      params.limit = 200;
    } else {
      params.limit = 25;
    }
    ticketsApi.list(params).then(setData).finally(() => setLoading(false));
  }, [filters, view]);

  const setF = (patch) => setFilters((f) => ({ ...f, ...patch, page: 1 }));
  const reset = () => setFilters({ ...INITIAL_FILTERS });

  // Compteurs par statut pour les en-têtes de colonnes Kanban (sur le résultat courant filtré)
  const groupedByStatus = useMemo(() => {
    if (view !== 'kanban') return {};
    return data.items.reduce((acc, t) => {
      (acc[t.status] = acc[t.status] || []).push(t);
      return acc;
    }, {});
  }, [data.items, view]);

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1>Tickets</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {data.total} ticket{data.total > 1 ? 's' : ''} au total
            {view === 'kanban' && data.items.length < data.total && ` · ${data.items.length} affichés`}
          </p>
        </div>
        <div className="flex items-end gap-2">
          <ViewToggle view={view} onChange={setView} />
          {canCreate && (
            <Link to="/tickets/new" className="btn-primary">
              <Icon glyph={Icons.plus} size="sm" />
              Nouveau ticket
            </Link>
          )}
        </div>
      </div>

      {/* Filtres */}
      <div className="card p-4 space-y-3">

        {/* Ligne 1 : Recherche (large) · Tri · Réinitialiser */}
        <div className="flex flex-col lg:flex-row lg:items-end gap-3">
          <div className="flex-1 min-w-0">
            <label className="label">Recherche</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                <Icon glyph={Icons.search} size="sm" />
              </span>
              <input className="input pl-9" placeholder="Numéro, titre, description…"
                value={filters.q} onChange={(e) => setF({ q: e.target.value })} />
            </div>
          </div>

          <div className="lg:w-64 shrink-0">
            <label className="label">Trier par</label>
            <select className="input" value={filters.sort} onChange={(e) => setF({ sort: e.target.value })}>
              {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>

          <button
            className="btn-ghost h-10 px-3 shrink-0 inline-flex items-center justify-center gap-1.5"
            onClick={reset}
            title="Réinitialiser les filtres"
          >
            <Icon glyph={Icons.reset} size="sm" />
            <span>Réinitialiser</span>
          </button>
        </div>

        {/* Ligne 2 : filtres secondaires alignés en colonnes égales */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {view === 'list' && (
            <div>
              <label className="label">Statut</label>
              <select className="input" value={filters.status} onChange={(e) => setF({ status: e.target.value })}>
                <option value="">Tous</option>
                {Object.entries(STATUS_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="label">Priorité</label>
            <select className="input" value={filters.priority} onChange={(e) => setF({ priority: e.target.value })}>
              <option value="">Toutes</option>
              {Object.entries(PRIORITY_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </div>

          <div>
            <label className="label">Catégorie</label>
            <select className="input" value={filters.categoryId} onChange={(e) => setF({ categoryId: e.target.value })}>
              <option value="">Toutes</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.parent ? `${c.parent.name} › ` : ''}{c.name}
                </option>
              ))}
            </select>
          </div>

          {isAdmin && (
            <div>
              <label className="label">Agence</label>
              <select className="input" value={filters.agencyId} onChange={(e) => setF({ agencyId: e.target.value })}>
                <option value="">Toutes</option>
                {agencies.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="label">Du</label>
            <input type="date" className="input" value={filters.from} max={filters.to || undefined}
              onChange={(e) => setF({ from: e.target.value })} />
          </div>

          <div>
            <label className="label">Au</label>
            <input type="date" className="input" value={filters.to} min={filters.from || undefined}
              onChange={(e) => setF({ to: e.target.value })} />
          </div>
        </div>
      </div>

      {/* Contenu */}
      {loading ? (
        <div className="card p-12 flex justify-center"><Spinner /></div>
      ) : data.items.length === 0 ? (
        <div className="card p-16 text-center">
          <Icon glyph={Icons.ticket} size="xl" className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Aucun ticket ne correspond à vos critères.</p>
        </div>
      ) : view === 'list' ? (
        <TicketsTable items={data.items} />
      ) : (
        <KanbanBoard grouped={groupedByStatus} />
      )}
    </div>
  );
}

function ViewToggle({ view, onChange }) {
  const btn = (v, label, icon) => (
    <button
      type="button"
      onClick={() => onChange(v)}
      className={`inline-flex items-center gap-1.5 px-3 h-9 text-sm border transition-colors ${
        view === v
          ? 'bg-foreground text-background border-foreground'
          : 'bg-card text-foreground border-border hover:bg-accent'
      } ${v === 'list' ? 'rounded-l-md' : 'rounded-r-md -ml-px'}`}
    >
      <Icon glyph={icon} size="sm" /> {label}
    </button>
  );
  return (
    <div className="inline-flex">
      {btn('list', 'Liste', Icons.ticket)}
      {btn('kanban', 'Kanban', Icons.folderOpen)}
    </div>
  );
}

function TicketsTable({ items }) {
  return (
    <div className="card overflow-hidden">
      <table className="data-table">
        <thead>
          <tr>
            <th>N°</th>
            <th>Titre</th>
            <th>Demandeur</th>
            <th>Statut</th>
            <th>Priorité</th>
            <th>Assigné</th>
            <th>SLA</th>
            <th>Créé</th>
          </tr>
        </thead>
        <tbody>
          {items.map((t) => (
            <tr key={t.id}>
              <td><Link to={`/tickets/${t.id}`} className="font-mono text-[12px] text-brand-700 hover:underline">{t.number}</Link></td>
              <td><Link to={`/tickets/${t.id}`} className="font-medium text-slate-800 hover:text-brand-700">{t.title}</Link></td>
              <td className="text-slate-600">{t.requester ? `${t.requester.firstName} ${t.requester.lastName}` : '—'}</td>
              <td><StatusBadge status={t.status} /></td>
              <td><PriorityBadge priority={t.priority} /></td>
              <td className="text-slate-600">{t.assignee ? `${t.assignee.firstName} ${t.assignee.lastName}` : <span className="text-slate-400">—</span>}</td>
              <td><SlaCell ticket={t} /></td>
              <td className="text-[12px] text-slate-500">{formatDate(t.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SlaCell({ ticket }) {
  if (['DONE', 'CANCELLED'].includes(ticket.status)) return <span className="text-slate-400 text-xs">—</span>;
  if (!ticket.dueResolutionAt) return <span className="text-slate-400 text-xs">—</span>;
  const due = new Date(ticket.dueResolutionAt);
  const now = new Date();
  const diffH = (due - now) / 36e5;
  if (diffH < 0) return <span className="text-xs font-medium text-red-600 inline-flex items-center gap-1"><Icon glyph={Icons.warning} size="xs" /> Dépassé</span>;
  if (diffH < 24) return <span className="text-xs font-medium text-amber-700 inline-flex items-center gap-1"><Icon glyph={Icons.hourglass} size="xs" /> {formatRelative(due)}</span>;
  return <span className="text-xs text-slate-500">{formatRelative(due)}</span>;
}

function KanbanBoard({ grouped }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {STATUS_COLUMNS.map((s) => {
        const items = grouped[s] || [];
        return (
          <div key={s} className="bg-muted/30 border border-border rounded-lg p-3 min-h-[200px]">
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="inline-flex items-center gap-2">
                <StatusBadge status={s} />
              </div>
              <span className="text-xs text-muted-foreground tabular-nums">{items.length}</span>
            </div>
            <div className="space-y-2">
              {items.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">Aucun ticket</p>
              ) : items.map((t) => <KanbanCard key={t.id} ticket={t} />)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function KanbanCard({ ticket }) {
  const isAtRisk = !['DONE', 'CANCELLED'].includes(ticket.status)
    && ticket.dueResolutionAt
    && (new Date(ticket.dueResolutionAt) - new Date()) / 36e5 < 24;
  return (
    <Link
      to={`/tickets/${ticket.id}`}
      className={`block bg-card border rounded-md p-3 hover:shadow-sm transition-all ${isAtRisk ? 'border-warning/60' : 'border-border hover:border-foreground/30'}`}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="font-mono text-[11px] text-muted-foreground">{ticket.number}</span>
        {ticket.slaBreached && <Icon glyph={Icons.warning} size="xs" className="text-destructive" />}
      </div>
      <div className="text-sm font-medium text-foreground line-clamp-2 mb-2">{ticket.title}</div>
      <div className="flex flex-wrap items-center gap-1.5 mb-2">
        <PriorityBadge priority={ticket.priority} />
      </div>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="truncate">
          {ticket.assignee
            ? `${ticket.assignee.firstName} ${ticket.assignee.lastName[0]}.`
            : <span className="italic">non assigné</span>}
        </span>
        {ticket.dueResolutionAt && !['DONE', 'CANCELLED'].includes(ticket.status) && (
          <span className={`shrink-0 inline-flex items-center gap-1 ${isAtRisk ? 'text-warning font-medium' : ''}`}>
            <Icon glyph={Icons.hourglass} size="xs" /> {formatRelative(ticket.dueResolutionAt)}
          </span>
        )}
      </div>
    </Link>
  );
}
