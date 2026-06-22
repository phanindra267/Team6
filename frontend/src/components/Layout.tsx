import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  UserPlus, 
  History, 
  RotateCcw, 
  AlertOctagon, 
  Activity, 
  Layers, 
  Menu, 
  X 
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);
  const [user, setUser] = React.useState<{firstName: string, lastName: string} | null>(null);

  React.useEffect(() => {
    const userData = localStorage.getItem('onboarding_user');
    if (!userData) {
      window.location.href = '/login';
    } else {
      setUser(JSON.parse(userData));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('onboarding_user');
    window.location.href = '/login';
  };

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'New Employee', path: '/new-employee', icon: UserPlus },
    { name: 'Workflow History', path: '/history', icon: History },
    { name: 'Retry Center', path: '/retry-center', icon: RotateCcw },
    { name: 'Failure Monitoring', path: '/failures', icon: AlertOctagon },
    { name: 'System Health', path: '/health', icon: Activity },
  ];

  const currentPath = location.pathname;

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background-dark relative">
      {/* Background Neon Orbs */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-purple-600/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-600/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* Mobile Header */}
      <header className="md:hidden w-full flex items-center justify-between px-6 py-4 glass-panel border-b border-white/5 z-50">
        <div className="flex items-center space-x-2">
          <Layers className="h-6 w-6 text-purple-500 animate-pulse" />
          <span className="font-bold text-lg tracking-wider text-slate-100 bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">INTEGRTR × TEAM 06</span>
        </div>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="text-slate-400 hover:text-white transition-colors"
        >
          {isSidebarOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </header>

      {/* Sidebar Navigation */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 glass-panel m-4 rounded-3xl flex flex-col justify-between transform transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:h-[calc(100vh-2rem)]
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div>
          {/* Logo Brand */}
          <div className="hidden md:flex items-center space-x-3 px-6 py-8 border-b border-white/5">
            <div className="p-2 bg-purple-500/10 rounded-lg border border-purple-500/20">
              <Layers className="h-6 w-6 text-purple-400 animate-pulse" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-base tracking-wide text-slate-100 bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">
                INTEGRTR × LPU
              </span>
              <span className="text-xs text-purple-400/70 font-semibold tracking-wider uppercase">
                Team 06 Onboarder
              </span>
            </div>
          </div>

          {/* Nav Items */}
          <nav className="mt-8 px-4 space-y-1.5 flex-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPath === item.path;
              return (
                <Link
                  key={item.name}
                  to={item.path}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`
                    flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 group
                    ${isActive 
                      ? 'bg-purple-600/20 text-purple-300 border border-purple-500/30 shadow-[0_0_15px_rgba(139,92,246,0.1)]' 
                      : 'text-slate-400 hover:bg-white/5 hover:text-slate-200 border border-transparent'}
                  `}
                >
                  <Icon className={`h-5 w-5 transition-transform duration-200 group-hover:scale-110 ${isActive ? 'text-purple-400' : 'text-slate-400'}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Workspace Footer */}
        <div className="p-6 border-t border-white/5 bg-slate-950/20">
          <div className="flex flex-col space-y-4">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                <span className="text-purple-400 font-bold text-sm">
                  {user ? user.firstName.charAt(0) + user.lastName.charAt(0) : 'U'}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-slate-200 font-medium">{user ? `${user.firstName} ${user.lastName}` : 'User'}</span>
                <span className="text-[10px] text-emerald-400/80 font-bold uppercase tracking-wider flex items-center gap-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping"></div>
                  Online
                </span>
              </div>
            </div>
            
            <button 
              onClick={handleLogout}
              className="w-full py-2.5 flex items-center justify-center space-x-2 rounded-xl text-sm font-medium text-white bg-rose-500/20 hover:bg-rose-500/40 border border-rose-500/30 transition-colors"
            >
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto h-screen p-6 md:p-10 relative z-10">
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
