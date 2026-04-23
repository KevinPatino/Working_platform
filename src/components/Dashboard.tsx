import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebaseConfig';
import { signOut } from 'firebase/auth';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import Calendar from './Calendar';
import Toast from './Toast';

interface DashboardProps {
  user: any;
}

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'form' | 'history'>('form');

  // Estados del formulario
  const [location, setLocation] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [totalHours, setTotalHours] = useState('');
  const [comments, setComments] = useState('');

  // Estados de datos
  const [myLogs, setMyLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  
  // --- NUEVOS ESTADOS PARA EL CANDADO DE SEGURIDAD ---
  const [hasLoggedToday, setHasLoggedToday] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleLogout = async () => {
    await signOut(auth);
  };

  const showNotification = (message: string) => {
    setToastMessage(message);
  };

  const fetchMyLogs = async () => {
    setLoadingLogs(true);
    try {
      const q = query(collection(db, 'timeLogs'), where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      
      const logsData: any[] = [];
      let foundLogToday = false;
      const today = new Date();

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        logsData.push({ id: doc.id, ...data });

        // --- VERIFICACIÓN DE FECHA ---
        // Revisamos si el registro coincide con el día, mes y año de hoy
        if (data.timestamp) {
          const logDate = data.timestamp.toDate();
          if (
            logDate.getDate() === today.getDate() &&
            logDate.getMonth() === today.getMonth() &&
            logDate.getFullYear() === today.getFullYear()
          ) {
            foundLogToday = true;
          }
        }
      });

      // Ordenamos para el calendario
      logsData.sort((a, b) => {
        const timeA = a.timestamp?.toMillis() || 0;
        const timeB = b.timestamp?.toMillis() || 0;
        return timeB - timeA;
      });

      setHasLoggedToday(foundLogToday);
      setMyLogs(logsData);
    } catch (error: any) {
      console.error("Error al cargar historial: ", error);
    } finally {
      setLoadingLogs(false);
    }
  };

  // Ahora ejecutamos la búsqueda en cuanto el usuario entra a la app
  useEffect(() => {
    fetchMyLogs();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'timeLogs'), {
        userId: user.uid,
        userEmail: user.email,
        location: location,
        checkIn: checkIn,
        checkOut: checkOut,
        totalHours: Number(totalHours),
        comments: comments,
        timestamp: serverTimestamp()
      });
      
      showNotification('¡Registro guardado con éxito! ✅');
      
      setLocation('');
      setCheckIn('');
      setCheckOut('');
      setTotalHours('');
      setComments('');

      // --- ACTIVAMOS EL CANDADO INMEDIATAMENTE ---
      setHasLoggedToday(true);
      // Actualizamos los datos en segundo plano para que el calendario tenga el nuevo registro
      fetchMyLogs(); 

    } catch (error: any) {
      showNotification("Error: " + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 relative">
      
      {toastMessage && (
        <Toast 
          message={toastMessage} 
          onClose={() => setToastMessage(null)} 
        />
      )}

      <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden md:max-w-2xl">
        
        <div className="p-6 border-b flex justify-between items-center bg-gray-800 text-white">
          <div>
            <h1 className="text-xl font-bold">Portal del Trabajador</h1>
            <p className="text-xs text-gray-300">{user.email}</p>
          </div>
          <button onClick={handleLogout} className="px-3 py-1 bg-red-500 hover:bg-red-600 rounded text-sm font-semibold">Salir</button>
        </div>

        <div className="flex border-b">
          <button 
            onClick={() => setActiveTab('form')}
            className={`flex-1 py-3 text-sm font-semibold text-center transition-colors ${activeTab === 'form' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            Registrar Horas
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-3 text-sm font-semibold text-center transition-colors ${activeTab === 'history' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            Mi Calendario
          </button>
        </div>

        <div className="p-6">
          {/* VISTA 1: FORMULARIO O MENSAJE DE ÉXITO */}
          {activeTab === 'form' && (
            loadingLogs ? (
              <p className="text-center text-gray-500 py-8 animate-pulse">Verificando tus registros de hoy...</p>
            ) : hasLoggedToday ? (
              // --- EL NUEVO MENSAJE DE ÉXITO FIJO ---
              <div className="text-center py-10 px-4 bg-green-50 rounded-xl border border-green-200 shadow-inner animate-fade-in">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-green-800 mb-2">¡Jornada Registrada!</h2>
                <p className="text-gray-600 mb-4">
                  Gracias por registrar tus horas el día de hoy. Tu información ya está segura en el sistema.
                </p>
                <p className="text-sm font-semibold text-gray-500 bg-white inline-block px-4 py-2 rounded-full shadow-sm border border-gray-100">
                  Vuelve mañana para tu siguiente registro
                </p>
              </div>
            ) : (
              // --- EL FORMULARIO NORMAL ---
              <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lugar / Obra</label>
                  <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Entrada</label>
                    <input type="time" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Salida</label>
                    <input type="time" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Horas Totales</label>
                  <input type="number" step="0.5" value={totalHours} onChange={(e) => setTotalHours(e.target.value)} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Comentarios</label>
                  <textarea value={comments} onChange={(e) => setComments(e.target.value)} className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" rows={2} />
                </div>
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg mt-4 transition-colors">
                  Enviar Registro
                </button>
              </form>
            )
          )}

          {/* VISTA 2: CALENDARIO */}
          {activeTab === 'history' && (
            <div>
              {loadingLogs ? (
                <p className="text-center text-gray-500 py-8 animate-pulse">Cargando tu calendario...</p>
              ) : (
                <Calendar logs={myLogs} /> 
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};

export default Dashboard;