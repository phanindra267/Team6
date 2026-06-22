import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getRequests, retryRequest } from '../services/api';
import GlassCard from '../components/GlassCard';
import SkeletonLoader from '../components/SkeletonLoader';
import { toast } from 'sonner';
import { RotateCcw, AlertTriangle, ArrowRight, RefreshCw } from 'lucide-react';

export const RetryCenter: React.FC = () => {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['requests'],
    queryFn: getRequests,
  });

  const retryMutation = useMutation({
    mutationFn: (id: string) => retryRequest(id),
    onSuccess: () => {
      toast.success('Workflow queued for retry!');
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err: any) => {
      const errMsg = err.response?.data?.message || err.message || 'Retry failed';
      toast.error(errMsg);
    }
  });

  if (isLoading) return <SkeletonLoader rows={5} />;
  if (error) {
    return (
      <GlassCard className="border-rose-500/20 bg-rose-950/15">
        <h2 className="text-xl font-bold text-rose-400">Failed to load Retry Center</h2>
        <p className="text-slate-400 mt-2">Error connecting to the backend engine.</p>
      </GlassCard>
    );
  }

  // Filter only failed onboarding requests
  const failedRequests = (data || []).filter(req => req.status === 'FAILED');

  const handleRetryAll = async () => {
    if (failedRequests.length === 0) {
      toast.info('No failed workflows to retry.');
      return;
    }
    
    toast.loading(`Enqueuing ${failedRequests.length} workflows for retry...`);
    try {
      await Promise.all(failedRequests.map(req => retryRequest(req.id)));
      toast.dismiss();
      toast.success('All failed workflows enqueued!');
      queryClient.invalidateQueries({ queryKey: ['requests'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    } catch {
      toast.dismiss();
      toast.error('Some retries failed to enqueue.');
    }
  };

  const getFailedStep = (req: typeof failedRequests[0]) => {
    if (req.sf_write_status === 'FAILED') return 'SAP SuccessFactors Integration';
    if (req.team_slack_status === 'FAILED') return 'Team Slack Notification';
    if (req.hr_slack_status === 'FAILED') return 'HR Slack & Deep Link Notification';
    return 'Unknown step';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Saga Retry Center
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Manual and bulk recovery terminal. Resumes workflows from the exact step that failed, retaining previous step states.
          </p>
        </div>
        
        <div className="flex space-x-3">
          <button 
            onClick={() => refetch()}
            className="flex items-center space-x-1.5 bg-white/5 hover:bg-white/10 text-slate-300 px-4 py-2 text-sm font-semibold border border-white/10 rounded-lg transition-all"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
          <button 
            onClick={handleRetryAll}
            disabled={failedRequests.length === 0}
            className="glow-btn flex items-center space-x-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-4 py-2 text-sm font-semibold border border-purple-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Retry All Failed ({failedRequests.length})</span>
          </button>
        </div>
      </div>

      <GlassCard>
        {failedRequests.length === 0 ? (
          <div className="text-center py-12">
            <AlertTriangle className="h-10 w-10 text-emerald-400 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-200">Zero Halted Saga Workflows</h3>
            <p className="text-slate-500 text-sm mt-1">Excellent! No employees are currently in a failed onboarding state.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-slate-400 text-xs font-bold uppercase tracking-wider">
                  <th className="pb-3 pl-4">Employee</th>
                  <th className="pb-3">Failed Step</th>
                  <th className="pb-3">Error Reason</th>
                  <th className="pb-3">Retry Count</th>
                  <th className="pb-3 text-right pr-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-sm text-slate-300">
                {failedRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-4 pl-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-200">{request.first_name} {request.last_name}</span>
                        <span className="text-xs text-purple-400 font-mono">{request.request_id}</span>
                      </div>
                    </td>
                    <td className="py-4 font-medium text-rose-400">{getFailedStep(request)}</td>
                    <td className="py-4 max-w-xs truncate text-slate-400" title={request.error_message || ''}>
                      {request.error_message || 'N/A'}
                    </td>
                    <td className="py-4 text-center">
                      <span className="text-slate-400 bg-white/5 px-2.5 py-0.5 rounded border border-white/10 font-mono text-xs">
                        {request.updated_at !== request.created_at ? 'Yes (Retried)' : 'No (First Try)'}
                      </span>
                    </td>
                    <td className="py-4 text-right pr-4 space-x-2">
                      <button
                        onClick={() => retryMutation.mutate(request.id)}
                        disabled={retryMutation.isPending}
                        className="text-xs text-purple-400 hover:text-purple-300 font-bold bg-purple-500/10 hover:bg-purple-500/20 px-3 py-1.5 rounded-lg border border-purple-500/20 transition-all inline-flex items-center space-x-1"
                      >
                        <RotateCcw className={`h-3 w-3 ${retryMutation.isPending ? 'animate-spin' : ''}`} />
                        <span>Retry</span>
                      </button>
                      <Link
                        to={`/details/${request.id}`}
                        className="text-xs text-slate-400 hover:text-slate-200 font-bold bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg border border-white/10 transition-all inline-flex items-center space-x-1"
                      >
                        <span>Audit</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  );
};

export default RetryCenter;
