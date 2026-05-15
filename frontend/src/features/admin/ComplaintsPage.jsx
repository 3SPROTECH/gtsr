import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { complaintsApi, adminApi } from '../../api/endpoints';
import { api } from '../../api/client';
import { Spinner } from '../../components/Spinner';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '../../components/ui/Dialog';
import { Textarea, Label, Select } from '../../components/ui/Input';
import { Icons, Icon } from '../../components/Icons';
import { toast, extractApiError } from '../../components/Toast';
import { formatDate, formatRelative, initials } from '../../utils/format';

const STATUS_LABELS = {
  PENDING:  'En attente',
  REVIEWED: 'Traitée',
};
const STATUS_VARIANTS = {
  PENDING:  'warning',
  REVIEWED: 'success',
};

export default function ComplaintsPage() {
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [selectedFull, setSelectedFull] = useState(null);
  const [reviewNote, setReviewNote] = useState('');
  const [imagePreview, setImagePreview] = useState(null);
  const [technicians, setTechnicians] = useState([]);
  const [forwardTechId, setForwardTechId] = useState('');
  const [forwardNote, setForwardNote] = useState('');
  const [forwardOpen, setForwardOpen] = useState(false);

  // Charger la liste des techniciens (pour le dropdown de renvoi)
  useEffect(() => {
    adminApi.users.list({ role: 'TECHNICIAN', limit: 100 })
      .then((r) => setTechnicians(r.items || []))
      .catch(() => {});
  }, []);

  const load = () => {
    setLoading(true);
    complaintsApi.list({ status: filter || undefined, limit: 100 })
      .then(setData)
      .finally(() => setLoading(false));
  };
  useEffect(load, [filter]);

  const open = async (c) => {
    setSelected(c);
    try {
      const full = await complaintsApi.get(c.id);
      setSelectedFull(full);
      setReviewNote(full.reviewNote || '');
    } catch (e) {
      toast.error(extractApiError(e));
    }
  };

  const close = () => {
    setSelected(null); setSelectedFull(null); setReviewNote('');
    setForwardOpen(false); setForwardTechId(''); setForwardNote('');
  };

  const markReviewed = async () => {
    if (!selected) return;
    try {
      await complaintsApi.markReviewed(selected.id, reviewNote);
      toast.success('Réclamation marquée comme traitée');
      close();
      load();
    } catch (e) { toast.error(extractApiError(e)); }
  };

  const openForward = () => {
    // Pré-remplir avec l'autre tech disponible (pas celui qui n'a pas résolu)
    const otherTech = technicians.find(t => t.id !== selectedFull?.technician?.id);
    setForwardTechId(otherTech?.id || technicians[0]?.id || '');
    setForwardNote('');
    setForwardOpen(true);
  };

  // Ouvre directement le modal "Relancer" depuis une ligne du tableau (sans le modal détail)
  const openForwardFromRow = async (c) => {
    setSelected(c);
    try {
      const full = await complaintsApi.get(c.id);
      setSelectedFull(full);
      const otherTech = technicians.find(t => t.id !== full.technician?.id);
      setForwardTechId(otherTech?.id || technicians[0]?.id || '');
      setForwardNote('');
      setForwardOpen(true);
    } catch (e) { toast.error(extractApiError(e)); }
  };

  const doForward = async () => {
    if (!selected || !forwardTechId) {
      toast.error('Veuillez sélectionner un technicien');
      return;
    }
    try {
      await complaintsApi.forwardToTech(selected.id, forwardTechId, forwardNote);
      toast.success('Ticket renvoyé au technicien sélectionné');
      close();
      load();
    } catch (e) { toast.error(extractApiError(e)); }
  };

  // Téléchargement protégé d'une image (passe par axios avec token)
  const fetchImageBlob = async (complaintId, imageId) => {
    const r = await api.get(`/complaints/${complaintId}/images/${imageId}`, { responseType: 'blob' });
    return URL.createObjectURL(r.data);
  };

  // Pour les <img>, on charge en base64 via blob - simple pour l'affichage avec auth
  const ImageThumb = ({ complaintId, image, onClick }) => {
    const [src, setSrc] = useState(null);
    useEffect(() => {
      let revoke;
      fetchImageBlob(complaintId, image.id).then((url) => { setSrc(url); revoke = url; }).catch(() => {});
      return () => { if (revoke) URL.revokeObjectURL(revoke); };
    }, [complaintId, image.id]);
    return (
      <button type="button" onClick={() => onClick?.(src, image)}
        className="aspect-square bg-muted rounded-md overflow-hidden border border-border hover:border-primary transition-colors">
        {src ? <img src={src} alt={image.filename} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-muted-foreground"><Spinner size={16} /></div>}
      </button>
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <h1>Réclamations techniciens</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Tickets déclarés non résolus par les techniciens · {data.total} réclamation(s)
          </p>
        </div>
        <div className="flex gap-2 items-end">
          <div className="min-w-[180px]">
            <Label>Filtrer par statut</Label>
            <Select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="">Toutes</option>
              {Object.entries(STATUS_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </Select>
          </div>
        </div>
      </div>

      <Card>
        {loading ? <div className="p-8 flex justify-center"><Spinner /></div> : data.items.length === 0 ? (
          <div className="p-16 text-center">
            <Icon glyph={Icons.warning} size="xl" className="text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground">Aucune réclamation à afficher.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Statut</th>
                <th>Ticket</th>
                <th>Demandeur</th>
                <th>Technicien</th>
                <th>Description</th>
                <th>Images</th>
                <th>Date</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((c) => (
                <tr key={c.id}>
                  <td><Badge variant={STATUS_VARIANTS[c.status]}>{STATUS_LABELS[c.status]}</Badge></td>
                  <td>
                    <Link to={`/tickets/${c.ticket?.id}`} className="font-mono text-xs text-primary hover:underline">
                      {c.ticket?.number}
                    </Link>
                    <div className="text-xs text-foreground truncate max-w-[200px]">{c.ticket?.title}</div>
                  </td>
                  <td className="text-sm">
                    {c.ticket?.requester ? `${c.ticket.requester.firstName} ${c.ticket.requester.lastName}` : '—'}
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-warning/15 text-warning flex items-center justify-center text-[10px] font-semibold shrink-0">
                        {initials(c.technician?.firstName, c.technician?.lastName)}
                      </div>
                      <span className="text-sm">{c.technician?.firstName} {c.technician?.lastName}</span>
                    </div>
                  </td>
                  <td>
                    <span className="text-sm text-foreground line-clamp-2 max-w-[280px]">{c.description}</span>
                  </td>
                  <td>
                    {c._count?.images > 0 ? (
                      <Badge variant="muted"><Icon glyph={Icons.attach} size="xs" /> {c._count.images}</Badge>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                  <td className="text-xs text-muted-foreground">{formatDate(c.createdAt)}</td>
                  <td className="text-right">
                    <div className="inline-flex items-center gap-1">
                      <Button variant="outline" size="sm" onClick={() => open(c)}>
                        <Icon glyph={Icons.eye} size="sm" /> Détails
                      </Button>
                      {c.status === 'PENDING' && (
                        <Button variant="default" size="sm" onClick={() => openForwardFromRow(c)}>
                          <Icon glyph={Icons.assign} size="sm" /> Relancer
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* === Modal détail réclamation === */}
      <Dialog open={!!selected} onClose={close} size="xl">
        <DialogHeader
          icon={<Icon glyph={Icons.warning} size="md" />}
          description={selectedFull?.ticket ? `Ticket ${selectedFull.ticket.number} · ${selectedFull.ticket.title}` : ''}
          onClose={close}
        >
          Détail de la réclamation
        </DialogHeader>
        <DialogBody>
          {!selectedFull ? <div className="p-6 flex justify-center"><Spinner /></div> : (
            <div className="space-y-5">
              {/* Statut + métadonnées */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <InfoRow label="Statut" value={<Badge variant={STATUS_VARIANTS[selectedFull.status]}>{STATUS_LABELS[selectedFull.status]}</Badge>} />
                <InfoRow label="Déclarée le" value={formatDate(selectedFull.createdAt)} />
                <InfoRow label="Technicien" value={`${selectedFull.technician?.firstName} ${selectedFull.technician?.lastName}`} sub={selectedFull.technician?.email} />
                <InfoRow label="Demandeur"  value={selectedFull.ticket?.requester ? `${selectedFull.ticket.requester.firstName} ${selectedFull.ticket.requester.lastName}` : '—'} sub={selectedFull.ticket?.requester?.email} />
                <InfoRow label="Agence"    value={selectedFull.ticket?.agency?.name || '—'} />
                <InfoRow label="Ticket"    value={<Link to={`/tickets/${selectedFull.ticket?.id}`} className="link">{selectedFull.ticket?.number}</Link>} />
              </div>

              {/* Description */}
              <div>
                <Label>Description du problème</Label>
                <div className="bg-muted/40 border border-border rounded-lg p-4 text-sm whitespace-pre-wrap">
                  {selectedFull.description}
                </div>
              </div>

              {/* Galerie d'images */}
              {selectedFull.images?.length > 0 && (
                <div>
                  <Label>{selectedFull.images.length} image(s) jointe(s)</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {selectedFull.images.map((img) => (
                      <div key={img.id}>
                        <ImageThumb
                          complaintId={selectedFull.id}
                          image={img}
                          onClick={(src) => setImagePreview({ src, filename: img.filename })}
                        />
                        <div className="text-[10px] text-muted-foreground mt-1 truncate">{img.filename}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bilan révision (si déjà traitée) */}
              {selectedFull.status === 'REVIEWED' && (
                <div className="bg-success-subtle border border-success/30 rounded-lg p-4">
                  <div className="text-xs font-semibold text-success uppercase tracking-wider mb-1">Traitée</div>
                  <p className="text-sm whitespace-pre-wrap">{selectedFull.reviewNote || '(aucune note)'}</p>
                  <p className="text-[11px] text-muted-foreground mt-2">{formatRelative(selectedFull.reviewedAt)}</p>
                </div>
              )}

              {/* Formulaire traitement (si PENDING) */}
              {selectedFull.status === 'PENDING' && (
                <div>
                  <Label>Note de traitement (facultatif)</Label>
                  <Textarea
                    placeholder="Décrivez l'action prise (réassignation, escalade, plan d'action…)"
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    className="min-h-[100px]"
                  />
                </div>
              )}
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={close}>Fermer</Button>
          {selectedFull?.status === 'PENDING' && (
            <>
              <Button variant="outline" onClick={markReviewed}>
                <Icon glyph={Icons.check} size="sm" /> Marquer comme traitée
              </Button>
              <Button variant="default" onClick={openForward}>
                <Icon glyph={Icons.assign} size="sm" /> Relancer
              </Button>
            </>
          )}
        </DialogFooter>
      </Dialog>

      {/* === Modal RELANCER (sélection technicien) === */}
      <Dialog open={forwardOpen} onClose={() => setForwardOpen(false)} size="md">
        <DialogHeader
          icon={<Icon glyph={Icons.assign} size="md" />}
          description="Choisissez un technicien pour reprendre le ticket. Il recevra une notification avec les détails de la réclamation."
          onClose={() => setForwardOpen(false)}
        >
          Relancer la réclamation
        </DialogHeader>
        <DialogBody>
          <div className="space-y-4">
            <div>
              <Label required>Technicien à assigner</Label>
              <Select value={forwardTechId} onChange={(e) => setForwardTechId(e.target.value)}>
                <option value="">— Choisir un technicien —</option>
                {technicians.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.firstName} {t.lastName}{t.id === selectedFull?.technician?.id ? '  (technicien précédent)' : ''}
                  </option>
                ))}
              </Select>
              {selectedFull?.technician && (
                <p className="text-[11px] text-muted-foreground mt-1">
                  Précédemment assigné à : <b>{selectedFull.technician.firstName} {selectedFull.technician.lastName}</b>
                </p>
              )}
            </div>
            <div>
              <Label>Instructions pour le technicien (facultatif)</Label>
              <Textarea
                placeholder="Précisez ce que vous attendez (priorité, contexte, contacts utiles...)"
                value={forwardNote}
                onChange={(e) => setForwardNote(e.target.value)}
                className="min-h-[110px]"
              />
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setForwardOpen(false)}>Annuler</Button>
          <Button onClick={doForward} disabled={!forwardTechId}>
            <Icon glyph={Icons.send} size="sm" /> Envoyer au technicien
          </Button>
        </DialogFooter>
      </Dialog>

      {/* === Modal preview image grand format === */}
      <Dialog open={!!imagePreview} onClose={() => setImagePreview(null)} size="xl">
        <DialogHeader onClose={() => setImagePreview(null)}>
          {imagePreview?.filename}
        </DialogHeader>
        <DialogBody className="!p-0 bg-foreground/95 flex items-center justify-center">
          {imagePreview && <img src={imagePreview.src} alt={imagePreview.filename} className="max-w-full max-h-[70vh] object-contain" />}
        </DialogBody>
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
