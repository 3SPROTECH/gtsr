import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useAgencyFilterStore } from '../stores/agencyFilterStore';
import { authApi, notificationsApi, adminApi } from '../api/endpoints';
import { ROLE_LABELS, AVAILABILITY_LABELS, AVAILABILITY_DOT } from '../utils/enums';
import { initials, formatRelative } from '../utils/format';
import { Toast, toast } from '../components/Toast';
import { Icons, Icon } from '../components/Icons';
import { Badge } from '../components/ui/Badge';
import logoGtsr from '../images/imagegtsr.png';

const ALL_ROLES = ['USER', 'TECHNICIAN', 'ADMIN'];

const NAV_MAIN = [
  { to: '/dashboard', label: 'Tableau de bord', icon: Icons.dashboard, roles: ALL_ROLES },
  { to: '/tickets',   label: 'Tickets',         icon: Icons.ticket,    roles: ALL_ROLES },
];

const NAV_ADMIN = [
  { to: '/admin/users',      label: 'Utilisateurs', icon: Icons.users,    roles: ['ADMIN'] },
  { to: '/admin/agencies',   label: 'Agences',      icon: Icons.agency,   roles: ['ADMIN'] },
  { to: '/admin/categories', label: 'Catégories',   icon: Icons.category, roles: ['ADMIN'] },
  { to: '/admin/complaints', label: 'Réclamations', icon: Icons.warning,  roles: ['ADMIN'] },
  { to: '/admin/intervention-reports', label: 'Rapports', icon: Icons.attach, roles: ['ADMIN'] },
];

export default function AppLayout() {
  const { user, logout, refreshToken, setUser } = useAuthStore();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [onlineCount, setOnlineCount] = useState(null);

  // Compteur "en ligne" — admin uniquement, poll toutes les 30s
  useEffect(() => {
    if (user?.role !== 'ADMIN') return;
    const fetchCount = () => adminApi.users.onlineCount()
      .then((d) => setOnlineCount(d.count ?? 0))
      .catch(() => {});
    fetchCount();
    const t = setInterval(fetchCount, 30_000);
    return () => clearInterval(t);
  }, [user?.role]);

  const changeAvailability = async (next) => {
    try {
      const { user: updated } = await authApi.updateAvailability(next);
      setUser({ ...user, availability: updated.availability });
      toast.success(`Statut : ${AVAILABILITY_LABELS[next]}`);
    } catch (e) {
      toast.error(e.response?.data?.error?.message || 'Erreur');
    }
  };

  useEffect(() => {
    const fetch = () => notificationsApi.list(true).then((d) => setUnread(d.unread || 0)).catch(() => {});
    fetch();
    const t = setInterval(fetch, 30_000);
    return () => clearInterval(t);
  }, []);

  const onLogout = async () => {
    try { await authApi.logout(refreshToken); } catch {}
    logout();
    navigate('/login', { replace: true });
  };

  const adminLinks = NAV_ADMIN.filter(n => n.roles.includes(user?.role));

  return (
    <div className="h-screen flex bg-background overflow-hidden">
      <Toast />

      {/* === Sidebar (fixe, ne scroll pas avec le contenu) === */}
      <aside className="w-60 bg-card border-r border-border flex flex-col shrink-0 h-screen sticky top-0">
        <div className="px-5 py-4 border-b border-border">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={logoGtsr} alt="GTSR" className="w-40 h-20 rounded-lg object-contain" />
          </Link>
        </div>

        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          <SectionTitle>Espace de travail</SectionTitle>
          {NAV_MAIN.filter(n => n.roles.includes(user?.role)).map((n) => <NavItem key={n.to} {...n} />)}
          {adminLinks.length > 0 && (
            <>
              <SectionTitle className="mt-4">Administration</SectionTitle>
              {adminLinks.map((n) => (
                <NavItem
                  key={n.to}
                  {...n}
                  badge={n.to === '/admin/users' && onlineCount > 0 ? (
                    <span
                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-success-subtle text-success text-[10px] font-semibold border border-success/20"
                      title={`${onlineCount} utilisateur${onlineCount > 1 ? 's' : ''} en ligne`}
                    >
                      <span className="w-1 h-1 rounded-full bg-success animate-pulse" />
                      +{onlineCount}
                    </span>
                  ) : null}
                />
              ))}
            </>
          )}
        </nav>

        <div className="p-3 border-t border-border relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-accent transition-colors text-left"
          >
            <div className="relative">
              <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-xs">
                {initials(user?.firstName, user?.lastName)}
              </div>
              {user?.availability && (
                <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-card ${AVAILABILITY_DOT[user.availability]}`} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-foreground truncate">{user?.firstName} {user?.lastName}</div>
              <div className="text-xs text-muted-foreground truncate inline-flex items-center gap-1.5">
                <span>{ROLE_LABELS[user?.role]}</span>
                {user?.availability && (
                  <>
                    <span>·</span>
                  </>
                )}
              </div>
            </div>
            <Icon glyph={Icons.chevronDown} size="sm" className="text-muted-foreground" />
          </button>
          {menuOpen && (
            <div className="absolute bottom-full left-3 right-3 mb-2 bg-popover border border-border rounded-lg shadow-lg overflow-hidden">
              {/* Sélecteur de disponibilité — visible pour tous, particulièrement utile pour les techniciens */}
              <div className="px-3 py-2 border-b border-border">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Mon statut</div>
                <div className="space-y-0.5">
                  {['AVAILABLE', 'BUSY', 'AWAY'].map((s) => (
                    <button
                      key={s}
                      onClick={() => { changeAvailability(s); setMenuOpen(false); }}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors ${
                        user?.availability === s ? 'bg-accent text-foreground' : 'text-foreground/80 hover:bg-accent'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${AVAILABILITY_DOT[s]}`} />
                      <span className="flex-1 text-left">{AVAILABILITY_LABELS[s]}</span>
                      {user?.availability === s && <Icon glyph={Icons.check} size="xs" className="text-primary" />}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={onLogout} className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-foreground hover:bg-accent transition-colors">
                <Icon glyph={Icons.logout} size="sm" className="text-muted-foreground" />
                Se déconnecter
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* === Zone principale === */}
      <div className="flex-1 flex flex-col min-w-0 h-screen">
        <header className="h-14 bg-card border-b border-border px-6 flex items-center justify-between shrink-0 sticky top-0 z-10">
          {/* Sélecteur agence (admin) ou label statique (user/tech) */}
          {user?.role === 'ADMIN' ? (
            <AgencySelector />
          ) : user?.agency ? (
            <div className="text-sm text-muted-foreground inline-flex items-center gap-2">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">Agence</span>
              <span className="text-foreground font-medium">{user.agency.name}</span>
            </div>
          ) : <div />}

          <div className="flex items-center gap-1">
            <NotificationsBell unread={unread} onChange={() => notificationsApi.list(true).then((d) => setUnread(d.unread || 0)).catch(() => {})} />
          </div>
        </header>

        <main className="flex-1 p-6 overflow-y-auto min-w-0">
          <div className="max-w-[1600px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

function NotificationsBell({ unread, onChange }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    notificationsApi.list(false).then((d) => setItems((d.items || []).slice(0, 5))).finally(() => setLoading(false));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const goTo = (n) => {
    setOpen(false);
    if (!n.isRead) notificationsApi.markRead(n.id).then(onChange).catch(() => {});
    if (n.ticketId) navigate(`/tickets/${n.ticketId}`);
    else navigate('/notifications');
  };

  const markAll = async () => {
    try { await notificationsApi.markAllRead(); } catch {}
    setItems((arr) => arr.map((n) => ({ ...n, isRead: true })));
    onChange?.();
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        aria-label="Notifications"
      >
        <Icon glyph={Icons.bell} size="md" />
        {unread > 0 && (
          <Badge variant="destructive" className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] justify-center px-1 py-0 leading-none">
            {unread > 9 ? '9+' : unread}
          </Badge>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-[360px] bg-popover border border-border rounded-lg shadow-lg overflow-hidden z-30 animate-fade-in">
          <div className="px-3 py-2 flex items-center justify-between border-b border-border">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Notifications {unread > 0 && <span className="text-foreground">({unread} non lue{unread > 1 ? 's' : ''})</span>}
            </div>
            {unread > 0 && (
              <button onClick={markAll} className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
                <Icon glyph={Icons.checkAll} size="xs" /> Tout lire
              </button>
            )}
          </div>

          <div className="max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="px-3 py-6 text-xs text-muted-foreground text-center">Chargement…</div>
            ) : items.length === 0 ? (
              <div className="px-3 py-8 text-center">
                <Icon glyph={Icons.bell} size="lg" className="text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Aucune notification.</p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {items.map((n) => (
                  <li key={n.id}>
                    <button
                      onClick={() => goTo(n)}
                      className={`w-full text-left px-3 py-2.5 hover:bg-accent transition-colors ${n.isRead ? '' : 'bg-primary/[0.04]'}`}
                    >
                      <div className="flex items-start gap-2">
                        {!n.isRead && <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-foreground truncate">{n.title}</div>
                          <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.body}</div>
                          <div className="text-[10px] text-muted-foreground/70 mt-1">{formatRelative(n.createdAt)}</div>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t border-border">
            <button
              onClick={() => { setOpen(false); navigate('/notifications'); }}
              className="w-full px-3 py-2.5 text-xs text-foreground hover:bg-accent transition-colors inline-flex items-center justify-center gap-1.5"
            >
              Tout voir <Icon glyph={Icons.chevronRight} size="xs" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SectionTitle({ children, className = '' }) {
  return <div className={`px-3 pt-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70 ${className}`}>{children}</div>;
}

function NavItem({ to, label, icon, badge }) {
  return (
    <NavLink
      to={to}
      end={to === '/dashboard'}
      className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
    >
      <Icon glyph={icon} size="sm" />
      <span className="flex-1">{label}</span>
      {badge}
    </NavLink>
  );
}

/**
 * Sélecteur d'agence pour l'admin :
 *  - Affiche "Toutes les agences" par défaut
 *  - Permet de filtrer toutes les données de la plateforme sur une agence
 *  - La sélection est persistée et propagée automatiquement via l'intercepteur API
 */
function AgencySelector() {
  const [open, setOpen] = useState(false);
  const [agencies, setAgencies] = useState([]);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);
  const { selectedAgencyId, selectedAgencyName, setSelectedAgency } = useAgencyFilterStore();

  useEffect(() => {
    if (open && agencies.length === 0) {
      setLoading(true);
      adminApi.agencies.list().then(setAgencies).finally(() => setLoading(false));
    }
  }, [open]);

  // Fermer au clic en dehors
  useEffect(() => {
    if (!open) return;
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const select = (id, name) => {
    setSelectedAgency(id, name);
    setOpen(false);
    // Force un reload des données : rafraîchit la page courante
    window.location.reload();
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 px-3 h-9 rounded-md border border-border bg-background hover:bg-accent transition-colors text-sm"
      >
        <Icon glyph={Icons.agency} size="sm" className="text-muted-foreground" />
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Agence</span>
        <span className="text-foreground font-medium">{selectedAgencyName}</span>
        <Icon glyph={Icons.chevronDown} size="sm" className="text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1.5 min-w-[260px] bg-popover border border-border rounded-lg shadow-lg overflow-hidden z-30 animate-fade-in">
          <div className="px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground border-b border-border">
            Filtrer par agence
          </div>
          <div className="max-h-[320px] overflow-y-auto py-1">
            <AgencyOption
              isActive={!selectedAgencyId}
              onClick={() => select(null, 'Toutes les agences')}
              label="Toutes les agences"
              hint="Voir toutes les données"
            />
            {loading ? (
              <div className="px-3 py-3 text-xs text-muted-foreground">Chargement…</div>
            ) : (
              agencies.map((a) => (
                <AgencyOption
                  key={a.id}
                  isActive={selectedAgencyId === a.id}
                  onClick={() => select(a.id, a.name)}
                  label={a.name}
                  hint={a.code}
                />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function AgencyOption({ isActive, onClick, label, hint }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full px-3 py-2 flex items-center justify-between gap-2 text-left hover:bg-accent transition-colors ${isActive ? 'bg-accent/60' : ''}`}
    >
      <div className="min-w-0">
        <div className="text-sm text-foreground truncate">{label}</div>
        {hint && <div className="text-[11px] text-muted-foreground truncate font-mono">{hint}</div>}
      </div>
      {isActive && <Icon glyph={Icons.check} size="sm" className="text-primary shrink-0" />}
    </button>
  );
}
