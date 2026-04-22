import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebaseConfig';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import AdminPanel from './components/AdminPanel'; // <-- Importamos el nuevo panel

function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // DEBES CAMBIAR ESTE CORREO POR EL TUYO DE ADMINISTRADOR
  const ADMIN_EMAIL = "admin@empresa.com"; 

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-100">Loading...</div>;
  }

  // Lógica de navegación:
  return (
    <div className="min-h-screen bg-gray-100">
      {!user ? (
        // 1. Si no hay usuario, mostramos el Login
        <Auth />
      ) : user.email === ADMIN_EMAIL ? (
        // 2. Si el usuario es el jefe, mostramos la Tabla de Excel
        <AdminPanel />
      ) : (
        // 3. Si es cualquier otro trabajador, mostramos el formulario de celular
        <Dashboard user={user} />
      )}
    </div>
  );
}

export default App;