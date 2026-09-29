import React, { useState } from 'react';
import { Shield, Tv, Lock, AlertCircle, ArrowRight, X } from 'lucide-react';

interface RoleSelectorProps {
  onSelectPlayer: () => void;
  onLoginAdmin: () => void;
}

export const RoleSelector: React.FC<RoleSelectorProps> = ({
  onSelectPlayer,
  onLoginAdmin,
}) => {
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = username.trim();
    const cleanPass = password.trim();

    if (cleanUser === 'ISP20' && cleanPass === 'sanjusto') {
      setErrorMsg('');
      setShowAdminModal(false);
      onLoginAdmin();
    } else {
      setErrorMsg('Credenciales inválidas. Verifica usuario y contraseña.');
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#070709] relative overflow-hidden">
      {/* Background ambient radial glow */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,_rgba(239,68,68,0.12)_0%,_transparent_70%)]" />

      <div className="relative z-10 w-full max-w-2xl bg-[#0f1016] border border-[#262836] rounded-xl shadow-2xl p-6 md:p-10 flex flex-col items-center gap-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-950/40 border border-red-800/50 text-red-400 text-xs uppercase tracking-widest font-semibold">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
            Sistema de Transmisión
          </div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-white tracking-wider uppercase">
            Estación // Escape Room
          </h1>
          <p className="text-sm text-slate-400 max-w-md mx-auto">
            Selecciona el modo de operación para iniciar la sesión de transmisión sincronizada y cronometraje de desafíos.
          </p>
        </div>

        {/* Action cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
          {/* Option 1: Player Mode */}
          <button
            onClick={(e) => {
              e.currentTarget.blur();
              onSelectPlayer();
            }}
            className="group text-left p-6 rounded-lg bg-[#141520] hover:bg-[#1a1b2a] border border-[#2b2d42] hover:border-red-500/60 transition-all duration-200 flex flex-col justify-between gap-6 cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500/50 shadow-lg hover:shadow-red-950/30"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-lg bg-red-950/50 border border-red-800/40 flex items-center justify-center text-red-400 group-hover:scale-105 transition-transform">
                <Tv className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white group-hover:text-red-400 transition-colors">
                  Modo Jugador
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Pantalla limpia e inmersiva exclusiva del cronómetro digital. Ideal para proyectar en TV o sala de escape.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold text-red-400 group-hover:translate-x-1 transition-transform">
              <span>Ingresar a pantalla completa</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </div>
          </button>

          {/* Option 2: Admin Mode */}
          <button
            onClick={(e) => {
              e.currentTarget.blur();
              setShowAdminModal(true);
              setErrorMsg('');
            }}
            className="group text-left p-6 rounded-lg bg-[#141520] hover:bg-[#1a1b2a] border border-[#2b2d42] hover:border-amber-500/60 transition-all duration-200 flex flex-col justify-between gap-6 cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-500/50 shadow-lg hover:shadow-amber-950/20"
          >
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-lg bg-amber-950/40 border border-amber-800/40 flex items-center justify-center text-amber-400 group-hover:scale-105 transition-transform">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white group-hover:text-amber-400 transition-colors">
                  Modo Administrador
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Panel maestro: control de audios, timeline, volúmenes, disparador de victorias y enlace a proyector.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 group-hover:translate-x-1 transition-transform">
              <span>Acceso restringido (Login)</span>
              <Lock className="w-3.5 h-3.5" />
            </div>
          </button>
        </div>

        {/* Footer info */}
        <div className="text-xs text-slate-400 text-center flex items-center gap-4">
          <span>Tiempo oficial: 15:00 min</span>
          <span className="text-slate-600">·</span>
          <span>4 Desafíos sincronizados</span>
          <span className="text-slate-600">·</span>
          <span>Audio envolvente & Ducking</span>
        </div>
      </div>

      {/* Admin Login Modal */}
      {showAdminModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-[#12131c] border border-[#2d3042] rounded-xl shadow-2xl p-6 md:p-8 space-y-6">
            {/* Modal header */}
            <div className="flex items-center justify-between pb-4 border-b border-[#222433]">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded bg-amber-950/50 text-amber-400 border border-amber-800/40">
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white font-display">
                    Autenticación Requerida
                  </h3>
                  <p className="text-xs text-slate-400">
                    Ingresa tus credenciales de operador
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAdminModal(false)}
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error badge */}
            {errorMsg && (
              <div className="p-3 rounded-lg bg-red-950/60 border border-red-800/60 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleAdminSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Usuario
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Ej: ISP20"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#0a0a0f] border border-[#2b2d42] text-white text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors placeholder:text-slate-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Contraseña
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 rounded-lg bg-[#0a0a0f] border border-[#2b2d42] text-white text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors placeholder:text-slate-600"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAdminModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white bg-[#1a1b26] hover:bg-[#222433] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg text-xs font-bold text-black bg-amber-400 hover:bg-amber-300 transition-colors flex items-center gap-1.5 shadow-lg shadow-amber-950/40"
                >
                  <span>Ingresar</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
