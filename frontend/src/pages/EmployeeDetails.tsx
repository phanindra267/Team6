import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getRequestDetails, retryRequest } from '../services/api';
import GlassCard from '../components/GlassCard';
import StatusBadge from '../components/StatusBadge';
import WorkflowProgress from '../components/WorkflowProgress';
import SkeletonLoader from '../components/SkeletonLoader';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  RotateCcw, 
  User, 
  Mail, 
  Calendar, 
  Building, 
  Briefcase, 
  UserCheck, 
  ExternalLink,
  ShieldAlert
} from 'lucide-react';

export const EmployeeDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Poll database every 2 seconds if the job is still processing
  const { data, isLoading, error } = useQuery({
    queryKey: ['request-details', id],
    queryFn: () => getRequestDetails(id!),
    enabled: !!id,
    refetchInterval: (query) => {
      const state = query.state.data as any;
      return state?.status === 'PROCESSING' ? 2000 : false;
    },
  });

  const retryMutation = useMutation({
    mutationFn: () => retryRequest(id!),
    onSuccess: (updatedData) => {
      toast.success('Retry workflow queued successfully!');
      // Instantly trigger cache update
      queryClient.setQueryData(['request-details', id], updatedData);
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err: any) => {
      const errMsg = err.response?.data?.message || err.message || 'Failed to retry';
      toast.error(errMsg);
    }
  });

  if (isLoading) return <SkeletonLoader rows={6} />;
  if (error || !data) {
    return (
      <GlassCard className="border-rose-500/20 bg-rose-950/15">
        <h2 className="text-xl font-bold text-rose-400">Failed to load employee details</h2>
        <p className="text-slate-400 mt-2">The requested onboarding record could not be found.</p>
        <button onClick={() => navigate('/')} className="mt-4 text-purple-400 hover:underline">Return Home</button>
      </GlassCard>
    );
  }

  const handleRetry = () => {
    retryMutation.mutate();
  };

  const formattedDate = new Date(data.joining_date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="space-y-6">
      {/* Back nav & Status */}
      <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center space-x-2 text-slate-400 hover:text-slate-200 text-sm font-semibold transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </button>
        <div className="flex items-center space-x-3">
          <span className="text-xs text-slate-400 font-medium">Saga status:</span>
          <StatusBadge status={data.status} />
        </div>
      </div>

      {/* Header Profile Title */}
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">
          {data.first_name} {data.last_name}
        </h1>
        <p className="text-slate-400 text-sm mt-1">Request ID: <span className="font-mono text-purple-400">{data.request_id}</span></p>
      </div>

      {/* Workflow Step Tracker */}
      <GlassCard className="border-purple-500/10">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6">Workflow Step Status</h3>
        <WorkflowProgress 
          dbStatus="SUCCESS" 
          sfStatus={data.sf_write_status} 
          teamSlackStatus={data.team_slack_status} 
          hrSlackStatus={data.hr_slack_status} 
        />
      </GlassCard>

      {/* Error / Failure Banner */}
      {data.status === 'FAILED' && (
        <GlassCard className="border-rose-500/30 bg-rose-950/15">
          <div className="flex items-start space-x-3">
            <ShieldAlert className="h-6 w-6 text-rose-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-bold text-rose-400 text-base">Saga Execution Halted</h3>
              <p className="text-slate-300 text-sm mt-1 bg-black/30 p-3 rounded-lg border border-rose-500/10 font-mono text-xs overflow-x-auto whitespace-pre-wrap">
                {data.error_message || 'An unknown error occurred during workflow step execution.'}
              </p>
              <div className="mt-4 flex space-x-3">
                <button
                  onClick={handleRetry}
                  disabled={retryMutation.isPending}
                  className="glow-btn flex items-center space-x-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-4 py-2 text-sm font-semibold border border-purple-500/30"
                >
                  <RotateCcw className={`h-4 w-4 ${retryMutation.isPending ? 'animate-spin' : ''}`} />
                  <span>Retry Failed Steps</span>
                </button>
              </div>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Success SuccessFactors link */}
      {data.sf_employee_id && (
        <GlassCard className="border-emerald-500/20 bg-emerald-950/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                <UserCheck className="h-6 w-6 text-emerald-400" />
              </div>
              <div>
                <h4 className="text-slate-200 font-bold">SAP SuccessFactors Record Created</h4>
                <p className="text-xs text-slate-400">Employee Registered with ID: <span className="font-mono text-emerald-400 font-semibold">{data.sf_employee_id}</span></p>
              </div>
            </div>
            <a 
              href={`https://api.successfactors.com/sf/liveprofile?username=${data.sf_employee_id}`}
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-emerald-400 hover:text-emerald-300 font-bold flex items-center space-x-1 border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 rounded-lg hover:bg-emerald-500/20 transition-all"
            >
              <span>Deep Link Profile</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </GlassCard>
      )}

      {/* Grid of Profile information */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Core Employee Details */}
        <GlassCard className="space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-white/5 pb-2">Employee Information</h3>
          
          <div className="grid grid-cols-2 gap-y-4 text-sm">
            <div className="flex items-center space-x-2 text-slate-400">
              <User className="h-4 w-4" />
              <span>Full Name</span>
            </div>
            <div className="text-slate-200 font-medium">{data.first_name} {data.last_name}</div>

            <div className="flex items-center space-x-2 text-slate-400">
              <Mail className="h-4 w-4" />
              <span>Email</span>
            </div>
            <div className="text-slate-200 font-medium break-all">{data.employee_email}</div>

            <div className="flex items-center space-x-2 text-slate-400">
              <Calendar className="h-4 w-4" />
              <span>Joining Date</span>
            </div>
            <div className="text-slate-200 font-medium">{formattedDate}</div>

            <div className="flex items-center space-x-2 text-slate-400">
              <Building className="h-4 w-4" />
              <span>Department</span>
            </div>
            <div className="text-slate-200 font-medium">{data.department}</div>

            <div className="flex items-center space-x-2 text-slate-400">
              <Briefcase className="h-4 w-4" />
              <span>Designation</span>
            </div>
            <div className="text-slate-200 font-medium">{data.designation}</div>
          </div>
        </GlassCard>

        {/* Administration details */}
        <GlassCard className="space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-white/5 pb-2">Workflow Metadata</h3>
          
          <div className="grid grid-cols-2 gap-y-4 text-sm">
            <div className="text-slate-400">Reporting Manager</div>
            <div className="text-slate-200 font-medium">{data.manager}</div>

            <div className="text-slate-400">Initiated By</div>
            <div className="text-slate-200 font-medium">{data.initiated_by}</div>

            <div className="text-slate-400">Created Time</div>
            <div className="text-slate-200 font-medium">
              {new Date(data.created_at).toLocaleString()}
            </div>

            <div className="text-slate-400">Last Synced Time</div>
            <div className="text-slate-200 font-medium">
              {new Date(data.updated_at).toLocaleString()}
            </div>

            <div className="text-slate-400">Saga UUID</div>
            <div className="text-slate-400 font-mono text-xs truncate" title={data.id}>{data.id}</div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default EmployeeDetails;
