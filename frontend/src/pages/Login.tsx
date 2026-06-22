import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Lock, Mail, ShieldCheck, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export const Login = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // If already logged in, redirect to dashboard
    const user = localStorage.getItem('onboarding_user');
    if (user) {
      navigate('/');
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error('Please enter both your email and password.');
      return;
    }

    setIsLoading(true);

    // Simulate a secure backend authentication delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Validate password length to make it feel secure
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters long.');
      setIsLoading(false);
      return;
    }

    // Extract first name from email
    const namePart = email.split('@')[0];
    const firstName = namePart.charAt(0).toUpperCase() + namePart.slice(1);

    const userData = {
      firstName: firstName || 'User',
      lastName: '',
      email: email.trim(),
    };

    localStorage.setItem('onboarding_user', JSON.stringify(userData));
    toast.success(`Authentication Successful! Welcome, ${userData.firstName}.`);
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background">
      {/* Animated Background Elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/20 blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-accent/20 blur-[100px] pointer-events-none animate-float" />
      <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] rounded-full bg-secondary/15 blur-[90px] pointer-events-none" />

      <div className="w-full max-w-md p-8 glass-panel rounded-3xl relative z-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex justify-center mb-6">
          <div className="h-20 w-20 bg-slate-900/50 rounded-2xl flex items-center justify-center border border-primary/30 shadow-lg shadow-primary/20">
            <ShieldCheck className="w-10 h-10 text-primary" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-center text-slate-100 mb-2">Secure Login</h1>
        <p className="text-slate-400 text-center mb-8 text-sm">Sign in to access the INTEGRTR Dashboard</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-slate-500" />
              </div>
              <input
                type="email"
                className="glass-input w-full pl-10"
                placeholder="admin@integrtr.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                autoFocus
              />
            </div>
          </div>

          <div className="relative">
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-slate-500" />
              </div>
              <input
                type="password"
                className="glass-input w-full pl-10"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-8 py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 glow-btn disabled:opacity-70"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <span>Enter Dashboard</span>
                <LogIn className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-slate-700/50 text-center flex flex-col items-center justify-center">
          <p className="text-xs text-slate-500 mb-1">End-to-End Encrypted Session</p>
          <p className="text-xs font-medium gradient-text">INTEGRTR × LPU Hackathon 2026 • Team 06</p>
        </div>
      </div>
    </div>
  );
};
