import { useForm } from 'react-hook-form';
import { useNavigate, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { authApi } from '../../api/endpoints';
import { useAuthStore } from '../../stores/authStore';
import { Spinner } from '../../components/Spinner';
import { Icons, Icon } from '../../components/Icons';
import { Button } from '../../components/ui/Button';
import { Input, Label } from '../../components/ui/Input';
import logoGtsr from '../../images/imagegtsr.png';

export default function LoginPage() {
  const { register, handleSubmit, setValue, formState: { errors } } = useForm();
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showDemo, setShowDemo] = useState(false);
  const setSession = useAuthStore((s) => s.setSession);
  const navigate = useNavigate();
  const location = useLocation();

  const onSubmit = async (data) => {
    setErr(''); setLoading(true);
    try {
      const result = await authApi.login(data.email, data.password);
      setSession(result);
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    } catch (e) {
      setErr(e.response?.data?.error?.message || 'Identifiants invalides');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = () => {
    setValue('email', 'admin@gtsr.local');
    setValue('password', 'Admin@123');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden p-4">
      {/* Motif décoratif : grille de points en fond */}
      <div
        className="absolute inset-0 -z-0 opacity-[0.35]"
        style={{
          backgroundImage: 'radial-gradient(circle, hsl(var(--muted-foreground) / 0.15) 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          maskImage: 'radial-gradient(ellipse 80% 60% at 50% 50%, black 30%, transparent 80%)',
        }}
      />
      {/* Halos colorés */}
      <div className="absolute top-[-20%] left-[-10%] w-[400px] h-[400px] rounded-full bg-primary/10 blur-[120px] -z-0" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[400px] h-[400px] rounded-full bg-info/10 blur-[120px] -z-0" />

      <div className="relative z-10 w-full max-w-[420px]">
        {/* Logo + nom de l'app */}
        <div className="flex flex-col items-center mb-8">
            <img src={logoGtsr} alt="GTSR" className="w-60 h-40 rounded-lg object-contain" />
        </div>

        {/* Carte principale */}
        <div className="bg-card border border-border rounded-2xl shadow-xl shadow-foreground/5 overflow-hidden">
          <div className="p-7">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-foreground text-center">Connexion à votre espace</h2>
              <p className="text-sm text-muted-foreground mt-1">Entrez vos identifiants pour accéder à la plateforme.</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {/* Email */}
              <div>
                <Label htmlFor="email">Adresse e-mail</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70 pointer-events-none">
                    <Icon glyph={Icons.mail} size="sm" />
                  </span>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="prenom.nom@entreprise.com"
                    className="pl-9"
                    {...register('email', { required: 'E-mail requis' })}
                  />
                </div>
                {errors.email && <p className="text-xs text-destructive mt-1.5">{errors.email.message}</p>}
              </div>

              {/* Mot de passe */}
              <div>
                <div className="flex justify-between items-baseline">
                  <Label htmlFor="password">Mot de passe</Label>
                  <button type="button" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                    Oublié ?
                  </button>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/70 pointer-events-none">
                    <Icon glyph={Icons.lock} size="sm" />
                  </span>
                  <Input
                    id="password"
                    type={showPwd ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="pl-9 pr-9"
                    {...register('password', { required: 'Mot de passe requis' })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/70 hover:text-foreground p-1 rounded-md transition-colors"
                    aria-label={showPwd ? 'Cacher' : 'Afficher'}
                  >
                    <Icon glyph={showPwd ? Icons.eyeOff : Icons.eye} size="sm" />
                  </button>
                </div>
                {errors.password && <p className="text-xs text-destructive mt-1.5">{errors.password.message}</p>}
              </div>

              {/* Erreur globale */}
              {err && (
                <div className="bg-destructive/5 border border-destructive/20 text-destructive text-sm px-3 py-2 rounded-md flex items-start gap-2 animate-fade-in">
                  <Icon glyph={Icons.error} size="sm" className="mt-0.5 shrink-0" />
                  <span>{err}</span>
                </div>
              )}

              {/* Submit */}
              <Button type="submit" className="w-full h-10" disabled={loading}>
                {loading ? <Spinner size={16} /> : (
                  <>
                    Se connecter <Icon glyph={Icons.chevronRight} size="sm" />
                  </>
                )}
              </Button>
            </form>
          </div>

          {/* Section compte démo - séparée par bord */}
  
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-[11px] text-muted-foreground">
          <p className="mt-1">© {new Date().getFullYear()} GTSR. Tous droits réservés.</p>
        </div>
      </div>
    </div>
  );
}
