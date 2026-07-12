import { Navigate, Route, Routes } from 'react-router-dom';
import { DashboardLayout } from './layouts/DashboardLayout.jsx';
import { PublicLayout } from './layouts/PublicLayout.jsx';
import { ForgotPassword, VerifyOtp } from './pages/auth/ForgotPassword.jsx';
import { Login } from './pages/auth/Login.jsx';
import { Register } from './pages/auth/Register.jsx';
import {
  AdminAuditLogs,
  AdminDashboard,
  AdminSetup,
  AdminSettings,
  AdminUsers
} from './pages/admin/AdminPages.jsx';
import {
  AdminComplaintReports,
  AdminComplaints,
  AdminRoutingRules,
  AssignedCases,
  ComplaintDetails,
  ComplaintNotifications,
  ComplaintOfficerDashboard,
  ComplaintTypeManagement,
  MyComplaints,
  StaffClassifyAssign,
  StaffEscalations,
  StaffRespondUpdate,
  SubmitComplaint
} from './pages/complaints/ComplaintPages.jsx';
import { CitizenDashboard } from './pages/citizen/CitizenDashboard.jsx';
import { Profile } from './pages/citizen/Profile.jsx';
import { Home } from './pages/public/Home.jsx';
import { About, Contact } from './pages/public/StaticPublicPage.jsx';

const App = () => (
  <Routes>
    <Route element={<PublicLayout />}>
      <Route index element={<Home />} />
      <Route path="about" element={<About />} />
      <Route path="contact" element={<Contact />} />
    </Route>

    <Route path="login" element={<Login />} />
    <Route path="register" element={<Register />} />
    <Route path="forgot-password" element={<ForgotPassword />} />
    <Route path="verify-otp" element={<VerifyOtp />} />

    <Route path="app" element={<DashboardLayout role="citizen" />}>
      <Route index element={<Navigate to="/app/dashboard" replace />} />
      <Route path="dashboard" element={<CitizenDashboard />} />
      <Route path="complaints" element={<MyComplaints />} />
      <Route path="complaints/:trackingNumber" element={<ComplaintDetails />} />
      <Route path="submit-complaint" element={<SubmitComplaint />} />
      <Route path="notifications" element={<ComplaintNotifications />} />
      <Route path="profile" element={<Profile />} />
    </Route>

    <Route path="staff" element={<DashboardLayout role="staff" />}>
      <Route index element={<Navigate to="/staff/dashboard" replace />} />
      <Route path="dashboard" element={<ComplaintOfficerDashboard />} />
      <Route path="cases" element={<AssignedCases />} />
      <Route path="cases/:trackingNumber" element={<ComplaintDetails />} />
      <Route path="all-cases" element={<StaffClassifyAssign />} />
      <Route path="respond" element={<StaffRespondUpdate />} />
      <Route path="escalations" element={<StaffEscalations />} />
      <Route path="reports" element={<AdminComplaintReports />} />
      <Route path="notifications" element={<ComplaintNotifications />} />
    </Route>

    <Route path="admin" element={<DashboardLayout role="admin" />}>
      <Route index element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="dashboard" element={<AdminDashboard />} />
      <Route path="setup" element={<AdminSetup />} />
      <Route path="complaints" element={<AdminComplaints />} />
      <Route path="complaints/:trackingNumber" element={<ComplaintDetails />} />
      <Route path="users" element={<AdminUsers />} />
      <Route path="categories" element={<ComplaintTypeManagement />} />
      <Route path="routing" element={<AdminRoutingRules />} />
      <Route path="security" element={<AdminSettings />} />
      <Route path="reports" element={<AdminComplaintReports />} />
      <Route path="audit-logs" element={<AdminAuditLogs />} />
      <Route path="settings" element={<AdminSettings />} />
    </Route>

    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

export default App;
