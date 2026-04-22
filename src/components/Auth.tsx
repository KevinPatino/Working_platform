import React, { useState } from 'react';
import { auth, db } from '../firebaseConfig';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
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
        // Lógica para Iniciar Sesión
        await signInWithEmailAndPassword(auth, email, password);
        alert("¡Welcome back!"); 
      } else {
        // Lógica para Crear Cuenta nueva
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Guardamos el nombre en la base de datos Firestore
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-6 text-blue-600">
          {isLogin ? 'Time Tracker Login' : 'Create Account'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Si NO es Login (es decir, es registro), pedimos el Nombre Completo */}
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
            required 
          />
          
          <button 
            type="submit" 
            className="w-full bg-blue-600 hover:bg-blue-700 transition duration-200 text-white p-3 rounded-lg font-semibold"
          >
            {isLogin ? 'Log In' : 'Sign Up'}
          </button>
        </form>

        {/* Botón para cambiar entre Login y Registro */}
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