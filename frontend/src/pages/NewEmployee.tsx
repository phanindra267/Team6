import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import { createRequest } from '../services/api';
import GlassCard from '../components/GlassCard';
import { Sparkles, Loader2, ArrowLeft } from 'lucide-react';

const formSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  department: z.string().min(1, 'Please select a department'),
  designation: z.string().min(2, 'Designation must be at least 2 characters'),
  manager: z.string().min(2, 'Manager name must be at least 2 characters'),
  joiningDate: z.string().min(1, 'Joining date is required'),
  initiatedBy: z.string().min(2, 'Admin name must be at least 2 characters'),
});

type FormValues = z.infer<typeof formSchema>;

export const NewEmployee: React.FC = () => {
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      initiatedBy: 'HR Admin (Team 06)',
      joiningDate: new Date().toISOString().split('T')[0],
      department: 'Engineering',
    }
  });

  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      // Auto-generate request ID
      const requestId = `REQ-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
      return createRequest({
        ...values,
        requestId,
      });
    },
    onSuccess: (data) => {
      toast.success(`Onboarding workflow initiated for ${data.first_name}!`);
      navigate(`/details/${data.id}`);
    },
    onError: (error: any) => {
      const errMsg = error.response?.data?.message || error.message || 'Workflow initiation failed';
      toast.error(errMsg);
    }
  });

  const onSubmit = (values: FormValues) => {
    mutation.mutate(values);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Back to Dashboard */}
      <button 
        onClick={() => navigate('/')} 
        className="flex items-center space-x-2 text-slate-400 hover:text-slate-200 text-sm font-semibold transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Dashboard</span>
      </button>

      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-white bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
          Initiate Employee Onboarding
        </h1>
        <p className="text-slate-400 text-sm mt-1">
          Complete the details below to deploy the integration saga and write details to SuccessFactors & Slack.
        </p>
      </div>

      <GlassCard className="border-purple-500/10">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* First Name */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">First Name</label>
              <input 
                type="text" 
                {...register('firstName')} 
                className="glass-input" 
                placeholder="e.g. John" 
              />
              {errors.firstName && <span className="text-rose-400 text-xs mt-1 block">{errors.firstName.message}</span>}
            </div>

            {/* Last Name */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Last Name</label>
              <input 
                type="text" 
                {...register('lastName')} 
                className="glass-input" 
                placeholder="e.g. Doe" 
              />
              {errors.lastName && <span className="text-rose-400 text-xs mt-1 block">{errors.lastName.message}</span>}
            </div>

            {/* Email */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Email Address (Optional)</label>
              <input 
                type="email" 
                {...register('email')} 
                className="glass-input" 
                placeholder="e.g. john.doe@corp.com" 
              />
              {errors.email && <span className="text-rose-400 text-xs mt-1 block">{errors.email.message}</span>}
              <p className="text-[10px] text-slate-500 mt-1">
                Tip: Include <code className="text-purple-400 font-mono font-bold">fail-sf</code>, <code className="text-purple-400 font-mono font-bold">fail-slack-team</code>, or <code className="text-purple-400 font-mono font-bold">fail-slack-hr</code> in the email to trigger demo exceptions!
              </p>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Phone Number</label>
              <input 
                type="text" 
                {...register('phone')} 
                className="glass-input" 
                placeholder="e.g. 555-010-2345" 
              />
              {errors.phone && <span className="text-rose-400 text-xs mt-1 block">{errors.phone.message}</span>}
            </div>

            {/* Department */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Department</label>
              <select {...register('department')} className="glass-input cursor-pointer">
                <option value="Engineering">Engineering</option>
                <option value="Human Resources">Human Resources</option>
                <option value="Product Management">Product Management</option>
                <option value="Marketing">Marketing</option>
                <option value="Finance">Finance</option>
              </select>
              {errors.department && <span className="text-rose-400 text-xs mt-1 block">{errors.department.message}</span>}
            </div>

            {/* Designation */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Designation</label>
              <input 
                type="text" 
                {...register('designation')} 
                className="glass-input" 
                placeholder="e.g. Software Engineer II" 
              />
              {errors.designation && <span className="text-rose-400 text-xs mt-1 block">{errors.designation.message}</span>}
            </div>

            {/* Manager */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Reporting Manager</label>
              <input 
                type="text" 
                {...register('manager')} 
                className="glass-input" 
                placeholder="e.g. Sarah Jenkins" 
              />
              {errors.manager && <span className="text-rose-400 text-xs mt-1 block">{errors.manager.message}</span>}
            </div>

            {/* Joining Date */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Joining Date</label>
              <input 
                type="date" 
                {...register('joiningDate')} 
                className="glass-input cursor-pointer" 
              />
              {errors.joiningDate && <span className="text-rose-400 text-xs mt-1 block">{errors.joiningDate.message}</span>}
            </div>

            {/* Initiated By */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Initiated By</label>
              <input 
                type="text" 
                {...register('initiatedBy')} 
                className="glass-input" 
                placeholder="HR Admin Name" 
              />
              {errors.initiatedBy && <span className="text-rose-400 text-xs mt-1 block">{errors.initiatedBy.message}</span>}
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-4">
            <button
              type="submit"
              disabled={mutation.isPending}
              className="glow-btn w-full bg-gradient-to-r from-purple-600 via-purple-700 to-indigo-700 hover:from-purple-500 hover:to-indigo-600 text-white font-bold py-3.5 px-6 flex items-center justify-center space-x-2 border border-purple-500/30"
            >
              {mutation.isPending ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Initiating Saga Workflow Queue...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-5 w-5 text-purple-200" />
                  <span>Trigger Workflow Saga</span>
                </>
              )}
            </button>
          </div>
        </form>
      </GlassCard>
    </div>
  );
};

export default NewEmployee;
