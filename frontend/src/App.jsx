import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import ProtectedRoute from './layouts/ProtectedRoute';

import LoginPage          from './features/auth/LoginPage';
import DashboardPage      from './features/dashboard/DashboardPage';
import TicketsListPage    from './features/tickets/TicketsListPage';
import NewTicketPage      from './features/tickets/NewTicketPage';
import TicketDetailPage   from './features/tickets/TicketDetailPage';
import NotificationsPage  from './features/notifications/NotificationsPage';
import UsersPage          from './features/admin/UsersPage';
import AgenciesPage       from './features/admin/AgenciesPage';
import CategoriesPage     from './features/admin/CategoriesPage';
import ComplaintsPage     from './features/admin/ComplaintsPage';
import InterventionReportsPage from './features/admin/InterventionReportsPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
        <Route index               element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard"    element={<DashboardPage />} />
        <Route path="tickets"      element={<TicketsListPage />} />
        <Route path="tickets/new"  element={<ProtectedRoute roles={['USER']}><NewTicketPage /></ProtectedRoute>} />
        <Route path="tickets/:id"  element={<TicketDetailPage />} />
        <Route path="notifications" element={<NotificationsPage />} />

        <Route path="admin/users"      element={<ProtectedRoute roles={['ADMIN']}><UsersPage /></ProtectedRoute>} />
        <Route path="admin/agencies"   element={<ProtectedRoute roles={['ADMIN']}><AgenciesPage /></ProtectedRoute>} />
        <Route path="admin/categories" element={<ProtectedRoute roles={['ADMIN']}><CategoriesPage /></ProtectedRoute>} />
        <Route path="admin/complaints" element={<ProtectedRoute roles={['ADMIN']}><ComplaintsPage /></ProtectedRoute>} />
        <Route path="admin/intervention-reports" element={<ProtectedRoute roles={['ADMIN']}><InterventionReportsPage /></ProtectedRoute>} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
