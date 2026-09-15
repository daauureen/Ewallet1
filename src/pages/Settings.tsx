import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, LogOut, Check, AlertCircle } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { Spinner } from '@/components/Spinner';

export function Settings() {
  const { profile, user, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSubmitting(true);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ full_name: fullName.trim() })
      .eq('id', user?.id ?? '');
    setSubmitting(false);

    if (updateError) {
      setError(updateError.message);
    } else {
      await refreshProfile();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  }

  async function handleSignOut() {
    await signOut();
    navigate('/login');
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Настройки</h1>
        <p className="text-sm text-slate-500 mt-0.5">Управление профилем</p>
      </div>

      {/* Profile section */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center gap-3 mb-5">
          <div className="flex items-center justify-center w-12 h-12 rounded-full bg-emerald-100">
            <User className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <p className="font-semibold text-slate-900">Профиль</p>
            <p className="text-sm text-slate-400">{user?.email}</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Имя</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Ваше имя"
              className="w-full px-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {saved && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-50 text-emerald-700 text-sm">
              <Check className="w-4 h-4 mt-0.5 shrink-0" />
              <span>Имя обновлено</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-60 transition-colors"
          >
            {submitting ? <Spinner className="h-4 w-4" /> : <Check className="w-4 h-4" />}
            Сохранить
          </button>
        </form>
      </div>

      {/* Sign out */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-slate-900">Выйти из аккаунта</p>
            <p className="text-sm text-slate-400 mt-0.5">Завершить текущую сессию</p>
          </div>
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Выйти
          </button>
        </div>
      </div>
    </div>
  );
}
