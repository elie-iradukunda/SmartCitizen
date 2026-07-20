// One tab bar per role. Everything else (updating a case, responding, escalating,
// rating) happens inside the case card itself, so there is nothing else to navigate to.
export const tabLinks = {
  citizen: [
    { label: 'Submit Complaint', to: '/app/submit-complaint', icon: '+' },
    { label: 'My Complaints', to: '/app/complaints', icon: '#' },
    { label: 'Citizen Feedback', to: '/app/feedback', icon: '*' },
    { label: 'Notifications', to: '/app/notifications', icon: '!', badge: 'unread' },
    { label: 'Profile', to: '/app/profile', icon: '@' }
  ],
  staff: [
    { label: 'Assigned to Me', to: '/staff/cases', icon: '>' },
    { label: 'Reports', to: '/staff/reports', icon: '%' },
    { label: 'Citizen Feedback', to: '/staff/feedback', icon: '*' },
    { label: 'Notifications', to: '/staff/notifications', icon: '!', badge: 'unread' }
  ],
  admin: [
    { label: 'Overview', to: '/admin/dashboard', icon: '%' },
    { label: 'All Complaints', to: '/admin/complaints', icon: '#' },
    { label: 'Reports', to: '/admin/reports', icon: '$' },
    { label: 'Citizen Feedback', to: '/admin/feedback', icon: '*' },
    { label: 'Categories, SLA & Routing', to: '/admin/setup', icon: '*' },
    { label: 'Users & Roles', to: '/admin/users', icon: '@' },
    { label: 'Audit Log', to: '/admin/audit-logs', icon: '=' }
  ]
};

export const roleLabel = {
  citizen: 'Citizen',
  staff: 'Administrative Staff',
  admin: 'Admin'
};

export const roleTone = {
  citizen: { background: '#e0f2fe', color: '#0ea5e9', icon: '@' },
  staff: { background: '#e0f2fe', color: '#0284c7', icon: '>' },
  admin: { background: '#ede9fe', color: '#7c3aed', icon: '$' }
};

export const roleHome = {
  citizen: '/app/submit-complaint',
  staff: '/staff/cases',
  admin: '/admin/dashboard'
};

export const publicLinks = [
  { label: 'Home', to: '/' },
  { label: 'About', to: '/about' },
  { label: 'Contact', to: '/contact' },
  { label: 'Login', to: '/login' }
];
