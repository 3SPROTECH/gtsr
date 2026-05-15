import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { ticketsApi, adminApi } from '../../api/endpoints';
import { Spinner } from '../../components/Spinner';
import { toast } from '../../components/Toast';
import { Icons, Icon } from '../../components/Icons';
import { TYPE_LABELS } from '../../utils/enums';

const ACCEPTED_TYPES = '.pdf,.docx,.doc,.png,.jpg,.jpeg';
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 Mo
const MAX_FILES = 5;

export default function NewTicketPage() {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: { type: 'INCIDENT' },
  });
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [files, setFiles] = useState([]);
  const [fileError, setFileError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    adminApi.categories.list().then(setCategories).catch(() => {});
  }, []);

  const onFileChange = (e) => {
    setFileError('');
    const list = Array.from(e.target.files || []);
    if (list.length > MAX_FILES) {
      setFileError(`Maximum ${MAX_FILES} fichiers`);
      e.target.value = '';
      return;
    }
    for (const f of list) {
      if (f.size > MAX_FILE_SIZE) {
        setFileError(`Le fichier "${f.name}" dépasse 10 Mo`);
        e.target.value = '';
        return;
      }
    }
    setFiles(list);
  };

  const removeFile = (i) => setFiles((arr) => arr.filter((_, idx) => idx !== i));

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      const t = await ticketsApi.create(data);
      if (files.length) {
        try {
          await ticketsApi.uploadAttachments(t.id, files);
        } catch (upErr) {
          toast.error('Ticket créé mais échec upload des pièces jointes : ' + (upErr.response?.data?.error?.message || upErr.message));
        }
      }
      toast.success(`Ticket ${t.number} créé`);
      navigate(`/tickets/${t.id}`);
    } catch (e) {
      toast.error(e.response?.data?.error?.message || 'Erreur création');
    } finally { setLoading(false); }
  };

  const humanSize = (b) => b < 1024 ? b + ' B' : b < 1024 * 1024 ? (b / 1024).toFixed(1) + ' Ko' : (b / 1024 / 1024).toFixed(1) + ' Mo';

  return (
    <div className="w-full space-y-5">
      <button onClick={() => navigate(-1)} className="text-sm text-slate-500 hover:text-brand-700 inline-flex items-center gap-1">
        <Icon glyph={Icons.back} size="sm" /> Retour
      </button>

      <div>
        <h1>Nouveau ticket</h1>
        <p className="text-sm text-slate-500 mt-0.5">Décrivez votre problème pour qu'un technicien puisse vous aider.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="card p-6 space-y-5">
        <Field label="Titre / Sujet" required error={errors.title && 'Titre requis (min 3 caractères)'}>
          <input className="input" maxLength={200} placeholder="Ex : Imprimante 2e étage bloquée"
            {...register('title', { required: true, minLength: 3 })} />
        </Field>

        <Field label="Description détaillée" required>
          <textarea className="input min-h-[140px]" placeholder="Contexte, messages d'erreur, étapes pour reproduire…"
            {...register('description', { required: true, minLength: 3 })} />
        </Field>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Type">
            <select className="input" {...register('type')}>
              {Object.entries(TYPE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </Field>
          <Field label="Catégorie">
            <select className="input" {...register('categoryId')}>
              <option value="">— Choisir —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.parent ? `${c.parent.name} › ` : ''}{c.name}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {/* Pièces jointes */}
        <div>
          <label className="label">Pièces jointes (facultatif)</label>
          <div className="flex items-center gap-3">
            <label className="btn-ghost cursor-pointer">
              <Icon glyph={Icons.attach} size="sm" />
              Choisir des fichiers
              <input type="file" multiple accept={ACCEPTED_TYPES} className="hidden" onChange={onFileChange} />
            </label>
            <span className="text-[11px] text-slate-500">
              Formats acceptés : PDF, DOCX, PNG, JPG, JPEG · Max 5 fichiers, 10 Mo chacun
            </span>
          </div>
          {fileError && <p className="text-xs text-red-600 mt-1">{fileError}</p>}
          {files.length > 0 && (
            <ul className="mt-2 space-y-1">
              {files.map((f, i) => (
                <li key={i} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-md px-3 py-1.5 text-sm">
                  <span className="flex items-center gap-2 min-w-0">
                    <Icon glyph={Icons.attach} size="xs" className="text-slate-400" />
                    <span className="truncate">{f.name}</span>
                    <span className="text-[11px] text-slate-400 shrink-0">{humanSize(f.size)}</span>
                  </span>
                  <button type="button" onClick={() => removeFile(i)} className="text-slate-400 hover:text-red-600">
                    <Icon glyph={Icons.close} size="xs" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <button type="button" className="btn-ghost" onClick={() => navigate(-1)}>Annuler</button>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? <Spinner size={16} /> : <><Icon glyph={Icons.send} size="sm" /> Créer le ticket</>}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, required, error, children }) {
  return (
    <div>
      <label className="label">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      {children}
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
