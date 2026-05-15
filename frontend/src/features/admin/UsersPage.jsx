import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { adminApi } from '../../api/endpoints';
import { Modal } from '../../components/Modal';
import { Spinner } from '../../components/Spinner';
import { toast, extractApiError } from '../../components/Toast';
import { Icons, Icon } from '../../components/Icons';
import { ROLE_LABELS } from '../../utils/enums';
import { formatRelative } from '../../utils/format';

const ROLES = ['USER', 'TECHNICIAN', 'ADMIN'];

// "En ligne" = activité authentifiée détectée dans les 5 dernières minutes
const ONLINE_THRESHOLD_MS = 5 * 60_000;
const isOnline = (u) => u.lastSeenAt && (Date.now() - new Date(u.lastSeenAt).getTime()) < ONLINE_THRESHOLD_MS;

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [agencies, setAgencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [editing, setEditing] = useState(null);
  const [q, setQ] = useState('');
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const load = (silent = false) => {
    if (!silent) setLoading(true);
    Promise.all([adminApi.users.list({ q, limit: 100 }), adminApi.agencies.list()])
      .then(([u, a]) => { setUsers(u.items || []); setAgencies(a); })
      .finally(() => { if (!silent) setLoading(false); });
  };
  useEffect(() => { load(); }, [q]);

  // Refresh présence toutes les 30s (silencieux, ne déclenche pas le spinner)
  // et tick local pour réévaluer isOnline sans appel réseau (le seuil est côté client)
  const [, forceTick] = useState(0);
  useEffect(() => {
    const refreshInterval = setInterval(() => load(true), 30_000);
    const tickInterval = setInterval(() => forceTick((n) => n + 1), 30_000);
    return () => { clearInterval(refreshInterval); clearInterval(tickInterval); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const openCreate = () => { setEditing(null); reset({}); setModal('form'); };
  const openEdit = (u) => { setEditing(u); reset({ ...u, password: '' }); setModal('form'); };

  const onSubmit = async (data) => {
    try {
      const payload = { ...data };
      // Ne pas envoyer agencyId vide
      if (!payload.agencyId) delete payload.agencyId;
      if (editing) {
        if (!payload.password) delete payload.password;
        await adminApi.users.update(editing.id, payload);
        toast.success('Utilisateur mis à jour');
      } else {
        await adminApi.users.create(payload);
        toast.success('Utilisateur créé');
      }
      setModal(null); load();
    } catch (e) { toast.error(extractApiError(e)); }
  };

  const onDelete = async (u) => {
    if (!confirm(`Supprimer ${u.email} ?`)) return;
    try { await adminApi.users.remove(u.id); toast.success('Supprimé'); load(); }
    catch (e) { toast.error(extractApiError(e)); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1>Utilisateurs</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {users.length} compte{users.length > 1 ? 's' : ''}
            {(() => {
              const online = users.filter(isOnline).length;
              return online > 0 ? (
                <span className="ml-2 inline-flex items-center gap-1.5 text-success">
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                  {online} en ligne
                </span>
              ) : null;
            })()}
          </p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Icon glyph={Icons.search} size="sm" />
            </span>
            <input className="input w-64 pl-9" placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <button className="btn-primary" onClick={openCreate}>
            <Icon glyph={Icons.plus} size="sm" /> Nouvel utilisateur
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? <div className="p-8 flex justify-center"><Spinner /></div> : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Email</th>
                <th>Rôle</th>
                <th>Agence</th>
                <th>Statut</th>
                <th>Actif</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const online = isOnline(u);
                return (
                <tr key={u.id}>
                  <td className="font-medium text-slate-800">
                    <span className="inline-flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${online ? 'bg-success' : 'bg-muted-foreground/40'}`} />
                      {u.firstName} {u.lastName}
                    </span>
                  </td>
                  <td className="text-slate-600">{u.email}</td>
                  <td><span className="tag">{ROLE_LABELS[u.role]}</span></td>
                  <td className="text-slate-600">{u.agency?.name || '—'}</td>
                  <td>
                    {online ? (
                      <span className="badge bg-[#D1FAE5] text-[#065F46] border-transparent inline-flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                        En ligne
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground inline-flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
                        Absent
                        {u.lastSeenAt && <span className="text-muted-foreground/70">· vu {formatRelative(u.lastSeenAt)}</span>}
                      </span>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${u.isActive ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-500'}`}>
                      {u.isActive ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="text-right">
                    <button className="btn-ghost !py-1 !px-2" onClick={() => openEdit(u)} aria-label="Modifier">
                      <Icon glyph={Icons.edit} size="sm" />
                    </button>
                    <button className="btn-ghost !py-1 !px-2 ml-1 !text-red-600" onClick={() => onDelete(u)} aria-label="Supprimer">
                      <Icon glyph={Icons.trash} size="sm" />
                    </button>
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={modal === 'form'} onClose={() => setModal(null)} title={editing ? 'Modifier utilisateur' : 'Nouvel utilisateur'}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(null)}>Annuler</button>
          <button className="btn-primary" onClick={handleSubmit(onSubmit)}>
            <Icon glyph={Icons.save} size="sm" /> Enregistrer
          </button>
        </>}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Prénom *</label>
              <input className="input" {...register('firstName', { required: true })} />
              {errors.firstName && <p className="text-xs text-red-600 mt-1">Requis</p>}
            </div>
            <div>
              <label className="label">Nom *</label>
              <input className="input" {...register('lastName', { required: true })} />
            </div>
          </div>
          <div>
            <label className="label">Email *</label>
            <input type="email" className="input" disabled={!!editing} {...register('email', { required: true })} />
          </div>
          <div>
            <label className="label">{editing ? 'Nouveau mot de passe (laisser vide pour ne pas changer)' : 'Mot de passe *'}</label>
            <input type="password" className="input"
              {...register('password', {
                required: !editing && 'Mot de passe requis',
                validate: (v) => {
                  if (editing && !v) return true; // OK si vide en édition
                  if (!v || v.length < 8)    return 'Au moins 8 caractères';
                  if (!/[A-Z]/.test(v))      return 'Doit contenir une majuscule';
                  if (!/[a-z]/.test(v))      return 'Doit contenir une minuscule';
                  if (!/[0-9]/.test(v))      return 'Doit contenir un chiffre';
                  return true;
                },
              })} />
            {errors.password ? (
              <p className="text-xs text-red-600 mt-1">{errors.password.message}</p>
            ) : (
              <p className="text-[11px] text-slate-400 mt-1">8 caractères min, avec majuscule, minuscule et chiffre. Ex : <span className="font-mono">User@2026</span></p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Rôle</label>
              <select className="input" {...register('role')}>
                {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Agence</label>
              <select className="input" {...register('agencyId')}>
                <option value="">—</option>
                {agencies.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
          </div>
          {editing && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" {...register('isActive')} /> Compte actif
            </label>
          )}
        </form>
      </Modal>
    </div>
  );
}
