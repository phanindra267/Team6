import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn } from 'lucide-react';
import { toast } from 'sonner';

export const Login = () => {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  useEffect(() => {
    // If already logged in, redirect to dashboard
    const user = localStorage.getItem('onboarding_user');
    if (user) {
      navigate('/');
    }
  }, [navigate]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      toast.error('Please enter both your first and last name.');
      return;
    }

    const userData = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
    };

    localStorage.setItem('onboarding_user', JSON.stringify(userData));
    toast.success(`Welcome, ${userData.firstName}!`);
    navigate('/');
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background-dark">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-accent-cyan/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md p-8 glass-panel rounded-2xl relative z-10 shadow-glass-lg animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex justify-center mb-6">
          <div className="h-16 w-16 bg-primary-600/20 rounded-full flex items-center justify-center border border-primary-500/30">
            <LogIn className="w-8 h-8 text-primary-500" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-center text-slate-100 mb-2">Welcome to PlanPulse</h1>
        <p className="text-slate-400 text-center mb-8 text-sm">Please log in to the INTEGRTR Hackathon Dashboard</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">First Name</label>
            <input
              type="text"
              className="glass-input w-full"
              placeholder="e.g. John"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Last Name</label>
            <input
              type="text"
              className="glass-input w-full"
              placeholder="e.g. Doe"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="w-full mt-6 bg-primary-600 hover:bg-primary-500 text-white py-3 px-4 rounded-lg font-medium transition-colors glow-btn flex items-center justify-center gap-2"
          >
            <span>Enter Dashboard</span>
            <LogIn className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-8 text-center text-xs text-slate-500">
          INTEGRTR × LPU Hackathon 2026 • Team 06
        </div>
      </div>
    </div>
  );
};
