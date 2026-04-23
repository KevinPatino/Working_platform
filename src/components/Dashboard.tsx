import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebaseConfig';
import { signOut } from 'firebase/auth';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import Calendar from './Calendar'; // <-- ¡IMPORTAMOS NUESTRA NUEVA PIEZA!
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
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showNotification = (message: string) => {
    setToastMessage(message);
  };

  // Estados del historial
  const [myLogs, setMyLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const handleLogout = async () => {
    await signOut(auth);
  };

  const fetchMyLogs = async () => {
    setLoadingLogs(true);
    try {
      const q = query(collection(db, 'timeLogs'), where('userId', '==', user.uid));
      const querySnapshot = await getDocs(q);
      
      const logsData: any[] = [];
      querySnapshot.forEach((doc) => {
        logsData.push({ id: doc.id, ...doc.data() });
      });

      setMyLogs(logsData);
    } catch (error: any) {
      console.error("Error al cargar historial: ", error);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      fetchMyLogs();
    }
  }, [activeTab]);

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
      
      showNotification('¡Registro guardado con éxito! ✅')
      
      setLocation('');
      setCheckIn('');
      setCheckOut('');
      setTotalHours('');
      setComments('');

      setActiveTab('history');
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
          {activeTab === 'form' && (
            <form onSubmit={handleSubmit} className="space-y-4">
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
          )}

          {activeTab === 'history' && (
            <div>
              {loadingLogs ? (
                <p className="text-center text-gray-500 py-4">Cargando calendario...</p>
              ) : (
                // ¡AQUÍ ESTÁ LA MAGIA! Le pasamos los datos al componente Calendar
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