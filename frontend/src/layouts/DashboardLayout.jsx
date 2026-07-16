import { useCallback, useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { endpoints } from '../api/client.js';
import { BrandLogo } from '../components/BrandLogo.jsx';
import { LanguageSwitcher } from '../components/LanguageSwitcher.jsx';
import { Tabs } from '../components/Ui.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { roleHome, roleLabel, roleTone, tabLinks } from '../data/navigation.js';

export const DashboardLayout = ({ role = 'citizen' }) => {
  const { user, logout } = useAuth();
  const [unread, setUnread] = useState(0);

  const refreshUnread = useCallback(() => {
    endpoints.unreadNotificationCount().then((data) => setUnread(data.count)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!user || user.role !== role) return undefined;
    refreshUnread();
    const interval = setInterval(refreshUnread, 30000);
    return () => clearInterval(interval);
  }, [user, role, refreshUnread]);

  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={roleHome[user.role] || '/login'} replace />;

  const tone = roleTone[role];
  const tabs = (tabLinks[role] || tabLinks.citizen).map((link) => ({
    to: link.to,
    label: link.label,
    icon: link.icon,
    count: link.badge === 'unread' ? unread : 0
  }));

  return (
    <div>
      <div className="topbar">
        <BrandLogo compact to={roleHome[role]} />
        <span className="role-tag" style={{ background: tone.background, color: tone.color }}>
          <span aria-hidden="true">{tone.icon}</span> {roleLabel[role]}
        </span>
        <div className="spacer" />
        <LanguageSwitcher />
        <div className="who">
          <div className="who-r">{user.fullName}</div>
          <div className="who-e">{user.email}</div>
        </div>
        <button type="button" className="btn ghost sm" onClick={logout}>Logout</button>
      </div>

      <div className="page">
        <Tabs tabs={tabs} />
        <Outlet context={{ refreshUnread }} />
      </div>
    </div>
  );
};
