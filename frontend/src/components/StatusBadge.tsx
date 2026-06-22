import React from 'react';
import { CheckCircle2, XCircle, Loader2, AlertCircle } from 'lucide-react';

interface StatusBadgeProps {
  status: 'SUCCESS' | 'FAILED' | 'PENDING' | 'PROCESSING' | 'COMPLETED' | string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const normalized = status.toUpperCase();

  let styles = '';
  let Icon = Loader2;
  let text = status;

  if (normalized === 'SUCCESS' || normalized === 'COMPLETED') {
    styles = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    Icon = CheckCircle2;
    text = normalized === 'COMPLETED' ? 'Completed' : 'Success';
  } else if (normalized === 'FAILED') {
    styles = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    Icon = XCircle;
    text = 'Failed';
  } else if (normalized === 'PROCESSING') {
    styles = 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
    Icon = Loader2;
    text = 'Processing';
  } else {
    // PENDING
    styles = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    Icon = AlertCircle;
    text = 'Pending';
  }

  return (
    <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${styles}`}>
      <Icon className={`h-3.5 w-3.5 ${normalized === 'PROCESSING' ? 'animate-spin' : ''}`} />
      <span>{text}</span>
    </span>
  );
};

export default StatusBadge;
