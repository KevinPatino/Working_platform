import React from 'react';

interface HeaderProps {
  userName: string;
  role: string;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ userName, role, onLogout }) => {
  return (
    <div className="sticky top-0 z-40 w-full bg-gray-950/95 backdrop-blur-md rounded-xl p-6 shadow-xl flex justify-between items-center text-white border border-gray-800">
      <div>
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl font-bold">{userName || 'Loading...'}</h1>
          {role === 'admin' ? (
            <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-400/30 rounded-md">
              Admin
            </span>
          ) : role === 'teamlead' ? (
            <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded-md">
              Lead
            </span>
          ) : (
            <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-md">
              Worker
            </span>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-1 font-medium capitalize">
          {role} Portal
        </p>
      </div>
      <button
        onClick={onLogout}
        className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-bold transition-colors cursor-pointer"
      >
        Log Out
      </button>
    </div>
  );
};

export default Header;