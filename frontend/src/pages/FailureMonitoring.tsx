import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getRequests, getFailures } from '../services/api';
import GlassCard from '../components/GlassCard';
import SkeletonLoader from '../components/SkeletonLoader';
import { ShieldAlert, RefreshCcw, CheckCircle, Info, Flame } from 'lucide-react';

export const FailureMonitoring: React.FC = () => {
  const { data: requests, isLoading: requestsLoading, error: requestsError } = useQuery({
    queryKey: ['requests'],
    queryFn: getRequests,
  });

  const { data: failures, isLoading: failuresLoading, error: failuresError } = useQuery({
    queryKey: ['failures'],
    queryFn: getFailures,
  });

  if (requestsLoading || failuresLoading) return <SkeletonLoader rows={6} />;
  if (requestsError || failuresError) {
    return (
      <GlassCard className="border-rose-500/20 bg-rose-950/15">
        <h2 className="text-xl font-bold text-rose-400">Failed to load failure monitor</h2>
        <p className="text-slate-400 mt-2">Error connecting to the backend engine.</p>
      </GlassCard>
    );
  }

  const allReqs = requests || [];
  const failReqs = failures || [];
  
  const currentFailuresCount = allReqs.filter(r => r.status === 'FAILED').length;
  
  // Calculate recovery rate: completed requests that experienced prior failure (i.e. updated_at is different from created_at)
  // vs total requests that had updates.
  const retriedReqs = allReqs.filter(r => r.created_at !== r.updated_at);
  const recoveredCount = retriedReqs.filter(r => r.status === 'COMPLETED').length;
  const recoveryRate = retriedReqs.length > 0 ? Math.round((recoveredCount / retriedReqs.length) * 100) : 100;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
          Failure Monitoring & Alerts
        </h1>
        <p className="text-slate-400 text-sm mt-1">Real-time alerts, exceptions, and recovery metrics tracking.</p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlassCard className="border-rose-500/20 shadow-[0_0_20px_rgba(244,63,94,0.1)] flex justify-between items-center">
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Active Failure Halted States</span>
            <h3 className="text-3xl font-extrabold text-rose-400 mt-2">{currentFailuresCount}</h3>
          </div>
          <ShieldAlert className="h-10 w-10 text-rose-500/80" />
        </GlassCard>

        <GlassCard className="border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)] flex justify-between items-center">
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Recovered via Retries</span>
            <h3 className="text-3xl font-extrabold text-emerald-400 mt-2">{recoveredCount}</h3>
          </div>
          <CheckCircle className="h-10 w-10 text-emerald-500/80" />
        </GlassCard>

        <GlassCard className="border-cyan-500/20 shadow-[0_0_20px_rgba(6,182,212,0.1)] flex justify-between items-center">
          <div>
            <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Saga Recovery Rate</span>
            <h3 className="text-3xl font-extrabold text-cyan-400 mt-2">{recoveryRate}%</h3>
          </div>
          <RefreshCcw className="h-10 w-10 text-cyan-500/80" />
        </GlassCard>
      </div>

      {/* Failures Timeline & Simulation guide */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Exception Log */}
        <div className="lg:col-span-2">
          <GlassCard className="h-full">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6">Real-Time Exception Console</h3>
            
            {failReqs.length === 0 ? (
              <div className="text-center py-12 text-slate-500 font-medium">
                No exceptions logged. All systems are performing within parameters.
              </div>
            ) : (
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                {failReqs.map((fail) => (
                  <div key={fail.id} className="p-4 bg-rose-950/15 border border-rose-500/10 rounded-lg flex items-start space-x-3">
                    <Flame className="h-5 w-5 text-rose-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-slate-200 text-sm">{fail.first_name} {fail.last_name}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{new Date(fail.updated_at).toLocaleString()}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 font-mono truncate">{fail.employee_email}</p>
                      <p className="text-xs text-rose-400 mt-2 font-mono bg-black/40 p-2 rounded border border-rose-500/5 overflow-x-auto whitespace-pre-wrap">
                        {fail.error_message || 'Unspecified runtime error during saga execution.'}
                      </p>
                      <div className="mt-3 text-right">
                        <Link to={`/details/${fail.id}`} className="text-xs text-purple-400 hover:text-purple-300 font-semibold">
                          View details & retry →
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>

        {/* Simulator Guide */}
        <GlassCard className="border-purple-500/10 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center space-x-2">
              <Info className="h-4 w-4 text-purple-400" />
              <span>Demo Exception Injector</span>
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              To demonstrate error resilience and idempotency recovery to hackathon judges, you can register new employees with the following email syntax:
            </p>
            <div className="space-y-3">
              <div className="p-3 bg-white/5 border border-white/5 rounded-lg">
                <span className="text-xs font-bold text-slate-300 block font-mono">fail-sf@example.com</span>
                <span className="text-[10px] text-rose-400">Forces SAP SuccessFactors step to throw a 500 Server Error.</span>
              </div>
              <div className="p-3 bg-white/5 border border-white/5 rounded-lg">
                <span className="text-xs font-bold text-slate-300 block font-mono">fail-slack-team@example.com</span>
                <span className="text-[10px] text-rose-400">Forces Team Slack Webhook to timeout / network fail.</span>
              </div>
              <div className="p-3 bg-white/5 border border-white/5 rounded-lg">
                <span className="text-xs font-bold text-slate-300 block font-mono">fail-slack-hr@example.com</span>
                <span className="text-[10px] text-rose-400">Forces HR Slack Webhook to throw a 500 error.</span>
              </div>
            </div>
          </div>
          <div className="mt-6 border-t border-white/5 pt-4">
            <Link 
              to="/new-employee"
              className="glow-btn block text-center bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white py-2 text-xs font-bold border border-purple-500/30"
            >
              Go to Simulator Form
            </Link>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default FailureMonitoring;
