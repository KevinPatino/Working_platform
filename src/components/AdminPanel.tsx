import React, { useEffect, useState } from 'react';
import { auth, db } from '../firebaseConfig';
import { signOut } from 'firebase/auth';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';

interface TimeLog {
  id: string;
  userEmail: string;
  location: string;
  checkIn: string;
  checkOut: string;
  totalHours: number;
  comments: string;
  timestamp: any;
}

const AdminPanel: React.FC = () => {
  const [logs, setLogs] = useState<TimeLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Esta función va a la bodega de Firebase y trae los datos
  const fetchLogs = async () => {
    try {
      // Pedimos los registros ordenados por fecha (los más nuevos primero)
      const q = query(collection(db, 'timeLogs'), orderBy('timestamp', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const logsData: TimeLog[] = [];
      querySnapshot.forEach((doc) => {
        logsData.push({ id: doc.id, ...doc.data() } as TimeLog);
      });
      
      setLogs(logsData);
      setLoading(false);
    } catch (error) {
      console.error("Error obteniendo registros: ", error);
      setLoading(false);
    }
  };

  // Ejecutamos la búsqueda apenas se abre la pantalla
  useEffect(() => {
    fetchLogs();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-md overflow-hidden p-6">
        
        {/* Encabezado */}
        <div className="flex justify-between items-center mb-6 pb-4 border-b">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Panel de Administración</h1>
            <p className="text-sm text-gray-500">Vista general de nómina y registros</p>
          </div>
          <button 
            onClick={handleLogout}
            className="px-4 py-2 bg-red-100 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-200"
          >
            Cerrar Sesión
          </button>
        </div>

        {/* Tabla de Registros */}
        {loading ? (
          <p className="text-center text-gray-500 my-10">Cargando registros...</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead className="bg-gray-800 text-white">
                <tr>
                  <th className="py-3 px-4 uppercase font-semibold text-sm text-left">Trabajador</th>
                  <th className="py-3 px-4 uppercase font-semibold text-sm text-left">Lugar / Obra</th>
                  <th className="py-3 px-4 uppercase font-semibold text-sm text-left">Entrada</th>
                  <th className="py-3 px-4 uppercase font-semibold text-sm text-left">Salida</th>
                  <th className="py-3 px-4 uppercase font-semibold text-sm text-left">Horas</th>
                  <th className="py-3 px-4 uppercase font-semibold text-sm text-left">Comentarios</th>
                </tr>
              </thead>
              <tbody className="text-gray-700">
                {logs.map((log) => (
                  <tr key={log.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">{log.userEmail}</td>
                    <td className="py-3 px-4">{log.location}</td>
                    <td className="py-3 px-4">{log.checkIn}</td>
                    <td className="py-3 px-4">{log.checkOut}</td>
                    <td className="py-3 px-4 font-bold text-blue-600">{log.totalHours}</td>
                    <td className="py-3 px-4 text-sm text-gray-500">{log.comments || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
};

export default AdminPanel;