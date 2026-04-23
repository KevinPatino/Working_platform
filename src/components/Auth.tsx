import React, { useState } from 'react';
import { auth, db } from '../firebaseConfig';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail // <-- Importamos esta función
} from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

const Auth: React.FC = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        await setDoc(doc(db, "users", user.uid), {
          uid: user.uid,
          fullName: fullName,
          email: email,
          timestamp: new Date()
        });
        alert("Account created successfully!"); 
      }
    } catch (error: any) {
      alert("Error: " + error.message);
    }
  };

  // Nueva función para recuperar contraseña
  const handleForgotPassword = async () => {
    if (!email) {
      alert("Please enter your email first so we can send you a reset link.");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      alert("Password reset email sent! Check your inbox.");
    } catch (error: any) {
      alert("Error: " + error.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-6 text-blue-600">
          {isLogin ? 'Registro de Horas' : 'Crear cuenta'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <input 
              type="text" 
              placeholder="Full Name" 
              className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              onChange={(e) => setFullName(e.target.value)}
              required 
            />
          )}
          
          <input 
            type="email" 
            placeholder="Email" 
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            onChange={(e) => setEmail(e.target.value)}
            required 
          />
          
          <input 
            type="password" 
            placeholder="Password" 
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            onChange={(e) => setPassword(e.target.value)}
            required={isLogin} // Solo requerido si no estamos reseteando
          />
          
          <button 
            type="submit" 
            className="w-full bg-blue-600 hover:bg-blue-700 transition duration-200 text-white p-3 rounded-lg font-semibold"
          >
            {isLogin ? 'Log In' : 'Sign Up'}
          </button>
        </form>

        {/* Enlace para Olvidé mi contraseña */}
        {isLogin && (
          <div className="text-center mt-3">
            <button 
              onClick={handleForgotPassword}
              className="text-xs text-gray-500 hover:text-blue-600 underline"
            >
              Forgot your password?
            </button>
          </div>
        )}

        <button 
          onClick={() => setIsLogin(!isLogin)}
          className="w-full mt-4 text-sm text-gray-600 hover:text-blue-600 hover:underline"
        >
          {isLogin ? "Don't have an account? Sign up here" : 'Already have an account? Log in'}
        </button>
      </div>
    </div>
  );
};

export default Auth;