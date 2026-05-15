// Pattern unifié pour toutes les icônes de l'application.
// Tous les composants importent depuis ce fichier — jamais directement depuis lucide-react.
// Cela permet d'imposer la même taille / strokeWidth / couleur partout.

import {
  // Layout / navigation
  LayoutDashboard, Ticket, Users, Building2, Tags,
  Bell, LogOut, ChevronRight, Menu, X,
  // Actions
  Plus, Search, Filter, RotateCcw, Pencil, Trash2, Save, Send, Check, CheckCheck,
  ArrowLeft, ArrowUpToLine, UserPlus, Eye, EyeOff,
  // Status / feedback
  AlertTriangle, AlertCircle, Info, CircleCheck, Loader2, Star,
  Clock, Calendar, Hourglass,
  // Domain
  ThumbsUp, ThumbsDown, MessageSquare, MessageCircle, Paperclip,
  ChevronDown, ChevronUp, FolderOpen, Folder,
  // Auth
  Mail, KeyRound, Lock, ShieldCheck,
  // Communication
  Phone, Globe, Smartphone, Bot, Code2,
} from 'lucide-react';

// Tailles standard (px)
const SIZES = { xs: 14, sm: 16, md: 18, lg: 22, xl: 28 };

// Composant générique : <Icon glyph={Plus} size="sm" />
export function Icon({ glyph: Glyph, size = 'sm', className = '', strokeWidth = 1.75, ...rest }) {
  const px = typeof size === 'number' ? size : SIZES[size] || SIZES.sm;
  return <Glyph size={px} strokeWidth={strokeWidth} className={className} aria-hidden="true" {...rest} />;
}

// Alias sémantiques (lisibles dans le code, mêmes proportions partout)
export const Icons = {
  dashboard: LayoutDashboard,
  ticket: Ticket,
  users: Users,
  agency: Building2,
  category: Tags,
  bell: Bell,
  logout: LogOut,

  plus: Plus,
  search: Search,
  filter: Filter,
  reset: RotateCcw,
  edit: Pencil,
  trash: Trash2,
  save: Save,
  send: Send,
  check: Check,
  checkAll: CheckCheck,
  back: ArrowLeft,
  escalate: ArrowUpToLine,
  assign: UserPlus,
  reopen: RotateCcw,
  close: X,
  eye: Eye,
  eyeOff: EyeOff,

  warning: AlertTriangle,
  error: AlertCircle,
  info: Info,
  success: CircleCheck,
  spinner: Loader2,
  star: Star,
  clock: Clock,
  calendar: Calendar,
  hourglass: Hourglass,

  thumbsUp: ThumbsUp,
  thumbsDown: ThumbsDown,
  comment: MessageSquare,
  chat: MessageCircle,
  attach: Paperclip,
  chevronRight: ChevronRight,
  chevronDown: ChevronDown,
  chevronUp: ChevronUp,
  folder: Folder,
  folderOpen: FolderOpen,

  mail: Mail,
  key: KeyRound,
  lock: Lock,
  shield: ShieldCheck,

  phone: Phone,
  web: Globe,
  mobile: Smartphone,
  bot: Bot,
  api: Code2,
  menu: Menu,
};

// Variante "bouton" qui aligne icône + label correctement (taille md, espacement)
export function IconButton({ icon: I, children, variant = 'ghost', size = 'md', className = '', ...rest }) {
  const cls = variant === 'primary' ? 'btn-primary' : variant === 'danger' ? 'btn-danger' : 'btn-ghost';
  const iconSize = size === 'sm' ? 14 : 16;
  return (
    <button type="button" className={`${cls} ${className}`} {...rest}>
      {I && <I size={iconSize} strokeWidth={1.75} aria-hidden="true" />}
      {children && <span>{children}</span>}
    </button>
  );
}
