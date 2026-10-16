import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebaseConfig';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import AdminPanel from './components/AdminPanel'; 
import { applyTenantTheme, currentTenant } from './config/tenant.config';

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
            
            // <-- NUEVO BLOQUE: Descargamos la config de su empresa
            if (data.companyId) {
              const companyDoc = await getDoc(doc(db, 'companies', data.companyId));
              if (companyDoc.exists()) {
                const companyData = companyDoc.data();
                
                // Construimos el objeto de configuración con los datos de Firebase
                const tenantConfig = {
                  ...currentTenant, // Mantenemos la base
                  company: {
                    name: companyData.name || currentTenant.company.name,
                    shortName: companyData.shortName || currentTenant.company.shortName,
                    logoUrl: companyData.logoUrl || currentTenant.company.logoUrl,
                  },
                  // Si tuvieras colores en Firebase, los inyectarías aquí
                };
                
                // Aplicamos los colores
                applyTenantTheme(tenantConfig);
                
                // Opcional: Actualizamos el título de la pestaña del navegador
                document.title = companyData.shortName || 'Working Platform';
              }
            }
            // <-- FIN DEL NUEVO BLOQUE

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
        applyTenantTheme(currentTenant); // Resetea al tema por defecto si cierra sesión
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