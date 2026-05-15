import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { reportsApi, ticketsApi } from '../../api/endpoints';
import { useAuthStore } from '../../stores/authStore';
import { StatusBadge, PriorityBadge } from '../../components/Badge';
import { Spinner } from '../../components/Spinner';
import { Icons, Icon } from '../../components/Icons';
import { Card, CardContent } from '../../components/ui/Card';
import { ROLE_LABELS } from '../../utils/enums';
import { formatRelative } from '../../utils/format';

const EMPTY_DASH = {
  total: 0, backlog: 0, resolved: 0, slaBreached: 0, slaRate: 100,
  satisfaction: { avg: null, count: 0 },
  byStatus: [], byPriority: [], byGrade: [],
};

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [dash, setDash] = useState(null);
  const [myDash, setMyDash] = useState(null);
  const [topCats, setTopCats] = useState([]);
  const [workload, setWorkload] = useState([]);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isTech = ['TECHNICIAN', 'ADMIN'].includes(user?.role);
  const isSupervisor = user?.role === 'ADMIN';
  const canCreate = user?.role === 'USER';

  useEffect(() => {
    const safe = (p, fallback) => p.catch((err) => {
      console.error('[Dashboard] API error:', err.response?.data || err.message);
      setError(err.response?.data?.error?.message || err.message || 'Erreur API');
      return fallback;
    });
    Promise.all([
      safe(reportsApi.dashboard(),       EMPTY_DASH),
      isTech ? safe(reportsApi.myDashboard(), null) : Promise.resolve(null),
      safe(reportsApi.topCategories(),   []),
      isSupervisor ? safe(reportsApi.techWorkload(), []) : Promise.resolve([]),
      safe(ticketsApi.list({ limit: 6 }), { items: [] }),
    ]).then(([d, m, c, w, r]) => {
      setDash(d || EMPTY_DASH); setMyDash(m); setTopCats(c || []);
      setWorkload(w || []); setRecent(r?.items || []);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 flex justify-center"><Spinner /></div>;

  const data = dash || EMPTY_DASH;
  const slaPositive = data.slaRate >= 90;
  const maxStatus = Math.max(1, ...data.byStatus.map(x => x.count));
  const maxPriority = Math.max(1, ...data.byPriority.map(x => x.count));

  return (
    <div className="space-y-6">
      {/* === En-tête de page === */}
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Bonjour, {user.firstName}</h1>
          <p className="text-sm text-muted-foreground mt-1">{ROLE_LABELS[user.role]}{user.agency ? ` · ${user.agency.name}` : ''}</p>
        </div>
        {canCreate && (
          <Link to="/tickets/new" className="btn-primary">
            <Icon glyph={Icons.plus} size="sm" /> Nouveau ticket
          </Link>
        )}
      </div>

      {error && (
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="!p-4 flex items-center gap-3 text-sm">
            <Icon glyph={Icons.error} size="md" className="text-destructive shrink-0" />
            <span className="text-destructive">{error}</span>
          </CardContent>
        </Card>
      )}

      {/* === KPI globaux === */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Stat label="Tickets totaux"   value={data.total}     icon={Icons.ticket} />
        <Stat label="Backlog ouvert"   value={data.backlog}   icon={Icons.hourglass} />
        <Stat label="Résolus / Clos"   value={data.resolved}  icon={Icons.success} accent="success" />
      </div>

      {/* === Mon activité (Tech/Admin) === */}
      {isTech && myDash && (
        <section>
          <h2 className="text-base font-semibold text-foreground mb-3">Mon activité</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Stat label="Mes tickets ouverts"  value={myDash.myOpen} icon={Icons.ticket} />
            <Stat label="En cours"              value={myDash.myInProgress} icon={Icons.clock} />
            <Stat label="Résolus par moi"      value={myDash.resolvedByMe} icon={Icons.success} accent="success" />
          </div>
        </section>
      )}

      {/* === Grille de panneaux === */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        <Panel title="Top catégories" icon={Icons.category}>
          {topCats.length === 0 ? <Empty /> : (
            <ul className="divide-y divide-border">
              {topCats.map((c) => (
                <li key={c.categoryId || 'none'} className="flex justify-between items-center text-sm py-2.5 first:pt-0 last:pb-0">
                  <span className="text-foreground truncate pr-3">{c.name}</span>
                  <span className="font-semibold text-foreground tabular-nums">{c.count}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {isSupervisor && (
          <Panel title="Charge par technicien" icon={Icons.users}>
            {workload.length === 0 ? <Empty /> : (
              <ul className="divide-y divide-border">
                {workload.map((w) => (
                  <li key={w.assigneeId} className="flex justify-between items-center py-2.5 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <div className="text-sm text-foreground truncate">{w.tech?.firstName} {w.tech?.lastName}</div>
                      <div className="text-[11px] text-muted-foreground uppercase tracking-wider">{ROLE_LABELS[w.tech?.role]}</div>
                    </div>
                    <span className="badge bg-primary/10 text-primary border border-primary/20 shrink-0 ml-3">
                      {w.open} ticket{w.open > 1 ? 's' : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}

        <Panel
          title="Tickets récents"
          icon={Icons.ticket}
          action={<Link to="/tickets" className="text-xs text-primary hover:underline">Tout voir →</Link>}
          className={isSupervisor ? '' : 'lg:col-span-2'}
        >
          {recent.length === 0 ? <Empty /> : (
            <ul className="divide-y divide-border">
              {recent.map((t) => (
                <li key={t.id} className="py-1">
                  <Link to={`/tickets/${t.id}`} className="flex items-center justify-between hover:bg-muted/40 -mx-3 px-3 py-2 rounded-md transition-colors gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-mono text-[11px] text-muted-foreground/80">{t.number}</span>
                        <StatusBadge status={t.status} />
                      </div>
                      <div className="text-sm text-foreground truncate">{t.title}</div>
                    </div>
                    <span className="text-xs text-muted-foreground ml-3 shrink-0">{formatRelative(t.createdAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}

// === Sous-composants ===

function Stat({ label, value, icon, accent }) {
  const accentMap = {
    success: 'text-success bg-success-subtle',
    destructive: 'text-destructive bg-destructive/10',
    warning: 'text-warning bg-warning-subtle',
  };
  const iconClass = accentMap[accent] || 'text-muted-foreground bg-muted';
  return (
    <Card className="!rounded-xl">
      <div className="p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
          {icon && (
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${iconClass}`}>
              <Icon glyph={icon} size="sm" />
            </div>
          )}
        </div>
        <div className="text-3xl font-semibold text-foreground mt-3 tracking-tight tabular-nums">{value}</div>
      </div>
    </Card>
  );
}

function Panel({ title, icon, action, children, className = '' }) {
  return (
    <Card className={`!rounded-xl ${className}`}>
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          {icon && <Icon glyph={icon} size="sm" className="text-muted-foreground" />}
          {title}
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </Card>
  );
}

function Empty({ label = 'Aucune donnée.' }) {
  return <p className="text-sm text-muted-foreground py-2">{label}</p>;
}

function Bar({ value, max }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3 flex-1 min-w-0">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-medium text-foreground w-8 text-right tabular-nums">{value}</span>
    </div>
  );
}
