import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebaseConfig';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import AdminPanel from './components/AdminPanel'; 

function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL;

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

  return (
    <div className="min-h-screen bg-gray-100">
      {!user ? (
        <Auth />
      ) : user.email === ADMIN_EMAIL ? (
        <AdminPanel user={user} /> 
      ) : (
        <Dashboard user={user} />
      )}
    </div>
  );
}

export default App;