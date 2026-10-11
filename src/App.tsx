import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import AdminPanel from './components/AdminPanel'; 

export type UserRole = 'admin' | 'teamlead' | 'worker';

function App() {
  const [user, setUser] = useState<any>(null);
  const [userRole, setUserRole] = useState<UserRole>('worker');
  const [loading, setLoading] = useState(true);

  const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL;

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        try {
          const userDocRef = doc(db, 'users', currentUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const data = userDocSnap.data();
            
            if (currentUser.email === ADMIN_EMAIL || data.role === 'admin') {
              setUserRole('admin');
            } else if (data.role === 'teamlead') {
              setUserRole('teamlead');
            } else {
              setUserRole('worker');
            }
          } else {
            setUserRole(currentUser.email === ADMIN_EMAIL ? 'admin' : 'worker');
          }
        } catch (error) {
          console.error("Error al obtener rol:", error);
          setUserRole(currentUser.email === ADMIN_EMAIL ? 'admin' : 'worker');
        }
      } else {
        setUser(null);
        setUserRole('worker');
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [ADMIN_EMAIL]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm font-semibold text-gray-500">Loading platform...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Auth />;

  return (
    <div className="min-h-screen bg-gray-100">
      {userRole === 'admin' ? (
        <AdminPanel user={user} />
      ) : (
        <Dashboard user={user} role={userRole} />
      )}
    </div>
  );
}

export default App;