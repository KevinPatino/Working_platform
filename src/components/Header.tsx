import React from 'react';
import { LogOut } from 'lucide-react';

interface HeaderProps {
  userName: string;
  role?: string;
  onLogout: () => void;
  subtitle?: string;
}

const Header: React.FC<HeaderProps> = ({ 
  userName, 
  role = 'worker', 
  onLogout,
  subtitle = 'Daily Field Portal'
}) => {
  const todayFormatted = new Date().toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  });

  const displayRole = role === 'teamlead' 
    ? 'TEAMLEAD' 
    : role === 'admin' 
    ? 'ADMIN' 
    : 'WORKER';

  return (
    <header className="sticky top-0 z-40 w-full bg-[#F4F6F9]/90 backdrop-blur-md border-b border-slate-200/70 px-4 py-3">
      <div className="max-w-lg md:max-w-4xl mx-auto flex items-center justify-between">
        {/* Izquierda: Fecha actual (Today, Sat, Oct 17) */}
        <div>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-base text-slate-900 tracking-tight">
              Today, {todayFormatted}
            </span>
          </div>
          <p className="text-xs font-semibold text-slate-400 pl-4.5">
            {role === 'admin' ? 'Admin Portal' : subtitle}
          </p>
        </div>

        {/* Derecha: Nombre + Rol en píldora + Botón Salir */}
        <div className="flex items-center gap-3">
          <div className="text-right flex flex-col items-end">
            <p className="text-sm font-bold text-slate-800 leading-tight">
              {userName ? userName : 'User'}
            </p>
            <span className="mt-0.5 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-slate-200/80 text-slate-700 rounded-full">
              {displayRole}
            </span>
          </div>
          <button
            onClick={onLogout}
            title="Log Out"
            className="w-10 h-10 rounded-full bg-[#8B4513] text-white flex items-center justify-center shadow-sm hover:bg-[#72380f] transition-colors cursor-pointer shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;