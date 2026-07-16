import { Navigate, Route, Routes } from 'react-router-dom';
import { DashboardLayout } from './layouts/DashboardLayout.jsx';
import { ForgotPassword, ResetPassword } from './pages/auth/ForgotPassword.jsx';
import { Login } from './pages/auth/Login.jsx';
import { Register } from './pages/auth/Register.jsx';
import { AdminAuditLogs, AdminDashboard, AdminSetup, AdminUsers } from './pages/admin/AdminPages.jsx';
import {
  AdminComplaintReports,
  AdminComplaints,
  AssignedCases,
  ComplaintDetails,
  ComplaintNotifications,
  MyComplaints,
  SubmitComplaint
} from './pages/complaints/ComplaintPages.jsx';
import { Profile } from './pages/citizen/Profile.jsx';
import { PublicFeedback } from './pages/public/PublicFeedback.jsx';

const App = () => (
  <Routes>
    <Route index element={<Login />} />
    <Route path="login" element={<Login />} />
    <Route path="register" element={<Register />} />
    <Route path="forgot-password" element={<ForgotPassword />} />
    <Route path="reset-password" element={<ResetPassword />} />

    <Route path="app" element={<DashboardLayout role="citizen" />}>
      <Route index element={<Navigate to="/app/submit-complaint" replace />} />
      <Route path="dashboard" element={<Navigate to="/app/submit-complaint" replace />} />
      <Route path="submit-complaint" element={<SubmitComplaint />} />
      <Route path="complaints" element={<MyComplaints />} />
      <Route path="complaints/:trackingNumber" element={<ComplaintDetails />} />
      <Route path="feedback" element={<PublicFeedback />} />
      <Route path="notifications" element={<ComplaintNotifications />} />
      <Route path="profile" element={<Profile />} />
    </Route>

    <Route path="staff" element={<DashboardLayout role="staff" />}>
      <Route index element={<Navigate to="/staff/cases" replace />} />
      <Route path="dashboard" element={<Navigate to="/staff/cases" replace />} />
      <Route path="cases" element={<AssignedCases />} />
      <Route path="cases/:trackingNumber" element={<ComplaintDetails />} />
      <Route path="reports" element={<AdminComplaintReports />} />
      <Route path="feedback" element={<PublicFeedback />} />
      <Route path="notifications" element={<ComplaintNotifications />} />
    </Route>

    <Route path="admin" element={<DashboardLayout role="admin" />}>
      <Route index element={<Navigate to="/admin/dashboard" replace />} />
      <Route path="dashboard" element={<AdminDashboard />} />
      <Route path="complaints" element={<AdminComplaints />} />
      <Route path="complaints/:trackingNumber" element={<ComplaintDetails />} />
      <Route path="setup" element={<AdminSetup />} />
      <Route path="users" element={<AdminUsers />} />
      <Route path="reports" element={<AdminComplaintReports />} />
      <Route path="feedback" element={<PublicFeedback />} />
      <Route path="audit-logs" element={<AdminAuditLogs />} />
    </Route>

    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);

export default App;
