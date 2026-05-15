import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useParams, useNavigate } from 'react-router-dom';
import { ticketsApi, adminApi, interventionReportsApi } from '../../api/endpoints';
import { api } from '../../api/client';
import { useAuthStore } from '../../stores/authStore';
import { StatusBadge, PriorityBadge, GradeBadge } from '../../components/Badge';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from '../../components/ui/Dialog';
import { Input, Textarea, Select, Label } from '../../components/ui/Input';
import { LoadingScreen } from '../../components/Spinner';
import { toast } from '../../components/Toast';
import { Icons, Icon } from '../../components/Icons';
import { AvailabilityIndicator } from '../../components/AvailabilityIndicator';
import { formatDate, formatRelative, initials } from '../../utils/format';
import { STATUS_LABELS, ROLE_LABELS, CHANNEL_LABELS, TYPE_LABELS, IMPACT_LABELS, URGENCY_LABELS, AVAILABILITY_LABELS } from '../../utils/enums';

export default function TicketDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [transitions, setTransitions] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [modal, setModal] = useState(null);
  const [resolution, setResolution] = useState('');
  const [escalateReason, setEscalateReason] = useState('');
  const [rating, setRating] = useState(5);
  const [satCmt, setSatCmt] = useState('');
  const [categories, setCategories] = useState([]);
  const [declareNote, setDeclareNote] = useState('');
  const [complaintImages, setComplaintImages] = useState([]);
  const [reopenReason, setReopenReason] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [techResolution, setTechResolution] = useState('RESOLVED');
  const [techNote, setTechNote] = useState('');
  const [userRejectNote, setUserRejectNote] = useState('');
  const [reportDescription, setReportDescription] = useState('');
  const [reportFiles, setReportFiles] = useState([]);
  const [submittingReport, setSubmittingReport] = useState(false);
  const editForm = useForm();

  const load = () => {
    setLoading(true);
    ticketsApi.get(id).then(async (t) => {
      setTicket(t);
      const { transitions } = await ticketsApi.allowedTransitions(t.status);
      setTransitions(transitions);
    }).catch(() => toast.error('Ticket introuvable')).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);
  useEffect(() => {
    if (['ADMIN', 'TECHNICIAN'].includes(user?.role)) {
      adminApi.users.list({ limit: 100 }).then((r) =>
        setTechnicians((r.items || []).filter(u => u.role === 'TECHNICIAN')),
      ).catch(() => {});
    }
    adminApi.categories.list().then(setCategories).catch(() => {});
  }, [user?.role]);

  if (loading || !ticket) return <LoadingScreen />;

  const isAdmin = user.role === 'ADMIN';
  const isTech  = user.role === 'TECHNICIAN';
  const isOwner = ticket.requesterId === user.id;
  const isAssignedTech = isTech && ticket.assigneeId === user.id;

  // === Permissions UI ===
  // ADMIN : workflow (statut, assigner, escalader) MAIS PAS edit/delete
  // USER (owner)  : peut éditer & supprimer son ticket SI encore OPEN
  // USER (owner)  : peut rouvrir et évaluer un ticket DONE
  // TECH (assigné): déclare résolu / non résolu si IN_PROGRESS
  const canEvaluate = isOwner && ticket.status === 'DONE' && !ticket.satisfaction;
  const canReopen   = (isOwner || isAdmin) && ticket.status === 'DONE';
  const canEdit     = isOwner && ticket.status === 'OPEN';
  const canCancel   = isOwner && ticket.status === 'OPEN';
  const canComment  = isAdmin || isOwner || isAssignedTech;
  // Flux validation à 2 étapes :
  //  - Tech assigné peut déclarer 'RESOLVED' / 'NOT_RESOLVED' pendant IN_PROGRESS tant que rien n'est déclaré
  //  - Si tech a déclaré 'RESOLVED' : USER doit confirmer la résolution ou signaler que le problème persiste
  //  - Si rien n'est encore déclaré : USER conserve l'option de marquer résolu / signaler problème non résolu en direct
  const canTechDeclare = isAssignedTech && ticket.status === 'IN_PROGRESS' && !ticket.techResolution;
  const canUserConfirm = isOwner && ticket.status === 'IN_PROGRESS' && ticket.techResolution === 'RESOLVED' && !ticket.userConfirmation;
  const canUserResolve = isOwner && ticket.status === 'IN_PROGRESS' && !ticket.techResolution;

  // Rapport d'intervention : un seul par ticket, rédigé par le technicien assigné.
  // Backend bloque toute clôture (DONE) sans rapport.
  const interventionReport = ticket.interventionReport || null;
  const canCreateReport = (isAssignedTech || isAdmin) && !interventionReport && ticket.status !== 'CANCELLED';

  // === Actions ===
  const doStatus = async (status) => {
    try {
      const note = status === 'DONE' ? resolution : undefined;
      await ticketsApi.changeStatus(id, status, note);
      toast.success(`Statut → ${STATUS_LABELS[status]}`);
      setModal(null); setResolution('');
      load();
    } catch (e) { toast.error(e.response?.data?.error?.message || 'Erreur'); }
  };

  const doAssign = async (assigneeId) => {
    try {
      await ticketsApi.assign(id, assigneeId);
      toast.success('Ticket assigné');
      setModal(null); load();
    } catch (e) { toast.error(e.response?.data?.error?.message || 'Erreur'); }
  };

  const doEscalate = async () => {
    try {
      await ticketsApi.escalate(id, 'ADMIN', escalateReason);
      toast.success('Escaladé');
      setModal(null); setEscalateReason('');
      load();
    } catch (e) { toast.error(e.response?.data?.error?.message || 'Erreur'); }
  };

  const doComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    try {
      await ticketsApi.addComment(id, comment, isInternal);
      setComment(''); setIsInternal(false);
      load();
    } catch (err) { toast.error(err.response?.data?.error?.message || 'Erreur'); }
  };

  // USER marque son ticket comme résolu => statut DONE, tech + admin notifiés.
  const doUserMarkResolved = async () => {
    try {
      await ticketsApi.userMarkResolved(id, declareNote);
      toast.success('Ticket marqué comme résolu.');
      setModal(null); setDeclareNote(''); load();
    } catch (e) { toast.error(e.response?.data?.error?.message || 'Erreur'); }
  };

  // USER signale un problème non résolu => crée une réclamation avec description + images.
  const doCreateComplaint = async () => {
    if (!declareNote || declareNote.trim().length < 3) {
      toast.error('Description requise (min 3 caractères)');
      return;
    }
    try {
      await ticketsApi.createComplaint(id, declareNote, complaintImages);
      toast.success('Réclamation envoyée à l\'administrateur.');
      setModal(null); setDeclareNote(''); setComplaintImages([]); load();
    } catch (e) { toast.error(e.response?.data?.error?.message || 'Erreur'); }
  };

  const onComplaintImagesChange = (e) => {
    const list = Array.from(e.target.files || []).slice(0, 5);
    setComplaintImages(list);
  };

  const onReportFilesChange = (e) => {
    const list = Array.from(e.target.files || []).slice(0, 5);
    setReportFiles(list);
  };

  // Technicien dépose son rapport d'intervention (obligatoire avant clôture).
  const doCreateReport = async () => {
    if (!reportDescription || reportDescription.trim().length < 3) {
      toast.error('Description requise (min 3 caractères)');
      return;
    }
    setSubmittingReport(true);
    try {
      await interventionReportsApi.create(id, reportDescription, reportFiles);
      toast.success('Rapport d\'intervention enregistré.');
      setModal(null);
      setReportDescription('');
      setReportFiles([]);
      load();
    } catch (e) {
      toast.error(e.response?.data?.error?.message || 'Erreur');
    } finally {
      setSubmittingReport(false);
    }
  };

  const openEdit = () => {
    editForm.reset({
      title: ticket.title, description: ticket.description, type: ticket.type,
      impact: ticket.impact, urgency: ticket.urgency, categoryId: ticket.categoryId || '',
    });
    setModal('edit');
  };

  const doEdit = async (data) => {
    try {
      await ticketsApi.update(id, { ...data, categoryId: data.categoryId || null });
      toast.success('Ticket mis à jour');
      setModal(null); load();
    } catch (e) { toast.error(e.response?.data?.error?.message || 'Erreur'); }
  };

  const doTechDeclare = async () => {
    if (techResolution === 'NOT_RESOLVED' && techNote.trim().length < 3) {
      toast.error('Une explication est requise (min 3 caractères) pour signaler que le problème n\'est pas résolu.');
      return;
    }
    try {
      await ticketsApi.techDeclare(id, techResolution, techNote || null);
      toast.success(techResolution === 'RESOLVED' ? 'Résolution déclarée — en attente de confirmation du demandeur.' : 'Non-résolution signalée à l\'administrateur.');
      setModal(null); setTechNote(''); setTechResolution('RESOLVED'); load();
    } catch (e) { toast.error(e.response?.data?.error?.message || 'Erreur'); }
  };

  const doUserConfirm = async () => {
    try {
      await ticketsApi.userConfirm(id, 'CONFIRMED', null);
      toast.success('Résolution confirmée. Pensez à laisser votre avis.');
      setModal(null); load();
    } catch (e) { toast.error(e.response?.data?.error?.message || 'Erreur'); }
  };

  const doUserReject = async () => {
    if (userRejectNote.trim().length < 3) {
      toast.error('Veuillez décrire ce qui ne fonctionne toujours pas (min 3 caractères).');
      return;
    }
    try {
      await ticketsApi.userConfirm(id, 'REJECTED', userRejectNote);
      toast.success('Le technicien et l\'administrateur ont été notifiés.');
      setModal(null); setUserRejectNote(''); load();
    } catch (e) { toast.error(e.response?.data?.error?.message || 'Erreur'); }
  };

  const doReopen = async () => {
    if (reopenReason.trim().length < 3) {
      toast.error('Justification requise (min 3 caractères)');
      return;
    }
    try {
      await ticketsApi.reopen(id, reopenReason);
      toast.success('Ticket rouvert');
      setModal(null); setReopenReason(''); load();
    } catch (e) { toast.error(e.response?.data?.error?.message || 'Erreur'); }
  };

  const doCancel = async () => {
    if (cancelReason.trim().length < 3) {
      toast.error('Raison requise (min 3 caractères)');
      return;
    }
    try {
      await ticketsApi.cancel(id, cancelReason);
      toast.success('Ticket annulé');
      setModal(null); setCancelReason(''); load();
    } catch (e) { toast.error(e.response?.data?.error?.message || 'Erreur'); }
  };

  const doSatisfaction = async () => {
    try {
      await ticketsApi.submitSatisfaction(id, rating, satCmt);
      toast.success('Merci pour votre retour'); setModal(null); load();
    } catch (e) { toast.error(e.response?.data?.error?.message || 'Erreur'); }
  };

  const downloadAttachment = async (a) => {
    try {
      const r = await api.get(`/tickets/${id}/attachments/${a.id}`, { responseType: 'blob' });
      const url = URL.createObjectURL(r.data);
      const link = document.createElement('a');
      link.href = url; link.download = a.filename; link.click();
      URL.revokeObjectURL(url);
    } catch (e) { toast.error('Téléchargement impossible'); }
  };

  // Mapping statut -> icône / variante du bouton admin
  const statusActionConfig = {
    IN_PROGRESS: { icon: Icons.clock,   variant: 'outline', label: 'En cours' },
    DONE:        { icon: Icons.check,   variant: 'outline', label: 'Terminé' },
    CANCELLED:   { icon: Icons.close,   variant: 'outline', label: 'Annulé' },
    OPEN:        { icon: Icons.reopen,  variant: 'outline', label: 'Rouvrir' },
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      <button onClick={() => navigate('/tickets')} className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5">
        <Icon glyph={Icons.back} size="sm" /> Retour à la liste
      </button>

      {/* En-tête ticket */}
      <Card>
        <div className="p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
                <span className="font-mono normal-case">{ticket.number}</span>
                <span>·</span><span>{CHANNEL_LABELS[ticket.channel]}</span>
                <span>·</span><span>{TYPE_LABELS[ticket.type]}</span>
              </div>
              <h1 className="text-xl">{ticket.title}</h1>
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <StatusBadge status={ticket.status} />
                <PriorityBadge priority={ticket.priority} />
                <GradeBadge grade={ticket.grade} />
                {ticket.slaBreached && <Badge variant="destructive"><Icon glyph={Icons.warning} size={11} /> SLA dépassé</Badge>}
              </div>
            </div>
            <div className="text-right text-xs text-muted-foreground space-y-0.5 shrink-0">
              <div>Créé le {formatDate(ticket.createdAt)}</div>
              {ticket.dueResolutionAt && <div>Résolution {formatRelative(ticket.dueResolutionAt)}</div>}
            </div>
          </div>

          <ProgressStepper ticket={ticket} />
        </div>

        {/* Barre d'actions - séparée par rôle */}
        {(isAdmin || canTechDeclare || canUserConfirm || canUserResolve || canReopen || canEvaluate || canEdit || canCancel || canCreateReport) && (
          <div className="px-5 py-3 border-t border-border bg-muted/30 flex flex-wrap gap-2">

            {/* TECH (ou ADMIN) : rédiger le rapport d'intervention (obligatoire avant clôture) */}
            {canCreateReport && (
              <Button variant="default" size="sm"
                onClick={() => { setReportDescription(''); setReportFiles([]); setModal('intervention-report'); }}>
                <Icon glyph={Icons.edit} size="sm" /> Rédiger le rapport d'intervention
              </Button>
            )}

            {/* === ADMIN : workflow (statut, assigner) === */}
            {isAdmin && transitions.map((s) => {
              const cfg = statusActionConfig[s] || { icon: Icons.chevronRight, variant: 'outline', label: STATUS_LABELS[s] };
              return (
                <Button key={s} variant={cfg.variant} size="sm"
                  onClick={() => s === 'DONE' ? setModal('resolve') : doStatus(s)}>
                  <Icon glyph={cfg.icon} size="sm" /> {cfg.label}
                </Button>
              );
            })}
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={() => setModal('assign')}>
                <Icon glyph={Icons.assign} size="sm" /> Assigner
              </Button>
            )}

            {/* === USER (créateur) === */}
            {canEdit && (
              <Button variant="outline" size="sm" onClick={openEdit}>
                <Icon glyph={Icons.edit} size="sm" /> Modifier
              </Button>
            )}
            {canCancel && (
              <Button variant="danger" size="sm" onClick={() => setModal('cancel')}>
                <Icon glyph={Icons.close} size="sm" /> Annuler le ticket
              </Button>
            )}
            {/* TECH assigné : déclare la résolution (ou son impossibilité) */}
            {canTechDeclare && (
              <Button variant="default" size="sm" onClick={() => { setTechResolution('RESOLVED'); setTechNote(''); setModal('tech-declare'); }}>
                <Icon glyph={Icons.success} size="sm" /> Déclarer la résolution
              </Button>
            )}

            {/* USER : APRÈS déclaration tech RESOLVED -> doit valider */}
            {canUserConfirm && (
              <>
                <Button variant="default" size="sm" onClick={() => setModal('user-confirm')}>
                  <Icon glyph={Icons.success} size="sm" /> Confirmer la résolution
                </Button>
                <Button variant="outline" size="sm" onClick={() => setModal('user-reject')}>
                  <Icon glyph={Icons.warning} size="sm" /> Le problème persiste
                </Button>
              </>
            )}

            {/* USER : AVANT déclaration tech -> peut décider en direct */}
            {canUserResolve && (
              <>
                <Button variant="default" size="sm" onClick={() => setModal('user-resolved')}>
                  <Icon glyph={Icons.success} size="sm" /> Marquer comme résolu
                </Button>
                <Button variant="outline" size="sm" onClick={() => setModal('declare-not-resolved')}>
                  <Icon glyph={Icons.warning} size="sm" /> Signaler problème non résolu
                </Button>
              </>
            )}
            {canReopen && (
              <Button variant="outline" size="sm" onClick={() => setModal('reopen')}>
                <Icon glyph={Icons.reopen} size="sm" /> Rouvrir
              </Button>
            )}
            {canEvaluate && (
              <Button variant="default" size="sm" onClick={() => setModal('satisfaction')}>
                <Icon glyph={Icons.star} size="sm" /> Évaluer
              </Button>
            )}
          </div>
        )}
      </Card>

      {/* Bandeau USER : le tech a déclaré RESOLVED, en attente de validation */}
      {canUserConfirm && (
        <Card className="border-l-4 border-l-primary bg-primary/[0.03]">
          <div className="p-5">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Icon glyph={Icons.success} size="md" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-foreground">Le technicien indique que le problème est résolu</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {ticket.assignee?.firstName} {ticket.assignee?.lastName} a déclaré la résolution
                  {ticket.techResolvedAt && ` ${formatRelative(ticket.techResolvedAt)}`}.
                  Merci de confirmer que tout fonctionne, ou de signaler que le problème persiste.
                </p>
                {ticket.techResolutionNote && (
                  <div className="mt-3 p-3 bg-card border border-border rounded-lg text-sm text-foreground/90 whitespace-pre-wrap">
                    <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Solution apportée</div>
                    {ticket.techResolutionNote}
                  </div>
                )}
                <div className="flex flex-wrap gap-2 mt-4">
                  <Button onClick={() => setModal('user-confirm')}>
                    <Icon glyph={Icons.success} size="sm" /> Confirmer la résolution
                  </Button>
                  <Button variant="outline" onClick={() => setModal('user-reject')}>
                    <Icon glyph={Icons.warning} size="sm" /> Le problème persiste
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* === Colonne principale === */}
        <div className="lg:col-span-2 space-y-5">
          <Card>
            <CardHeader><CardTitle>Description</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{ticket.description}</p>
              {ticket.resolutionNote && (
                <div className="mt-4 p-3.5 bg-success-subtle border border-success/30 rounded-lg">
                  <div className="flex items-center gap-2 text-success mb-1">
                    <Icon glyph={Icons.success} size="sm" />
                    <span className="text-[11px] font-semibold uppercase tracking-wider">Solution apportée</span>
                  </div>
                  <p className="text-sm text-foreground/90 whitespace-pre-wrap">{ticket.resolutionNote}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pièces jointes */}
          {ticket.attachments?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>
                  <Icon glyph={Icons.attach} size="sm" className="text-muted-foreground" />
                  Pièces jointes
                  <span className="text-xs font-normal text-muted-foreground ml-1">({ticket.attachments.length})</span>
                </CardTitle>
              </CardHeader>
              <ul className="divide-y divide-border">
                {ticket.attachments.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors">
                    <div className="w-9 h-9 rounded-md bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                      <Icon glyph={Icons.attach} size="sm" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-foreground truncate">{a.filename}</div>
                      <div className="text-xs text-muted-foreground">
                        {(a.size / 1024).toFixed(1)} Ko · {formatRelative(a.createdAt)}
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => downloadAttachment(a)}>
                      Télécharger
                    </Button>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          {/* Échanges */}
          <Card>
            <CardHeader>
              <CardTitle>
                <Icon glyph={Icons.comment} size="sm" className="text-muted-foreground" />
                Échanges
                <span className="text-xs font-normal text-muted-foreground ml-1">({ticket.comments?.length || 0})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 mb-4 max-h-[420px] overflow-y-auto">
                {(ticket.comments || []).map((c) => (
                  <div key={c.id} className="flex gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0 ${c.isInternal ? 'bg-warning-subtle text-warning' : 'bg-info-subtle text-info'}`}>
                      {initials(c.author?.firstName, c.author?.lastName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <span className="font-medium text-foreground">{c.author?.firstName} {c.author?.lastName}</span>
                        <span>·</span><span>{ROLE_LABELS[c.author?.role]}</span>
                        <span>·</span><span>{formatRelative(c.createdAt)}</span>
                        {c.isInternal && <Badge variant="warning">Interne</Badge>}
                      </div>
                      <div className="text-sm text-foreground/90 whitespace-pre-wrap bg-muted/40 border border-border rounded-lg px-3 py-2">{c.body}</div>
                    </div>
                  </div>
                ))}
                {(!ticket.comments || ticket.comments.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-6">Aucun commentaire pour l'instant.</p>
                )}
              </div>

              {canComment && (
                <form onSubmit={doComment} className="space-y-2 pt-3 border-t border-border">
                  <Textarea placeholder="Ajouter un commentaire…" value={comment} onChange={(e) => setComment(e.target.value)} />
                  <div className="flex items-center justify-between">
                    {(isAdmin || isAssignedTech) ? (
                      <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        <input type="checkbox" checked={isInternal} onChange={(e) => setIsInternal(e.target.checked)} />
                        Commentaire interne (invisible pour l'utilisateur)
                      </label>
                    ) : <span />}
                    <Button type="submit" disabled={!comment.trim()}>
                      <Icon glyph={Icons.send} size="sm" /> Envoyer
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Historique */}
          {ticket.history?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>
                  <Icon glyph={Icons.clock} size="sm" className="text-muted-foreground" />
                  Historique
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-xs">
                  {ticket.history.map((h) => (
                    <li key={h.id} className="flex gap-3 text-muted-foreground">
                      <span className="text-muted-foreground/70 font-mono w-36 shrink-0">{formatDate(h.createdAt)}</span>
                      <span><b className="text-foreground">{h.field}</b> : {h.oldValue || '∅'} → {h.newValue}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Escalades */}
          {ticket.escalations?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>
                  <Icon glyph={Icons.escalate} size="sm" className="text-muted-foreground" />
                  Escalades
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm">
                  {ticket.escalations.map((e) => (
                    <li key={e.id} className="border-l-2 border-warning pl-3">
                      <div className="text-xs text-muted-foreground">{formatDate(e.createdAt)} · {e.isAuto ? 'Auto' : 'Manuelle'}</div>
                      <div>{ROLE_LABELS[e.fromLevel] || '—'} → <b>{ROLE_LABELS[e.toLevel]}</b></div>
                      <div className="text-muted-foreground mt-1">{e.reason}</div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        {/* === Colonne latérale === */}
        <aside className="space-y-5">

          {/* Rapport d'intervention (visible par tech assigné, admin, ou demandeur) */}
          {interventionReport && (isAdmin || isAssignedTech || isOwner) && (
            <Card className="border-l-4 border-l-primary">
              <CardHeader>
                <CardTitle>
                  <Icon glyph={Icons.attach} size="sm" className="text-primary" />
                  Rapport d'intervention
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5 text-sm">
                <p className="text-foreground/90 whitespace-pre-wrap bg-muted/40 border border-border rounded-lg px-3 py-2">
                  {interventionReport.description}
                </p>
                {interventionReport.files?.length > 0 && (
                  <ul className="space-y-1">
                    {interventionReport.files.map((f) => (
                      <li key={f.id}>
                        <button type="button"
                           onClick={() => interventionReportsApi.openFile(interventionReport.id, f.id).catch(() => toast.error('Ouverture impossible'))}
                           className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
                          <Icon glyph={Icons.attach} size="xs" />
                          {f.filename}
                          <span className="text-muted-foreground">({(f.size / 1024).toFixed(1)} Ko)</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="text-xs text-muted-foreground">
                  Déposé {formatRelative(interventionReport.createdAt)}
                  {interventionReport.technician && ` par ${interventionReport.technician.firstName} ${interventionReport.technician.lastName}`}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Alerte si tech assigné sans rapport encore */}
          {!interventionReport && isAssignedTech && ticket.status !== 'CANCELLED' && (
            <Card className="border-l-4 border-l-warning bg-warning-subtle/40">
              <CardContent className="text-sm py-4">
                <p className="text-foreground/90">
                  <Icon glyph={Icons.warning} size="sm" className="text-warning inline" />
                  {' '}Aucun rapport déposé pour ce ticket. Le rapport est obligatoire avant toute clôture.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Déclaration du technicien (historique seulement) */}
          {ticket.techResolution && (isAdmin || isAssignedTech) && (
            <Card className={`border-l-4 ${ticket.techResolution === 'RESOLVED' ? 'border-l-success' : 'border-l-warning'}`}>
              <CardHeader>
                <CardTitle>
                  <Icon glyph={ticket.techResolution === 'RESOLVED' ? Icons.success : Icons.warning}
                    size="sm" className={ticket.techResolution === 'RESOLVED' ? 'text-success' : 'text-warning'} />
                  Déclaration du technicien
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5 text-sm">
                <Badge variant={ticket.techResolution === 'RESOLVED' ? 'success' : 'warning'}>
                  {ticket.techResolution === 'RESOLVED' ? '✓ Résolu' : '⚠ Non résolu'}
                </Badge>
                {ticket.techResolutionNote && (
                  <p className="text-foreground/90 whitespace-pre-wrap bg-muted/40 border border-border rounded-lg px-3 py-2">
                    {ticket.techResolutionNote}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  Déclaré {formatRelative(ticket.techResolvedAt)} par {ticket.assignee?.firstName} {ticket.assignee?.lastName}
                </p>
                {isAdmin && (
                  <p className="text-xs text-primary pt-2 border-t border-border">
                    En attente de votre validation : utilisez les boutons de statut.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          <SidePanel title="Détails">
            <Row label="Demandeur" value={`${ticket.requester?.firstName} ${ticket.requester?.lastName}`} sub={ticket.requester?.email} />
            <Row label="Agence" value={ticket.agency?.name} />
            <Row label="Catégorie" value={ticket.category?.name || '—'} />
            <Row label="Type" value={TYPE_LABELS[ticket.type]} />
            <Row label="Impact" value={IMPACT_LABELS[ticket.impact]} />
            <Row label="Urgence" value={URGENCY_LABELS[ticket.urgency]} />
            <Row
              label="Assigné à"
              value={ticket.assignee
                ? <span className="inline-flex items-center gap-2">
                    <AvailabilityIndicator value={ticket.assignee.availability} size="lg" />
                    {ticket.assignee.firstName} {ticket.assignee.lastName}
                  </span>
                : '—'}
              sub={ticket.assignee
                ? `${ROLE_LABELS[ticket.assignee.role]}${ticket.assignee.availability ? ` · ${AVAILABILITY_LABELS[ticket.assignee.availability]}` : ''}`
                : null}
            />
          </SidePanel>

          <SidePanel title="SLA" icon={Icons.shield}>
            <Row label="Prise en charge" value={formatDate(ticket.dueResponseAt)} sub={ticket.takenChargeAt ? `Pris en charge ${formatRelative(ticket.takenChargeAt)}` : 'En attente'} />
            <Row label="Résolution" value={formatDate(ticket.dueResolutionAt)} sub={ticket.resolvedAt ? `Résolu ${formatRelative(ticket.resolvedAt)}` : null} />
          </SidePanel>

          {ticket.satisfaction && (
            <SidePanel title="Satisfaction" icon={Icons.star}>
              <div className="flex gap-0.5 mb-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Icon key={n} glyph={Icons.star} size="md"
                    className={n <= ticket.satisfaction.rating ? 'text-warning fill-warning' : 'text-border'} />
                ))}
              </div>
              {ticket.satisfaction.comment && <p className="text-sm text-foreground/80 mt-2">{ticket.satisfaction.comment}</p>}
            </SidePanel>
          )}
        </aside>
      </div>

      {/* === MODALS === */}

      {/* MODAL USER - marquer comme RÉSOLU */}
      <Dialog open={modal === 'user-resolved'} onClose={() => { setModal(null); setDeclareNote(''); }} size="md">
        <DialogHeader icon={<Icon glyph={Icons.success} size="md" />}
          description="Le ticket sera clôturé. Le technicien et l'administrateur seront notifiés."
          onClose={() => setModal(null)}>
          Confirmer la résolution
        </DialogHeader>
        <DialogBody>
          <Label>Commentaire (facultatif)</Label>
          <Textarea placeholder="Vos remarques sur la résolution…" value={declareNote} onChange={(e) => setDeclareNote(e.target.value)} className="min-h-[110px]" />
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => { setModal(null); setDeclareNote(''); }}>Annuler</Button>
          <Button onClick={doUserMarkResolved}><Icon glyph={Icons.check} size="sm" /> Marquer comme résolu</Button>
        </DialogFooter>
      </Dialog>

      {/* MODAL USER - signaler PROBLÈME NON RÉSOLU (crée une réclamation avec images) */}
      <Dialog open={modal === 'declare-not-resolved'} onClose={() => { setModal(null); setDeclareNote(''); setComplaintImages([]); }} size="lg">
        <DialogHeader icon={<Icon glyph={Icons.warning} size="md" />}
          description="Décrivez le problème en détail. Vous pouvez joindre des photos (max 5, PNG/JPG, 5 Mo chacune). L'administrateur examinera votre réclamation."
          onClose={() => setModal(null)}>
          Signaler un problème non résolu
        </DialogHeader>
        <DialogBody>
          <div className="space-y-4">
            <div>
              <Label required>Description du problème</Label>
              <Textarea
                placeholder="Expliquez pourquoi le ticket ne peut pas être résolu : symptômes, tentatives effectuées, blocages rencontrés…"
                value={declareNote}
                onChange={(e) => setDeclareNote(e.target.value)}
                className="min-h-[140px]"
              />
            </div>
            <div>
              <Label>Photos / captures d'écran (facultatif)</Label>
              <div className="flex items-center gap-3">
                <label className="btn-ghost cursor-pointer">
                  <Icon glyph={Icons.attach} size="sm" />
                  Choisir des images
                  <input type="file" multiple accept=".png,.jpg,.jpeg" className="hidden" onChange={onComplaintImagesChange} />
                </label>
                <span className="text-[11px] text-muted-foreground">PNG, JPG — max 5 images, 5 Mo chacune</span>
              </div>
              {complaintImages.length > 0 && (
                <ul className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {complaintImages.map((f, i) => (
                    <li key={i} className="relative group">
                      <div className="aspect-square bg-muted rounded-md overflow-hidden border border-border">
                        <img src={URL.createObjectURL(f)} alt={f.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-1 truncate">{f.name}</div>
                      <button type="button"
                        onClick={() => setComplaintImages(complaintImages.filter((_, idx) => idx !== i))}
                        className="absolute top-1 right-1 bg-background/90 border border-border rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Icon glyph={Icons.close} size="xs" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => { setModal(null); setDeclareNote(''); setComplaintImages([]); }}>Annuler</Button>
          <Button variant="default" onClick={doCreateComplaint}>
            <Icon glyph={Icons.send} size="sm" /> Envoyer la réclamation
          </Button>
        </DialogFooter>
      </Dialog>

      {/* MODAL Tech déclare RESOLVED / NOT_RESOLVED */}
      <Dialog open={modal === 'tech-declare'} onClose={() => { setModal(null); setTechNote(''); }} size="md">
        <DialogHeader icon={<Icon glyph={Icons.success} size="md" />}
          description="Si vous déclarez résolu, l'utilisateur recevra une notification pour confirmer. Si vous signalez non résolu, l'administrateur sera notifié pour reprise."
          onClose={() => { setModal(null); setTechNote(''); }}>
          Déclarer l'état de la résolution
        </DialogHeader>
        <DialogBody>
          <div className="space-y-3">
            <Label required>État</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label className={`flex items-start gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${techResolution === 'RESOLVED' ? 'border-success bg-success-subtle' : 'border-border hover:bg-accent'}`}>
                <input type="radio" className="mt-1" checked={techResolution === 'RESOLVED'} onChange={() => setTechResolution('RESOLVED')} />
                <div>
                  <div className="text-sm font-medium text-foreground">Résolu</div>
                  <div className="text-[11px] text-muted-foreground">Le ticket reste en cours jusqu'à validation de l'utilisateur.</div>
                </div>
              </label>
              <label className={`flex items-start gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${techResolution === 'NOT_RESOLVED' ? 'border-warning bg-warning-subtle' : 'border-border hover:bg-accent'}`}>
                <input type="radio" className="mt-1" checked={techResolution === 'NOT_RESOLVED'} onChange={() => setTechResolution('NOT_RESOLVED')} />
                <div>
                  <div className="text-sm font-medium text-foreground">Non résolu</div>
                  <div className="text-[11px] text-muted-foreground">L'administrateur sera notifié pour réaffectation.</div>
                </div>
              </label>
            </div>
            <Label required={techResolution === 'NOT_RESOLVED'}>
              {techResolution === 'RESOLVED' ? 'Solution apportée (facultatif)' : 'Explication'}
            </Label>
            <Textarea
              placeholder={techResolution === 'RESOLVED'
                ? 'Décrivez brièvement la solution apportée (sera visible par le demandeur)…'
                : 'Pourquoi le problème ne peut-il pas être résolu ?'}
              value={techNote}
              onChange={(e) => setTechNote(e.target.value)}
              className="min-h-[120px]"
            />
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => { setModal(null); setTechNote(''); }}>Annuler</Button>
          <Button onClick={doTechDeclare}><Icon glyph={Icons.send} size="sm" /> Envoyer la déclaration</Button>
        </DialogFooter>
      </Dialog>

      {/* MODAL USER confirme la résolution */}
      <Dialog open={modal === 'user-confirm'} onClose={() => setModal(null)} size="md">
        <DialogHeader icon={<Icon glyph={Icons.success} size="md" />}
          description="Le ticket sera clôturé. Vous pourrez ensuite laisser une évaluation."
          onClose={() => setModal(null)}>
          Confirmer la résolution
        </DialogHeader>
        <DialogBody>
          <p className="text-sm text-foreground/90">
            Vous confirmez que le problème est bien résolu par {ticket.assignee?.firstName} {ticket.assignee?.lastName} ?
          </p>
          {ticket.techResolutionNote && (
            <div className="mt-3 p-3 bg-muted/40 border border-border rounded-lg text-sm whitespace-pre-wrap">
              <div className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">Solution déclarée par le technicien</div>
              {ticket.techResolutionNote}
            </div>
          )}
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setModal(null)}>Annuler</Button>
          <Button onClick={doUserConfirm}><Icon glyph={Icons.check} size="sm" /> Oui, c'est résolu</Button>
        </DialogFooter>
      </Dialog>

      {/* MODAL USER signale que le problème persiste */}
      <Dialog open={modal === 'user-reject'} onClose={() => { setModal(null); setUserRejectNote(''); }} size="md">
        <DialogHeader icon={<Icon glyph={Icons.warning} size="md" />}
          description="Le technicien et l'administrateur seront notifiés. Le ticket restera en cours."
          onClose={() => { setModal(null); setUserRejectNote(''); }}>
          Le problème persiste
        </DialogHeader>
        <DialogBody>
          <Label required>Que se passe-t-il encore ?</Label>
          <Textarea
            placeholder="Décrivez précisément ce qui ne fonctionne toujours pas (symptôme, message d'erreur, étapes pour reproduire…)"
            value={userRejectNote}
            onChange={(e) => setUserRejectNote(e.target.value)}
            className="min-h-[130px]"
          />
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => { setModal(null); setUserRejectNote(''); }}>Annuler</Button>
          <Button variant="default" disabled={userRejectNote.trim().length < 3} onClick={doUserReject}>
            <Icon glyph={Icons.send} size="sm" /> Signaler
          </Button>
        </DialogFooter>
      </Dialog>

      {/* MODAL Rouvrir avec justification */}
      <Dialog open={modal === 'reopen'} onClose={() => { setModal(null); setReopenReason(''); }} size="md">
        <DialogHeader icon={<Icon glyph={Icons.reopen} size="md" />}
          description="Le ticket repassera en statut Ouvert. Le technicien assigné et l'administrateur seront notifiés."
          onClose={() => { setModal(null); setReopenReason(''); }}>
          Rouvrir le ticket
        </DialogHeader>
        <DialogBody>
          <Label required>Justification</Label>
          <Textarea
            placeholder="Pourquoi ce ticket doit-il être rouvert ? (symptôme qui persiste, solution incomplète…)"
            value={reopenReason}
            onChange={(e) => setReopenReason(e.target.value)}
            className="min-h-[120px]"
          />
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => { setModal(null); setReopenReason(''); }}>Annuler</Button>
          <Button disabled={reopenReason.trim().length < 3} onClick={doReopen}>
            <Icon glyph={Icons.reopen} size="sm" /> Rouvrir
          </Button>
        </DialogFooter>
      </Dialog>

      {/* MODAL Annuler le ticket (USER avant prise en charge) */}
      <Dialog open={modal === 'cancel'} onClose={() => { setModal(null); setCancelReason(''); }} size="md">
        <DialogHeader icon={<Icon glyph={Icons.close} size="md" />}
          description="Le ticket sera marqué comme annulé. Cette action est définitive."
          onClose={() => { setModal(null); setCancelReason(''); }}>
          Annuler le ticket
        </DialogHeader>
        <DialogBody>
          <Label required>Raison de l'annulation</Label>
          <Textarea
            placeholder="Pourquoi annulez-vous cette demande ? (doublon, résolu autrement, plus nécessaire…)"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            className="min-h-[110px]"
          />
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => { setModal(null); setCancelReason(''); }}>Retour</Button>
          <Button variant="danger" disabled={cancelReason.trim().length < 3} onClick={doCancel}>
            <Icon glyph={Icons.close} size="sm" /> Confirmer l'annulation
          </Button>
        </DialogFooter>
      </Dialog>

      {/* MODAL Marquer terminé */}
      <Dialog open={modal === 'resolve'} onClose={() => setModal(null)} size="md">
        <DialogHeader icon={<Icon glyph={Icons.check} size="md" />} description="Cette action clôture le ticket pour validation par l'utilisateur." onClose={() => setModal(null)}>
          Terminer le ticket
        </DialogHeader>
        <DialogBody>
          <Label>Note de résolution</Label>
          <Textarea value={resolution} onChange={(e) => setResolution(e.target.value)} className="min-h-[120px]" />
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setModal(null)}>Annuler</Button>
          <Button disabled={!resolution.trim()} onClick={() => doStatus('DONE')}>
            <Icon glyph={Icons.check} size="sm" /> Marquer terminé
          </Button>
        </DialogFooter>
      </Dialog>

      {/* MODAL Assignation */}
      <Dialog open={modal === 'assign'} onClose={() => setModal(null)} size="md">
        <DialogHeader icon={<Icon glyph={Icons.assign} size="md" />} onClose={() => setModal(null)}>
          Assigner le ticket à un technicien
        </DialogHeader>
        <DialogBody>
          <div className="space-y-1">
            {technicians.map((t) => (
              <button key={t.id}
                className="w-full text-left px-3 py-2.5 hover:bg-accent rounded-lg flex items-center gap-3 border border-transparent hover:border-border transition-colors"
                onClick={() => doAssign(t.id)}>
                <div className="relative">
                  <div className="w-9 h-9 rounded-full bg-info-subtle text-info flex items-center justify-center text-xs font-semibold">
                    {initials(t.firstName, t.lastName)}
                  </div>
                  {t.availability && <AvailabilityIndicator value={t.availability} size="lg" className="absolute -bottom-0.5 -right-0.5" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground">{t.firstName} {t.lastName}</div>
                  <div className="text-xs text-muted-foreground">
                    {ROLE_LABELS[t.role]}
                    {t.availability && ` · ${AVAILABILITY_LABELS[t.availability]}`}
                  </div>
                </div>
              </button>
            ))}
            {technicians.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">Aucun technicien disponible. Créez-en un dans Administration → Utilisateurs.</p>
            )}
          </div>
        </DialogBody>
      </Dialog>

      {/* MODAL Escalade */}
      <Dialog open={modal === 'escalate'} onClose={() => setModal(null)} size="md">
        <DialogHeader icon={<Icon glyph={Icons.escalate} size="md" />} description="Le ticket sera escaladé vers l'administration." onClose={() => setModal(null)}>
          Escalader le ticket
        </DialogHeader>
        <DialogBody>
          <Label required>Justification</Label>
          <Textarea placeholder="Expliquez pourquoi l'escalade est nécessaire…" value={escalateReason} onChange={(e) => setEscalateReason(e.target.value)} className="min-h-[100px]" />
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setModal(null)}>Annuler</Button>
          <Button disabled={escalateReason.length < 3} onClick={doEscalate}>
            <Icon glyph={Icons.escalate} size="sm" /> Escalader
          </Button>
        </DialogFooter>
      </Dialog>

      {/* MODAL Satisfaction */}
      <Dialog open={modal === 'satisfaction'} onClose={() => setModal(null)} size="md">
        <DialogHeader icon={<Icon glyph={Icons.star} size="md" />} onClose={() => setModal(null)}>
          Votre avis sur la résolution
        </DialogHeader>
        <DialogBody>
          <div className="flex justify-center gap-1 my-4">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => setRating(n)} aria-label={`Note ${n}`}>
                <Icon glyph={Icons.star} size="xl" className={n <= rating ? 'text-warning fill-warning' : 'text-border'} />
              </button>
            ))}
          </div>
          <Label>Commentaire (facultatif)</Label>
          <Textarea placeholder="Partagez votre expérience…" value={satCmt} onChange={(e) => setSatCmt(e.target.value)} />
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setModal(null)}>Annuler</Button>
          <Button onClick={doSatisfaction}><Icon glyph={Icons.send} size="sm" /> Envoyer</Button>
        </DialogFooter>
      </Dialog>

      {/* MODAL Rapport d'intervention (technicien) */}
      <Dialog open={modal === 'intervention-report'} onClose={() => { setModal(null); setReportDescription(''); setReportFiles([]); }} size="lg">
        <DialogHeader icon={<Icon glyph={Icons.edit} size="md" />}
          description="Décrivez l'intervention réalisée."
          onClose={() => { setModal(null); setReportDescription(''); setReportFiles([]); }}>
          Rapport d'intervention
        </DialogHeader>
        <DialogBody>
          <div className="space-y-4">
            <div>
              <Label required>Description / compte-rendu</Label>
              <Textarea
                placeholder="Diagnostic, actions menées, pièces remplacées, observations, recommandations…"
                value={reportDescription}
                onChange={(e) => setReportDescription(e.target.value)}
                className="min-h-[160px]"
              />
            </div>
            <div>
              <Label>Fichiers joints (facultatif)</Label>
              <div className="flex items-center gap-3">
                <label className="btn-ghost cursor-pointer">
                  <Icon glyph={Icons.attach} size="sm" />
                  Choisir des fichiers
                  <input type="file" multiple accept=".pdf,.docx,.doc,.png,.jpg,.jpeg" className="hidden" onChange={onReportFilesChange} />
                </label>
                <span className="text-[11px] text-muted-foreground">PDF, DOCX, PNG, JPG — max 5, 10 Mo chacun</span>
              </div>
              {reportFiles.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {reportFiles.map((f, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm bg-muted/40 border border-border rounded-md px-3 py-1.5">
                      <Icon glyph={Icons.attach} size="sm" className="text-muted-foreground" />
                      <span className="flex-1 truncate">{f.name}</span>
                      <span className="text-[11px] text-muted-foreground">{(f.size / 1024).toFixed(1)} Ko</span>
                      <button type="button"
                        onClick={() => setReportFiles(reportFiles.filter((_, idx) => idx !== i))}
                        className="text-muted-foreground hover:text-foreground">
                        <Icon glyph={Icons.close} size="xs" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => { setModal(null); setReportDescription(''); setReportFiles([]); }}>Annuler</Button>
          <Button variant="default" disabled={submittingReport || reportDescription.trim().length < 3} onClick={doCreateReport}>
            <Icon glyph={Icons.send} size="sm" /> {submittingReport ? 'Envoi…' : 'Enregistrer le rapport'}
          </Button>
        </DialogFooter>
      </Dialog>

      {/* MODAL édition (USER seulement, sur ses tickets OUVERT) */}
      <Dialog open={modal === 'edit'} onClose={() => setModal(null)} size="xl">
        <DialogHeader icon={<Icon glyph={Icons.edit} size="md" />} onClose={() => setModal(null)}>
          Modifier le ticket
        </DialogHeader>
        <DialogBody>
          <form className="space-y-4">
            <div>
              <Label required>Titre</Label>
              <Input maxLength={200} {...editForm.register('title', { required: true, minLength: 3 })} />
            </div>
            <div>
              <Label required>Description</Label>
              <Textarea {...editForm.register('description', { required: true, minLength: 3 })} className="min-h-[120px]" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select {...editForm.register('type')}>
                  {Object.entries(TYPE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </Select>
              </div>
              <div>
                <Label>Catégorie</Label>
                <Select {...editForm.register('categoryId')}>
                  <option value="">— Aucune —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.parent ? `${c.parent.name} › ` : ''}{c.name}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </form>
        </DialogBody>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setModal(null)}>Annuler</Button>
          <Button onClick={editForm.handleSubmit(doEdit)}>
            <Icon glyph={Icons.save} size="sm" /> Enregistrer
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}

function ProgressStepper({ ticket }) {
  const steps = [
    { key: 'OPEN',        label: 'Ouvert',     icon: Icons.plus  },
    { key: 'IN_PROGRESS', label: 'En cours',   icon: Icons.clock },
    { key: 'DONE',        label: 'Terminé',    icon: Icons.check },
  ];
  const order = { OPEN: 0, IN_PROGRESS: 1, DONE: 2 };

  if (ticket.status === 'CANCELLED') {
    return (
      <div className="mt-5 pt-4 border-t border-border flex items-center gap-2 text-sm text-muted-foreground">
        <div className="w-7 h-7 rounded-full bg-muted text-muted-foreground flex items-center justify-center">
          <Icon glyph={Icons.close} size="sm" />
        </div>
        <span>Ticket annulé{ticket.closedAt && ` · ${formatRelative(ticket.closedAt)}`}</span>
      </div>
    );
  }

  const currentIdx = order[ticket.status] ?? 0;

  return (
    <div className="mt-5 pt-4 border-t border-border">
      <ol className="flex items-center gap-1">
        {steps.map((s, i) => {
          const isDone    = i < currentIdx;
          const isCurrent = i === currentIdx;
          const circleCls = isDone
            ? 'bg-success text-success-foreground'
            : isCurrent
              ? 'bg-primary text-primary-foreground ring-4 ring-primary/15'
              : 'bg-muted text-muted-foreground';
          const lineCls = i < currentIdx ? 'bg-success' : 'bg-border';
          return (
            <li key={s.key} className="flex items-center flex-1 last:flex-none">
              <div className="flex items-center gap-2 shrink-0">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${circleCls}`}>
                  <Icon glyph={isDone ? Icons.check : s.icon} size="sm" />
                </div>
                <span className={`text-xs font-medium ${isCurrent ? 'text-foreground' : isDone ? 'text-foreground/80' : 'text-muted-foreground'}`}>
                  {s.label}
                </span>
              </div>
              {i < steps.length - 1 && <div className={`flex-1 h-0.5 mx-2 rounded-full ${lineCls}`} />}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function SidePanel({ title, icon, children }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {icon && <Icon glyph={icon} size="sm" className="text-muted-foreground" />}
          {title}
        </CardTitle>
      </CardHeader>
      <dl className="p-5 space-y-3 text-sm">{children}</dl>
    </Card>
  );
}

function Row({ label, value, sub }) {
  return (
    <div>
      <dt className="text-[11px] text-muted-foreground uppercase tracking-wider">{label}</dt>
      <dd className="text-foreground mt-0.5">{value}</dd>
      {sub && <dd className="text-xs text-muted-foreground">{sub}</dd>}
    </div>
  );
}
