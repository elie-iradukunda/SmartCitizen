import {
  BarChart3,
  Bell,
  CheckSquare,
  Gauge,
  Home,
  Inbox,
  ListChecks,
  LockKeyhole,
  LogIn,
  MessageSquare,
  PlusCircle,
  ShieldCheck,
  SlidersHorizontal,
  Tags,
  User,
  Users
} from 'lucide-react';

export const publicLinks = [
  { label: 'Home', to: '/', icon: Home },
  { label: 'Login', to: '/login', icon: LogIn },
  { label: 'Contact', to: '/contact', icon: MessageSquare }
];

export const sidebarLinks = {
  citizen: [
    { label: 'Dashboard', to: '/app/dashboard', icon: Gauge },
    { label: 'Submit Complaint', to: '/app/submit-complaint', icon: PlusCircle },
    { label: 'Track Status', to: '/app/complaints', icon: Inbox },
    { label: 'Responses', to: '/app/notifications', icon: Bell },
    { label: 'Profile', to: '/app/profile', icon: User }
  ],
  staff: [
    { label: 'Dashboard', to: '/staff/dashboard', icon: Gauge },
    { label: 'Assigned Cases', to: '/staff/cases', icon: ListChecks },
    { label: 'Classify & Assign', to: '/staff/all-cases', icon: CheckSquare },
    { label: 'Respond / Update', to: '/staff/respond', icon: MessageSquare },
    { label: 'Escalations', to: '/staff/escalations', icon: ShieldCheck },
    { label: 'Reports', to: '/staff/reports', icon: BarChart3 },
    { label: 'Notifications', to: '/staff/notifications', icon: Bell }
  ],
  admin: [
    { label: 'Dashboard', to: '/admin/dashboard', icon: Gauge },
    { label: 'Complaint Register', to: '/admin/complaints', icon: Inbox },
    { label: 'Users & Roles', to: '/admin/users', icon: Users },
    { label: 'Categories & SLA', to: '/admin/categories', icon: Tags },
    { label: 'Complaint Routing', to: '/admin/routing', icon: SlidersHorizontal },
    { label: 'System Security', to: '/admin/security', icon: ShieldCheck },
    { label: 'Reports & Analytics', to: '/admin/reports', icon: BarChart3 },
    { label: 'Audit Logs', to: '/admin/audit-logs', icon: LockKeyhole }
  ]
};

export const roleHome = {
  citizen: '/app/dashboard',
  staff: '/staff/dashboard',
  admin: '/admin/dashboard'
};
