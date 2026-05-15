import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { adminApi } from '../../api/endpoints';
import { Modal } from '../../components/Modal';
import { Spinner } from '../../components/Spinner';
import { toast, extractApiError } from '../../components/Toast';
import { Icons, Icon } from '../../components/Icons';

export default function AgenciesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [editing, setEditing] = useState(null);
  const { register, handleSubmit, reset } = useForm();

  const load = () => {
    setLoading(true);
    adminApi.agencies.list().then(setItems).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const openCreate = () => { setEditing(null); reset({ openingHourStart: 8, openingHourEnd: 18, workingDays: '1,2,3,4,5', timezone: 'Europe/Paris' }); setModal('form'); };
  const openEdit = (a) => { setEditing(a); reset(a); setModal('form'); };

  const onSubmit = async (data) => {
    try {
      const payload = {
        ...data,
        openingHourStart: parseInt(data.openingHourStart, 10),
        openingHourEnd: parseInt(data.openingHourEnd, 10),
      };
      if (editing) { await adminApi.agencies.update(editing.id, payload); toast.success('Agence mise à jour'); }
      else        { await adminApi.agencies.create(payload);             toast.success('Agence créée'); }
      setModal(null); load();
    } catch (e) { toast.error(extractApiError(e)); }
  };

  const onDelete = async (a) => {
    if (!confirm(`Supprimer ${a.name} ?`)) return;
    try { await adminApi.agencies.remove(a.id); toast.success('Supprimée'); load(); }
    catch (e) { toast.error(extractApiError(e)); }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1>Agences</h1>
          <p className="text-sm text-slate-500 mt-0.5">{items.length} agence(s)</p>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          <Icon glyph={Icons.plus} size="sm" /> Nouvelle agence
        </button>
      </div>

      <div className="card overflow-hidden">
        {loading ? <div className="p-8 flex justify-center"><Spinner /></div> : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Nom</th>
                <th>Adresse</th>
                <th>Horaires</th>
                <th>Responsable</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id}>
                  <td><span className="tag font-mono">{a.code}</span></td>
                  <td className="font-medium text-slate-800">{a.name}</td>
                  <td className="text-slate-600">{a.address || '—'}</td>
                  <td className="text-slate-600">{a.openingHourStart}h–{a.openingHourEnd}h <span className="text-[11px] text-slate-400">({a.workingDays})</span></td>
                  <td className="text-slate-600">{a.manager ? `${a.manager.firstName} ${a.manager.lastName}` : '—'}</td>
                  <td className="text-right">
                    <button className="btn-ghost !py-1 !px-2" onClick={() => openEdit(a)}>
                      <Icon glyph={Icons.edit} size="sm" />
                    </button>
                    <button className="btn-ghost !py-1 !px-2 ml-1 !text-red-600" onClick={() => onDelete(a)}>
                      <Icon glyph={Icons.trash} size="sm" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Modal open={modal === 'form'} onClose={() => setModal(null)} title={editing ? 'Modifier agence' : 'Nouvelle agence'}
        footer={<><button className="btn-ghost" onClick={() => setModal(null)}>Annuler</button><button className="btn-primary" onClick={handleSubmit(onSubmit)}><Icon glyph={Icons.save} size="sm" /> Enregistrer</button></>}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Code *</label><input className="input" {...register('code', { required: true })} /></div>
            <div><label className="label">Nom *</label><input className="input" {...register('name', { required: true })} /></div>
          </div>
          <div><label className="label">Adresse</label><input className="input" {...register('address')} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Fuseau horaire</label><input className="input" {...register('timezone')} /></div>
            <div><label className="label">Jours ouvrés (1=lun..7=dim)</label><input className="input" {...register('workingDays')} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Heure d'ouverture</label><input type="number" min="0" max="23" className="input" {...register('openingHourStart')} /></div>
            <div><label className="label">Heure de fermeture</label><input type="number" min="1" max="24" className="input" {...register('openingHourEnd')} /></div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
