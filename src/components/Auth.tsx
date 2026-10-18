import React, { useState } from 'react';
import { auth } from '../firebaseConfig';
import { 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail 
} from 'firebase/auth';
import { currentTenant } from '../config/tenant.config';
import { Lock, Mail, ArrowRight } from 'lucide-react';

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
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F4F6F9] p-4 text-slate-900">
      {/* Logotipo de la Empresa */}
      <div className="text-center mb-8 animate-fade-in">
        <img
          src={currentTenant.company.logoUrl}
          alt={`${currentTenant.company.name} Logo`}
          className="mx-auto h-32 w-auto object-contain mb-2 drop-shadow-xs"
        />
      </div>
      
      {/* Tarjeta de Inicio de Sesión Moderna */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-xs border border-slate-100 w-full max-w-md space-y-6">
        <div className="text-center space-y-1">
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Welcome Back
          </h2>
          <p className="text-xs font-semibold text-slate-400">
            Sign in to access your portal
          </p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
            <input 
              type="email" 
              name="email"
              autoComplete="username"
              placeholder="Email address" 
              className="w-full pl-11 pr-4 py-3.5 border border-slate-200/80 rounded-2xl text-sm bg-[#F4F6F9] focus:bg-white focus:ring-2 focus:ring-brand outline-none font-semibold text-slate-900 transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
          </div>
          
          <div className="relative">
            <Lock className="absolute left-4 top-3.5 w-4 h-4 text-slate-400" />
            <input 
              type="password" 
              name="password"
              autoComplete="current-password"
              placeholder="Password" 
              className="w-full pl-11 pr-4 py-3.5 border border-slate-200/80 rounded-2xl text-sm bg-[#F4F6F9] focus:bg-white focus:ring-2 focus:ring-brand outline-none font-semibold text-slate-900 transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </div>
          
          <button 
            type="submit" 
            className="w-full flex items-center justify-center gap-2 py-4 px-4 border border-transparent rounded-2xl shadow-sm text-sm font-extrabold text-white bg-brand hover:bg-brand-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand transition-colors cursor-pointer"
          >
            <span>Log In</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center pt-2">
          <button 
            onClick={handleForgotPassword}
            className="text-xs font-bold text-slate-400 hover:text-brand transition-colors underline cursor-pointer"
          >
            Forgot your password?
          </button>
        </div>

        <div className="pt-5 border-t border-slate-100 text-center">
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-extrabold">
            {currentTenant.company.shortName} • Internal Access Only
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;