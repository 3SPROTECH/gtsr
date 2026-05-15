import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { notificationsApi } from '../../api/endpoints';
import { Spinner } from '../../components/Spinner';
import { Icons, Icon } from '../../components/Icons';
import { formatRelative } from '../../utils/format';

export default function NotificationsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    notificationsApi.list(false).then((d) => setItems(d.items || [])).finally(() => setLoading(false));
  };
  useEffect(load, []);

  const markAll = async () => { await notificationsApi.markAllRead(); load(); };
  const markOne = async (id) => { await notificationsApi.markRead(id); load(); };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div className="flex justify-between items-end">
        <div>
          <h1>Notifications</h1>
          <p className="text-sm text-slate-500 mt-0.5">{items.length} notification(s)</p>
        </div>
        <button className="btn-ghost" onClick={markAll}>
          <Icon glyph={Icons.checkAll} size="sm" /> Tout marquer comme lu
        </button>
      </div>

      {loading ? <div className="p-8 flex justify-center"><Spinner /></div> : (
        <div className="card">
          {items.length === 0 ? (
            <div className="p-16 text-center">
              <Icon glyph={Icons.bell} size="xl" className="text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Aucune notification.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {items.map((n) => (
                <li key={n.id} className={`p-4 flex gap-3 ${n.isRead ? '' : 'bg-brand-50/40'}`}>
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${n.isRead ? 'bg-slate-100 text-slate-500' : 'bg-brand-100 text-brand-700'}`}>
                    <Icon glyph={Icons.bell} size="md" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between gap-2">
                      <h3 className={n.isRead ? 'text-slate-700' : 'text-slate-900'}>{n.title}</h3>
                      <span className="text-[11px] text-slate-500 whitespace-nowrap shrink-0">{formatRelative(n.createdAt)}</span>
                    </div>
                    <p className="text-sm text-slate-600 mt-0.5">{n.body}</p>
                    <div className="mt-2 flex gap-3 text-[12px]">
                      {n.ticketId && (
                        <Link to={`/tickets/${n.ticketId}`} className="link inline-flex items-center gap-1">
                          Voir le ticket <Icon glyph={Icons.chevronRight} size="xs" />
                        </Link>
                      )}
                      {!n.isRead && (
                        <button className="text-slate-500 hover:text-slate-800 inline-flex items-center gap-1" onClick={() => markOne(n.id)}>
                          <Icon glyph={Icons.check} size="xs" /> Marquer lu
                        </button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
