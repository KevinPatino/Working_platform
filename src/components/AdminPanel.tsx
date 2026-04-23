import React, { useState, useEffect } from 'react';
import { db, auth } from '../firebaseConfig';
import { collection, getDocs, query } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import Toast from './Toast';

interface AdminPanelProps {
  user: any;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'details'>('overview');
  const [allLogs, setAllLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  const [allRegisteredUsers, setAllRegisteredUsers] = useState<any[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, string>>({});

  const [selectedUser, setSelectedUser] = useState('Todos');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  const handleLogout = async () => {
    await signOut(auth);
  };

  const showNotification = (message: string) => {
    setToastMessage(message);
  };

  const fetchAllLogs = async () => {
    setLoading(true);
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersList: any[] = [];
      const map: Record<string, string> = {};
      
      usersSnapshot.forEach(doc => {
        const data = doc.data();
        // --- MAGIA AQUÍ: Ignoramos al usuario actual (El Administrador) ---
        if (data.email !== user.email) {
          map[doc.id] = data.fullName;
          usersList.push({ id: doc.id, fullName: data.fullName, email: data.email });
        }
      });
      
      // Orden Alfabético inicial
      usersList.sort((a, b) => a.fullName.localeCompare(b.fullName));
      setAllRegisteredUsers(usersList);
      setUsersMap(map);

      const q = query(collection(db, 'timeLogs'));
      const querySnapshot = await getDocs(q);
      
      const logsData: any[] = [];

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        // --- Ignoramos también si el admin metió horas por accidente alguna vez ---
        if (data.userEmail !== user.email) {
          logsData.push({ id: doc.id, ...data });
        }
      });

      setAllLogs(logsData);
    } catch (error: any) {
      showNotification("Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllLogs();
  }, []);

  const toggleRow = (userId: string) => {
    if (expandedUserId === userId) {
      setExpandedUserId(null); 
    } else {
      setExpandedUserId(userId); 
    }
  };

  const today = new Date();
  const todayLogs = allLogs.filter(log => {
    if (!log.timestamp) return false;
    const logDate = log.timestamp.toDate();
    return (
      logDate.getDate() === today.getDate() &&
      logDate.getMonth() === today.getMonth() &&
      logDate.getFullYear() === today.getFullYear()
    );
  });

  // --- FILTRADO Y ORDEN ALFABÉTICO ESTRICTO ---
  const filteredUsers = selectedUser === 'Todos' 
    ? allRegisteredUsers 
    : allRegisteredUsers.filter(worker => worker.id === selectedUser);

  const displayedUsers = [...filteredUsers].sort((a, b) => 
    a.fullName.localeCompare(b.fullName)
  );

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 relative">
      {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}

      <div className="max-w-6xl mx-auto space-y-6">
        
        <div className="bg-gray-900 rounded-xl p-6 shadow-lg flex justify-between items-center text-white">
          <h1 className="text-xl font-bold flex items-center gap-2">Admin Panel</h1>
          <button onClick={handleLogout} className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-bold transition-colors">
            Cerrar Sesión
          </button>
        </div>

        <div className="flex bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <button onClick={() => setActiveTab('overview')} className={`flex-1 py-4 text-sm font-bold text-center ${activeTab === 'overview' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' : 'text-gray-500'}`}>
            Registro del dia
          </button>
          <button onClick={() => setActiveTab('details')} className={`flex-1 py-4 text-sm font-bold text-center ${activeTab === 'details' ? 'bg-blue-50 text-blue-700 border-b-2 border-blue-600' : 'text-gray-500'}`}>
            Reportes e Historial
          </button>
        </div>

        {/* PESTAÑA 1 */}
        {activeTab === 'overview' && (
          <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden animate-fade-in">
            <div className="p-4 bg-gray-50 border-b">
              <h2 className="font-bold text-gray-700">Estatus</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-xs font-bold text-gray-400 uppercase tracking-wider border-b">
                  <tr>
                    <th className="p-4">Trabajador</th>
                    <th className="p-4">Estado</th>
                    <th className="p-4">Lugar de Trabajo</th>
                    <th className="p-4 text-center">Horas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr><td colSpan={4} className="p-8 text-center text-gray-400 animate-pulse">Cargando base de datos...</td></tr>
                  ) : [...allRegisteredUsers].sort((a,b) => a.fullName.localeCompare(b.fullName)).map(worker => {
                    const logToday = todayLogs.find(l => l.userId === worker.id);
                    const hasLogged = !!logToday;
                    return (
                      <tr key={worker.id} className="hover:bg-gray-50">
                        <td className="p-4"><p className="font-bold text-gray-800 text-sm">{worker.fullName}</p></td>
                        <td className="p-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${hasLogged ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {hasLogged ? 'Registrado' : 'Pendiente'}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-gray-600">{hasLogged ? logToday.location : '—'}</td>
                        <td className="p-4 text-center font-bold text-sm text-blue-600">{hasLogged ? `${logToday.totalHours}h` : '0h'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* PESTAÑA 2 */}
        {activeTab === 'details' && (
          <div className="space-y-6 animate-fade-in">
            
            <div className="bg-white p-5 rounded-xl shadow-md border border-gray-100 flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 w-full">
                <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Trabajador</label>
                <select 
                  value={selectedUser} 
                  onChange={(e) => { setSelectedUser(e.target.value); setExpandedUserId(null); }}
                  className="w-full p-3 border rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
                >
                  <option value="Todos">Todos los trabajadores</option>
                  {allRegisteredUsers.map(worker => (
                    <option key={worker.id} value={worker.id}>{worker.fullName}</option>
                  ))}
                </select>
              </div>

              <div className="flex-1 w-full">
                <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Día Específico / Desde</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full p-3 border rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div className="flex-1 w-full">
                <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Hasta (Opcional)</label>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full p-3 border rounded-lg text-sm bg-gray-50 focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <button 
                onClick={() => { setSelectedUser('Todos'); setStartDate(''); setEndDate(''); setExpandedUserId(null); }} 
                className="w-full md:w-auto px-6 py-3 text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Limpiar
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden">
              
              {!startDate && !endDate && (
                <div className="p-12 text-center flex flex-col items-center">
                  <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  <h3 className="text-lg font-bold text-gray-700">Selecciona una fecha</h3>
                  <p className="text-sm text-gray-500 mt-1 max-w-md">Elige un día en "Desde" para ver el detalle de esa jornada, o selecciona también "Hasta" para sumar la nómina.</p>
                </div>
              )}

              {startDate && !endDate && (
                <div className="overflow-x-auto">
                  <div className="p-4 bg-blue-50 border-b border-blue-100 text-blue-800 text-sm font-bold flex justify-between">
                    <span>Reporte del día: {new Date(startDate + 'T00:00:00').toLocaleDateString()}</span>
                    {selectedUser !== 'Todos' && <span className="text-blue-600">Filtrando por 1 trabajador</span>}
                  </div>
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 text-xs font-bold text-gray-400 uppercase tracking-wider border-b">
                      <tr>
                        <th className="p-4">Trabajador</th>
                        <th className="p-4">Estado</th>
                        <th className="p-4 text-center">Horas</th>
                        <th className="p-4 text-right">Detalles</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {displayedUsers.map(worker => {
                        const targetDate = new Date(startDate + 'T00:00:00');
                        const logForDay = allLogs.find(log => {
                          if (!log.timestamp) return false;
                          const d = log.timestamp.toDate();
                          return d.getDate() === targetDate.getDate() && d.getMonth() === targetDate.getMonth() && d.getFullYear() === targetDate.getFullYear() && log.userId === worker.id;
                        });
                        
                        const hasLogged = !!logForDay;
                        const isExpanded = expandedUserId === worker.id;

                        return (
                          <React.Fragment key={worker.id}>
                            <tr onClick={() => hasLogged && toggleRow(worker.id)} className={`transition-colors ${hasLogged ? 'hover:bg-gray-50 cursor-pointer' : ''}`}>
                              <td className="p-4 font-bold text-gray-800 text-sm">{worker.fullName}</td>
                              <td className="p-4">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${hasLogged ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                  {hasLogged ? 'Registrado' : 'Sin registro'}
                                </span>
                              </td>
                              <td className="p-4 text-center font-bold text-sm text-blue-600">{hasLogged ? `${logForDay.totalHours}h` : '-'}</td>
                              <td className="p-4 text-right">
                                {hasLogged && (
                                  <button className="text-gray-400 hover:text-blue-600 transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                                    <svg className="w-5 h-5 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                  </button>
                                )}
                              </td>
                            </tr>
                            {isExpanded && hasLogged && (
                              <tr className="bg-gray-50 border-b border-gray-200">
                                <td colSpan={4} className="p-0">
                                  <div className="p-6 text-sm text-gray-700 grid grid-cols-1 md:grid-cols-3 gap-4 shadow-inner">
                                    <div><p className="text-xs font-bold text-gray-400 uppercase">Obra / Ubicación</p><p className="font-semibold">{logForDay.location}</p></div>
                                    <div><p className="text-xs font-bold text-gray-400 uppercase">Horario</p><p className="font-semibold">{logForDay.checkIn} - {logForDay.checkOut}</p></div>
                                    <div><p className="text-xs font-bold text-gray-400 uppercase">Comentarios</p><p className="italic text-gray-600">"{logForDay.comments || 'Sin comentarios'}"</p></div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                      {displayedUsers.length === 0 && (
                        <tr><td colSpan={4} className="p-8 text-center text-gray-500">No se encontraron trabajadores.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {startDate && endDate && (
                <div className="overflow-x-auto">
                  <div className="p-4 bg-purple-50 border-b border-purple-100 text-purple-800 text-sm font-bold flex justify-between items-center">
                    <span>Resumen: {new Date(startDate + 'T00:00:00').toLocaleDateString()} al {new Date(endDate + 'T23:59:59').toLocaleDateString()}</span>
                    <span className="bg-purple-200 text-purple-900 px-3 py-1 rounded-full text-xs">Modo Calculadora</span>
                  </div>
                  <table className="w-full text-left">
                    <thead className="bg-gray-50 text-xs font-bold text-gray-400 uppercase tracking-wider border-b">
                      <tr>
                        <th className="p-4">Trabajador</th>
                        <th className="p-4 text-center">Horas Totales Acumuladas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {displayedUsers.map(worker => {
                        const start = new Date(startDate + 'T00:00:00').getTime();
                        const end = new Date(endDate + 'T23:59:59').getTime();
                        
                        const userLogsInRange = allLogs.filter(log => {
                          if (!log.timestamp || log.userId !== worker.id) return false;
                          const logTime = log.timestamp.toDate().getTime();
                          return logTime >= start && logTime <= end;
                        });

                        const totalWorkerHours = userLogsInRange.reduce((sum, log) => sum + (Number(log.totalHours) || 0), 0);

                        return (
                          <tr key={worker.id} className="hover:bg-gray-50">
                            <td className="p-4">
                              <p className="font-bold text-gray-800 text-sm">{worker.fullName}</p>
                              <p className="text-xs text-gray-400 text-purple-600">{userLogsInRange.length} días laborados</p>
                            </td>
                            <td className="p-4 text-center">
                              <span className={`text-xl font-black ${totalWorkerHours > 0 ? 'text-purple-600' : 'text-gray-300'}`}>
                                {totalWorkerHours}h
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                      {displayedUsers.length === 0 && (
                        <tr><td colSpan={2} className="p-8 text-center text-gray-500">No se encontraron trabajadores.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;