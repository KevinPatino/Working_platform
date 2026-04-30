import React, { useState } from 'react';
import { auth } from '../firebaseConfig';
import { 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail 
} from 'firebase/auth';

const Auth: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      alert("Error: " + error.message);
    }
  };

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
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <div className="text-center mb-8 animate-fade-in">
        <img
          src="/logo.png"
          alt="Company Logo"
          className="mx-auto h-36 w-auto object-contain mb-4"
        />
      </div>
      
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-6 text-[#8cc641]">
          Log In
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <input 
            type="email" 
            name="email"
            autoComplete="username"
            placeholder="Email" 
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c7e99b]"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required 
          />
          
          <input 
            type="password" 
            name="password"
            autoComplete="current-password"
            placeholder="Password" 
            className="w-full p-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#c7e99b]"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required 
          />
          
          <button 
            type="submit" 
            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white bg-[#8cc641] hover:bg-[#5e8e1f] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
          >
            Log In
          </button>
        </form>

        <div className="text-center mt-6">
          <button 
            onClick={handleForgotPassword}
            className="text-xs text-gray-500 hover:text-[#8cc641] underline"
          >
            Forgot your password?
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-400 uppercase tracking-widest font-semibold">
            Internal Access Only
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;