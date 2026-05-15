import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { adminApi } from '../../api/endpoints';
import { Modal } from '../../components/Modal';
import { Spinner } from '../../components/Spinner';
import { toast, extractApiError } from '../../components/Toast';
import { Icons, Icon } from '../../components/Icons';

export default function CategoriesPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [modal, setModal] = useState(null);
  const [editing, setEditing] = useState(null);
  const { register, handleSubmit, reset } = useForm();

  const load = () => {
    setLoading(true);
    adminApi.categories.list().then(setItems).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const onAdd = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await adminApi.categories.create({ name, parentId: parentId || null });
      setName(''); setParentId('');
      toast.success('Catégorie créée');
      load();
    } catch (err) { toast.error(extractApiError(err)); }
  };

  const openEdit = (c) => { setEditing(c); reset({ name: c.name, parentId: c.parentId || '' }); setModal('edit'); };

  const onUpdate = async (data) => {
    try {
      await adminApi.categories.update(editing.id, {
        name: data.name,
        parentId: data.parentId || null,
      });
      toast.success('Catégorie mise à jour');
      setModal(null); load();
    } catch (e) { toast.error(extractApiError(e)); }
  };

  const onDelete = async (c) => {
    if (!confirm(`Supprimer ${c.name} ?`)) return;
    try { await adminApi.categories.remove(c.id); toast.success('Supprimée'); load(); }
    catch (e) { toast.error(extractApiError(e)); }
  };

  const roots = items.filter(c => !c.parentId);

  return (
    <div className="space-y-5">
      <div>
        <h1>Catégories</h1>
        <p className="text-sm text-slate-500 mt-0.5">Arborescence paramétrable (CDC §6.3).</p>
      </div>

      <form onSubmit={onAdd} className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-6">
            <label className="label">Nom</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex : Imprimante" />
          </div>
          <div className="md:col-span-5">
            <label className="label">Catégorie parente</label>
            <select className="input" value={parentId} onChange={(e) => setParentId(e.target.value)}>
              <option value="">— Aucune (racine) —</option>
              {roots.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div className="md:col-span-1">
            <button className="btn-primary w-full" type="submit">
              <Icon glyph={Icons.plus} size="sm" />
            </button>
          </div>
        </div>
      </form>

      {loading ? <div className="p-8 flex justify-center"><Spinner /></div> : items.length === 0 ? (
        <div className="card p-16 text-center">
          <Icon glyph={Icons.category} size="xl" className="text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">Aucune catégorie. Créez-en une ci-dessus.</p>
        </div>
      ) : (
        <div className="card p-2">
          <ul className="divide-y divide-slate-100">
            {roots.map((r) => (
              <li key={r.id} className="py-1">
                <div className="group flex items-center justify-between py-1.5 px-3 hover:bg-slate-50 rounded">
                  <div className="flex items-center gap-2">
                    <Icon glyph={Icons.folderOpen} size="sm" className="text-amber-500" />
                    <span className="font-medium text-slate-800">{r.name}</span>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="text-slate-400 hover:text-brand-700 p-1" onClick={() => openEdit(r)} aria-label="Éditer">
                      <Icon glyph={Icons.edit} size="sm" />
                    </button>
                    <button className="text-slate-400 hover:text-red-600 p-1" onClick={() => onDelete(r)} aria-label="Supprimer">
                      <Icon glyph={Icons.trash} size="sm" />
                    </button>
                  </div>
                </div>
                {r.children?.length > 0 && (
                  <ul className="ml-6 border-l border-slate-200 pl-3">
                    {r.children.map((c) => (
                      <li key={c.id} className="group flex items-center justify-between py-1 px-2 text-sm hover:bg-slate-50 rounded">
                        <div className="flex items-center gap-2 text-slate-600">
                          <Icon glyph={Icons.chevronRight} size="xs" className="text-slate-300" />
                          <span>{c.name}</span>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button className="text-slate-400 hover:text-brand-700 p-1" onClick={() => openEdit(c)} aria-label="Éditer">
                            <Icon glyph={Icons.edit} size="xs" />
                          </button>
                          <button className="text-slate-400 hover:text-red-600 p-1" onClick={() => onDelete(c)} aria-label="Supprimer">
                            <Icon glyph={Icons.trash} size="xs" />
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Modal open={modal === 'edit'} onClose={() => setModal(null)} title={`Modifier "${editing?.name}"`}
        footer={<>
          <button className="btn-ghost" onClick={() => setModal(null)}>Annuler</button>
          <button className="btn-primary" onClick={handleSubmit(onUpdate)}>
            <Icon glyph={Icons.save} size="sm" /> Enregistrer
          </button>
        </>}>
        <form onSubmit={handleSubmit(onUpdate)} className="space-y-3">
          <div>
            <label className="label">Nom *</label>
            <input className="input" {...register('name', { required: true })} />
          </div>
          <div>
            <label className="label">Catégorie parente</label>
            <select className="input" {...register('parentId')}>
              <option value="">— Aucune (racine) —</option>
              {roots.filter(r => r.id !== editing?.id).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
        </form>
      </Modal>
    </div>
  );
}
