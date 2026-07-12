import { useEffect, useRef, useState } from 'react';
import { NavLink, Navigate, Outlet, useLocation } from 'react-router-dom';
import { Bell, LogOut, Menu, PlusCircle, X } from 'lucide-react';
import { BrandLogo } from '../components/BrandLogo.jsx';
import { LanguageSwitcher } from '../components/LanguageSwitcher.jsx';
import { sidebarLinks, roleHome } from '../data/navigation.js';
import { useAuth } from '../context/AuthContext.jsx';
import { endpoints } from '../api/client.js';

const titles = {
  citizen: 'Citizen Workspace',
  staff: 'Administrative Staff Workspace',
  admin: 'Admin Dashboard'
};

const roleLabel = (role) => ({
  citizen: 'Citizen',
  staff: 'Administrative Staff',
  admin: 'Admin'
}[role] || 'Citizen');

export const DashboardLayout = ({ role = 'citizen' }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const notifRef = useRef(null);

  useEffect(() => {
    if (!user || user.role !== role) return undefined;
    const load = () => endpoints.unreadNotificationCount().then((data) => setUnreadCount(data.count)).catch(() => {});
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [user, role]);

  useEffect(() => {
    const handleClick = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) setNotifOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={roleHome[user.role] || '/login'} replace />;

  const links = sidebarLinks[role] || sidebarLinks.citizen;
  const page = links.find((link) => location.pathname.startsWith(link.to));

  const openNotifications = async () => {
    setNotifOpen((open) => !open);
    if (!notifOpen) {
      const data = await endpoints.complaintNotifications().catch(() => []);
      setNotifications(data.slice(0, 6));
    }
  };

  const markRead = async (id, dbId) => {
    await endpoints.readNotification(dbId).catch(() => {});
    setNotifications((items) => items.map((item) => (item.id === id ? { ...item, read: true } : item)));
    setUnreadCount((count) => Math.max(0, count - 1));
  };

  const sidebar = (
    <>
      <div className="border-b border-slate-100 px-5 py-5">
        <BrandLogo />
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
            >
              <Icon size={17} />
              <span className="flex-1">{link.label}</span>
              {link.badge && <span className="rounded-md bg-brand-600 px-1.5 py-0.5 text-[10px] font-bold text-white">{link.badge}</span>}
            </NavLink>
          );
        })}
      </nav>
      <div className="p-4">
        <div className="card flex items-center gap-3 p-3">
          <img src={user?.avatar || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=80'} alt={user?.fullName} className="h-10 w-10 rounded-full object-cover" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-slate-950">{user?.fullName}</p>
            <p className="truncate text-xs text-slate-500">{roleLabel(user?.role || role)}</p>
          </div>
        </div>
        <button onClick={logout} className="sidebar-link mt-2 w-full">
          <LogOut size={17} />
          Logout
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-slate-200 bg-white lg:flex lg:flex-col">
        {sidebar}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-slate-950/40" aria-label="Close menu" onClick={() => setMobileOpen(false)} />
          <aside className="relative flex h-full w-72 flex-col border-r border-slate-200 bg-white shadow-soft">
            <button className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-md border border-slate-200 text-slate-600" aria-label="Close menu" onClick={() => setMobileOpen(false)}>
              <X size={17} />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
          <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3">
              <button onClick={() => setMobileOpen(true)} className="grid h-9 w-9 place-items-center rounded-md border border-slate-200 text-slate-600 lg:hidden" aria-label="Open menu">
                <Menu size={18} />
              </button>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{titles[role]}</p>
                <h1 className="text-lg font-bold text-slate-950">{page?.label || 'Dashboard'}</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <LanguageSwitcher />
              <div className="relative" ref={notifRef}>
                <button onClick={openNotifications} className="relative grid h-9 w-9 place-items-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50" aria-label="Notifications">
                  <Bell size={17} />
                  {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">{unreadCount}</span>
                  )}
                </button>
                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-80 max-w-[90vw] rounded-md border border-slate-200 bg-white p-2 shadow-soft">
                    {notifications.length === 0 && <p className="p-3 text-sm text-slate-500">No notifications yet.</p>}
                    {notifications.map((notification) => (
                      <button
                        key={notification.id}
                        onClick={() => markRead(notification.id, notification.dbId)}
                        className={`block w-full rounded-md p-3 text-left text-sm hover:bg-slate-50 ${notification.read ? '' : 'bg-blue-50'}`}
                      >
                        <p className="font-bold text-slate-900">{notification.title}</p>
                        <p className="mt-1 text-xs text-slate-500">{notification.message}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {role === 'citizen' && (
                <NavLink to="/app/submit-complaint" className="btn-primary hidden sm:inline-flex">
                  <PlusCircle size={16} />
                  Submit Complaint
                </NavLink>
              )}
            </div>
          </div>
        </header>
        <main className="px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
