import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getHealthCheck } from '../services/api';
import GlassCard from '../components/GlassCard';
import SkeletonLoader from '../components/SkeletonLoader';
import { ShieldCheck, ShieldAlert, Database, Cpu, Cloud, Activity } from 'lucide-react';

export const SystemHealth: React.FC = () => {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['system-health'],
    queryFn: getHealthCheck,
    refetchInterval: 10000, // Poll health status every 10 seconds
  });

  if (isLoading) return <SkeletonLoader rows={4} />;
  if (error || !data) {
    return (
      <GlassCard className="border-rose-500/20 bg-rose-950/15">
        <h2 className="text-xl font-bold text-rose-400">Unable to Fetch System Health</h2>
        <p className="text-slate-400 mt-2">The health endpoint is unreachable. Make sure the API server is online.</p>
        <button 
          onClick={() => refetch()}
          className="mt-4 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 px-4 py-2 rounded-lg font-semibold text-sm transition-all"
        >
          Retry Connection
        </button>
      </GlassCard>
    );
  }

  const getStatusIcon = (status: 'UP' | 'DOWN' | 'DEGRADED' | string) => {
    if (status === 'UP') {
      return <ShieldCheck className="h-12 w-12 text-emerald-400" />;
    }
    return <ShieldAlert className="h-12 w-12 text-rose-400" />;
  };

  const getStatusClass = (status: 'UP' | 'DOWN' | 'DEGRADED' | string) => {
    if (status === 'UP') {
      return 'border-emerald-500/20 bg-emerald-950/5 text-emerald-400';
    }
    return 'border-rose-500/20 bg-rose-950/5 text-rose-400';
  };

  const services = [
    {
      name: 'PostgreSQL Database',
      description: 'Saga state store, transaction database',
      status: data.services?.database || 'DOWN',
      icon: Database,
    },
    {
      name: 'Redis Connection',
      description: 'BullMQ message queue server, connection management',
      status: data.services?.redis || 'DOWN',
      icon: Cpu,
    },
    {
      name: 'SAP SuccessFactors Integration',
      description: 'SuccessFactors OData credentials & API availability',
      status: data.services?.successFactors || 'UP',
      icon: Cloud,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
          System Diagnostics & Health
        </h1>
        <p className="text-slate-400 text-sm mt-1">Real-time status check for database connections, queues, and cloud integrations.</p>
      </div>

      {/* Main Status Panel */}
      <GlassCard className={`border ${getStatusClass(data.status)} flex items-center justify-between p-8`}>
        <div className="flex items-center space-x-5">
          {getStatusIcon(data.status)}
          <div>
            <h2 className="text-xl font-bold text-slate-100">Overall System Status: <span className="uppercase">{data.status}</span></h2>
            <p className="text-xs text-slate-400 mt-1">Last Checked: {new Date(data.timestamp).toLocaleString()}</p>
          </div>
        </div>
        <div>
          <button 
            onClick={() => refetch()}
            className="flex items-center space-x-1.5 bg-white/5 hover:bg-white/10 text-slate-300 px-4 py-2 text-xs font-bold border border-white/10 rounded-lg transition-all"
          >
            <Activity className="h-4 w-4 text-purple-400 animate-pulse" />
            <span>Force Health Scan</span>
          </button>
        </div>
      </GlassCard>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
        {services.map((svc) => {
          const ServiceIcon = svc.icon;
          const statusUp = svc.status === 'UP';
          return (
            <GlassCard key={svc.name} className="flex flex-col justify-between h-[200px]">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <div className="p-2.5 bg-slate-800 rounded-lg border border-white/5">
                    <ServiceIcon className="h-6 w-6 text-purple-400" />
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                    statusUp ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                  }`}>
                    {svc.status}
                  </span>
                </div>
                <h3 className="font-bold text-slate-200 text-base">{svc.name}</h3>
                <p className="text-xs text-slate-400 mt-1">{svc.description}</p>
              </div>
              <div className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold border-t border-white/5 pt-3">
                Protocol: {svc.name.includes('SuccessFactors') ? 'HTTPS ODATA V2' : svc.name.includes('Redis') ? 'REDIS TCP' : 'PGSQL TCP'}
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
};

export default SystemHealth;
