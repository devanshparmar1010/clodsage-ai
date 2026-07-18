import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Lightbulb,
  Server,
  TrendingUp,
  FileText,
  Cloud,
  Upload,
  MessageSquare,
} from 'lucide-react';
import { cn } from '../../lib/utils';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/recommendations', label: 'Recommendations', icon: Lightbulb },
  { to: '/resources', label: 'Resources', icon: Server },
  { to: '/forecast', label: 'Forecast', icon: TrendingUp },
  { to: '/reports', label: 'Reports', icon: FileText },
  { to: '/chat', label: 'Chat', icon: MessageSquare },
];

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const isLive = location.pathname.startsWith('/aws');

  const navItems = NAV_ITEMS.map((item) => ({
    ...item,
    to: isLive ? `/aws${item.to}` : item.to,
  }));

  const handleSwitchSource = (live: boolean) => {
    const currentPath = location.pathname;
    let targetPath = '';
    
    if (live) {
      targetPath = currentPath.startsWith('/aws') ? currentPath : `/aws${currentPath}`;
    } else {
      targetPath = currentPath.startsWith('/aws') ? currentPath.replace('/aws', '') : currentPath;
    }
    
    localStorage.setItem('cloudsight_live_mode', live ? 'true' : 'false');
    navigate(targetPath || '/dashboard');
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col border-r border-zinc-800 bg-zinc-950">
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b border-zinc-800 px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
          <Cloud className="h-4 w-4 text-white" />
        </div>
        <div>
          <span className="text-sm font-semibold text-zinc-100">CloudSight</span>
          <span className="ml-1 text-sm font-light text-blue-400">AI</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                'group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'text-zinc-100 bg-zinc-800/80'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-lg bg-zinc-800/80"
                  transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
                />
              )}
              <item.icon className="relative z-10 h-4 w-4" />
              <span className="relative z-10">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Data Source Switcher */}
      <div className="border-t border-zinc-800 p-4">
        <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider block mb-2">Data Source</span>
        <div className="grid grid-cols-2 gap-1 bg-zinc-900 rounded-lg p-1 border border-zinc-850 mb-3">
          <button
            onClick={() => handleSwitchSource(false)}
            className={cn(
              'px-2 py-1.5 text-xs font-medium rounded transition-colors',
              !isLive
                ? 'bg-zinc-800 text-zinc-100'
                : 'text-zinc-500 hover:text-zinc-300'
            )}
          >
            CSV Upload
          </button>
          <button
            onClick={() => handleSwitchSource(true)}
            className={cn(
              'px-2 py-1.5 text-xs font-medium rounded transition-colors',
              isLive
                ? 'bg-zinc-800 text-zinc-100'
                : 'text-zinc-500 hover:text-zinc-300'
            )}
          >
            Live AWS
          </button>
        </div>
        <NavLink
          to="/"
          className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-500"
        >
          <Upload className="h-4 w-4" />
          Upload Data
        </NavLink>
      </div>
    </aside>
  );
}
