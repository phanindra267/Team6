import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getRequests } from '../services/api';
import GlassCard from '../components/GlassCard';
import StatusBadge from '../components/StatusBadge';
import SkeletonLoader from '../components/SkeletonLoader';
import { Search, Eye, Calendar } from 'lucide-react';

export const WorkflowHistory: React.FC = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['requests'],
    queryFn: getRequests,
  });

  const [searchTerm, setSearchTerm] = React.useState('');

  if (isLoading) return <SkeletonLoader rows={6} />;
  if (error) {
    return (
      <GlassCard className="border-rose-500/20 bg-rose-950/15">
        <h2 className="text-xl font-bold text-rose-400">Failed to load history</h2>
        <p className="text-slate-400 mt-2">Error connecting to the Express API backend.</p>
      </GlassCard>
    );
  }

  const filteredRequests = (data || []).filter(req => {
    const searchString = `${req.first_name} ${req.last_name} ${req.employee_email} ${req.department} ${req.request_id}`.toLowerCase();
    return searchString.includes(searchTerm.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
          Onboarding Workflow History
        </h1>
        <p className="text-slate-400 text-sm mt-1">Audit log of all SuccessFactors and Slack onboarding automation requests.</p>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search by employee, email, department, or request ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="glass-input pl-10"
          />
        </div>
      </div>

      {/* History Table */}
      <GlassCard>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-slate-400 text-xs font-bold uppercase tracking-wider">
                <th className="pb-3 pl-4">Request ID</th>
                <th className="pb-3">Employee</th>
                <th className="pb-3">Department</th>
                <th className="pb-3">Joining Date</th>
                <th className="pb-3">Workflow State</th>
                <th className="pb-3 text-right pr-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-sm text-slate-300">
              {filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 font-medium">
                    No onboarding requests matching your search.
                  </td>
                </tr>
              ) : (
                filteredRequests.map((request) => (
                  <tr key={request.id} className="hover:bg-white/5 transition-colors group">
                    <td className="py-3.5 pl-4 font-mono text-xs text-purple-400">{request.request_id}</td>
                    <td className="py-3.5">
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-200">{request.first_name} {request.last_name}</span>
                        <span className="text-xs text-slate-500">{request.employee_email}</span>
                      </div>
                    </td>
                    <td className="py-3.5 text-slate-400">{request.department}</td>
                    <td className="py-3.5 text-slate-400">
                      <div className="flex items-center space-x-1.5">
                        <Calendar className="h-3.5 w-3.5 text-slate-500" />
                        <span>{new Date(request.joining_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                    </td>
                    <td className="py-3.5">
                      <StatusBadge status={request.status} />
                    </td>
                    <td className="py-3.5 text-right pr-4">
                      <Link 
                        to={`/details/${request.id}`} 
                        className="text-xs text-slate-300 hover:text-white font-semibold bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg border border-white/10 transition-all inline-flex items-center space-x-1.5"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>Audit</span>
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

export default WorkflowHistory;
