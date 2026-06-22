import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getDashboardData } from '../services/api';
import GlassCard from '../components/GlassCard';
import StatusBadge from '../components/StatusBadge';
import SkeletonLoader from '../components/SkeletonLoader';
import { 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Percent, 
  ArrowRight, 
  Activity, 
  PlusCircle 
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  // Poll API every 4 seconds for live hackathon demo feel
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboardData,
    refetchInterval: 4000,
  });

  if (isLoading) return <SkeletonLoader rows={5} />;
  if (error) {
    return (
      <GlassCard className="border-rose-500/20 bg-rose-950/15">
        <h2 className="text-xl font-bold text-rose-400">Failed to connect to backend engine</h2>
        <p className="text-slate-400 mt-2">Make sure the Express backend server is running and accessible.</p>
      </GlassCard>
    );
  }

  const metrics = data?.metrics || {
    totalRequests: 0,
    completed: 0,
    failed: 0,
    pending: 0,
    successRate: 100,
    failureCount: 0,
    retryCount: 0,
  };

  const cards = [
    {
      title: 'Total Requests',
      value: metrics.totalRequests,
      icon: Users,
      color: 'text-purple-400',
      glow: 'shadow-[0_0_20px_rgba(168,85,247,0.15)] border-purple-500/20',
    },
    {
      title: 'Completed Onboarding',
      value: metrics.completed,
      icon: CheckCircle,
      color: 'text-emerald-400',
      glow: 'shadow-[0_0_20px_rgba(16,185,129,0.15)] border-emerald-500/20',
    },
    {
      title: 'Active Failures',
      value: metrics.failed,
      icon: XCircle,
      color: 'text-rose-400',
      glow: 'shadow-[0_0_20px_rgba(244,63,94,0.15)] border-rose-500/20',
    },
    {
      title: 'In Progress (Saga)',
      value: metrics.pending,
      icon: Clock,
      color: 'text-cyan-400',
      glow: 'shadow-[0_0_20px_rgba(6,182,212,0.15)] border-cyan-500/20',
    },
    {
      title: 'Saga Success Rate',
      value: `${metrics.successRate}%`,
      icon: Percent,
      color: 'text-indigo-400',
      glow: 'shadow-[0_0_20px_rgba(99,102,241,0.15)] border-indigo-500/20',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
            Employee Onboarding Control Center
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Real-time SAP SuccessFactors & Slack orchestration saga dashboard.
          </p>
        </div>
        
        <div className="flex space-x-3">
          <Link 
            to="/new-employee" 
            className="glow-btn flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-4 py-2.5 text-sm font-semibold shadow-lg shadow-purple-500/10 border border-purple-500/30"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Onboard Employee</span>
          </Link>
          <Link 
            to="/failures" 
            className="glow-btn flex items-center space-x-2 glass-card hover:bg-white/10 text-slate-300 px-4 py-2.5 text-sm font-semibold border border-white/10"
          >
            <Activity className="h-4 w-4" />
            <span>Failure Monitor</span>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <GlassCard key={card.title} className={`border ${card.glow} flex flex-col justify-between min-h-[110px]`}>
              <div className="flex justify-between items-start">
                <span className="text-xs text-slate-400 font-semibold tracking-wide uppercase">{card.title}</span>
                <Icon className={`h-5 w-5 ${card.color}`} />
              </div>
              <div className="mt-4">
                <span className="text-2xl font-bold tracking-tight text-slate-100">{card.value}</span>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* Recent Activity Table */}
      <GlassCard className="mt-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-100">Live Workflow Logs</h3>
            <p className="text-xs text-slate-400">Chronological history of onboarding requests.</p>
          </div>
          <Link to="/history" className="text-purple-400 hover:text-purple-300 text-xs font-semibold flex items-center space-x-1 group">
            <span>View All Workflows</span>
            <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-slate-400 text-xs font-bold uppercase tracking-wider">
                <th className="pb-3 pl-4">Employee</th>
                <th className="pb-3">Email</th>
                <th className="pb-3">Last Active</th>
                <th className="pb-3">Workflow State</th>
                <th className="pb-3 text-right pr-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm text-slate-300">
              {(data?.recentActivities?.length ?? 0) === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500 font-medium">
                    No onboarding activities initiated yet. Click "Onboard Employee" to start.
                  </td>
                </tr>
              ) : (
                (data?.recentActivities ?? []).map((activity) => (
                  <tr key={activity.id} className="hover:bg-white/5 transition-colors group">
                    <td className="py-3.5 pl-4 font-semibold text-slate-200">{activity.name}</td>
                    <td className="py-3.5 text-slate-400">{activity.email}</td>
                    <td className="py-3.5 text-slate-400">
                      {new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </td>
                    <td className="py-3.5">
                      <StatusBadge status={activity.status} />
                    </td>
                    <td className="py-3.5 text-right pr-4">
                      <Link 
                        to={`/details/${activity.id}`} 
                        className="text-xs text-purple-400 hover:text-purple-300 font-semibold bg-purple-500/10 hover:bg-purple-500/20 px-3 py-1.5 rounded-lg border border-purple-500/20 transition-all"
                      >
                        Monitor
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
};

export default Dashboard;
