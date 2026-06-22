import React from 'react';
import { Database, UserCheck, Users, MailCheck } from 'lucide-react';

interface WorkflowProgressProps {
  dbStatus: 'SUCCESS' | 'FAILED' | 'PENDING' | 'PROCESSING' | 'COMPLETED' | string;
  sfStatus: 'SUCCESS' | 'FAILED' | 'PENDING' | 'PROCESSING' | string;
  teamSlackStatus: 'SUCCESS' | 'FAILED' | 'PENDING' | 'PROCESSING' | string;
  hrSlackStatus: 'SUCCESS' | 'FAILED' | 'PENDING' | 'PROCESSING' | string;
}

export const WorkflowProgress: React.FC<WorkflowProgressProps> = ({
  dbStatus = 'SUCCESS', // Database initialization is done when record exists
  sfStatus,
  teamSlackStatus,
  hrSlackStatus,
}) => {
  const steps = [
    {
      name: 'DB Persistence',
      description: 'Create Saga State',
      status: dbStatus,
      icon: Database,
    },
    {
      name: 'SAP SuccessFactors',
      description: 'Register Employee',
      status: sfStatus,
      icon: UserCheck,
    },
    {
      name: 'Team Slack Alert',
      description: 'Broadcast Welcome',
      status: teamSlackStatus,
      icon: Users,
    },
    {
      name: 'HR Slack & Deep Link',
      description: 'Send SF Link',
      status: hrSlackStatus,
      icon: MailCheck,
    },
  ];

  const getStepColors = (status: string) => {
    const normalized = status.toUpperCase();
    if (normalized === 'SUCCESS' || normalized === 'COMPLETED') {
      return {
        bg: 'bg-emerald-500/20 border-emerald-500 text-emerald-400',
        line: 'bg-emerald-500',
        glow: 'shadow-[0_0_15px_rgba(16,185,129,0.3)]',
      };
    }
    if (normalized === 'FAILED') {
      return {
        bg: 'bg-rose-500/20 border-rose-500 text-rose-400',
        line: 'bg-rose-500',
        glow: 'shadow-[0_0_15px_rgba(244,63,94,0.3)]',
      };
    }
    if (normalized === 'PROCESSING') {
      return {
        bg: 'bg-cyan-500/20 border-cyan-500 text-cyan-400 animate-pulse',
        line: 'bg-cyan-500',
        glow: 'shadow-[0_0_15px_rgba(6,182,212,0.3)]',
      };
    }
    // PENDING
    return {
      bg: 'bg-slate-800 border-slate-700 text-slate-500',
      line: 'bg-slate-700',
      glow: '',
    };
  };

  return (
    <div className="w-full py-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between space-y-6 md:space-y-0">
        {steps.map((step, idx) => {
          const StepIcon = step.icon;
          const colors = getStepColors(step.status);
          const isLast = idx === steps.length - 1;

          // Determine connector line background
          const lineBg = step.status === 'SUCCESS' || step.status === 'COMPLETED'
            ? colors.line
            : 'bg-slate-800';

          return (
            <React.Fragment key={step.name}>
              {/* Step Circle Card */}
              <div className="flex-1 flex flex-row md:flex-col items-center text-left md:text-center group relative">
                <div className={`
                  flex items-center justify-center h-14 w-14 rounded-full border-2 transition-all duration-300 z-10
                  ${colors.bg} ${colors.glow}
                `}>
                  <StepIcon className="h-6 w-6" />
                </div>

                <div className="ml-4 md:ml-0 md:mt-3">
                  <h4 className="text-sm font-semibold text-slate-200 tracking-wide">{step.name}</h4>
                  <p className="text-xs text-slate-500 font-medium">{step.description}</p>
                  <span className="inline-block md:hidden mt-1">
                    <span className="text-[10px] uppercase font-bold tracking-widest opacity-80">{step.status}</span>
                  </span>
                </div>
              </div>

              {/* Connector line (Horizontal for desktop, Vertical not needed since flex layout on mobile piles them) */}
              {!isLast && (
                <div className="hidden md:block flex-1 h-0.5 relative mx-4">
                  <div className={`absolute inset-0 ${lineBg} h-full rounded transition-all duration-500`}></div>
                  {/* Glowing processing dot moving across line if next step is processing */}
                  {steps[idx + 1].status === 'PROCESSING' && (
                    <div className="absolute top-1/2 left-0 -translate-y-1/2 w-3 h-3 bg-cyan-400 rounded-full shadow-[0_0_8px_#22d3ee] animate-ping"></div>
                  )}
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default WorkflowProgress;
