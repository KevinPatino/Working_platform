import React, { useState } from 'react';
import { auth, db } from '../firebaseConfig';
import { signOut } from 'firebase/auth';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// Definimos que este componente va a recibir los datos del usuario logueado
interface DashboardProps {
  user: any;
}

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [location, setLocation] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [totalHours, setTotalHours] = useState('');
  const [comments, setComments] = useState('');

  const handleLogout = async () => {
    await signOut(auth);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Guardamos el registro en la colección "timeLogs"
      await addDoc(collection(db, 'timeLogs'), {
        userId: user.uid,
        userEmail: user.email,
        location: location,
        checkIn: checkIn,
        checkOut: checkOut,
        totalHours: Number(totalHours), // Lo guardamos como número para poder sumarlo a la quincena después
        comments: comments,
        timestamp: serverTimestamp() // Hora exacta del servidor
      });
      
      alert('¡Registro guardado con éxito!');
      
      // Limpiamos los campos para el siguiente día
      setLocation('');
      setCheckIn('');
      setCheckOut('');
      setTotalHours('');
      setComments('');
    } catch (error: any) {
      alert("Error al guardar: " + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden md:max-w-2xl p-6">
        
        {/* Encabezado con el correo del usuario y botón de salir */}
        <div className="flex justify-between items-center mb-6 pb-4 border-b">
          <div>
            <h1 className="text-xl font-bold text-gray-800">Log Your Hours</h1>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
          <button 
            onClick={handleLogout}
            className="px-4 py-2 bg-red-100 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-200"
          >
            Log Out
          </button>
        </div>

        {/* Formulario de registro */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Location / Project</label>
            <input 
              type="text" 
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="e.g. Demolition Site A"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Check In</label>
              <input 
                type="time" 
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Check Out</label>
              <input 
                type="time" 
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Total Hours</label>
            <input 
              type="number" 
              step="0.5"
              value={totalHours}
              onChange={(e) => setTotalHours(e.target.value)}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="e.g. 8.5"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Comments</label>
            <textarea 
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Any issues or extra tasks today?"
              rows={3}
            />
          </div>

          <button 
            type="submit" 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg mt-4"
          >
            Submit Work Log
          </button>
        </form>

      </div>
    </div>
  );
};

export default Dashboard;