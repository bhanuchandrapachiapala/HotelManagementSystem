import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import AdminShell from './components/layout/AdminShell'
import LoginPage from './pages/admin/LoginPage'
import HomePage from './pages/admin/HomePage'
import BusinessCasePage from './pages/admin/BusinessCasePage'
import FrontDeskPage from './pages/admin/FrontDeskPage'
import DinnerAdminPage from './pages/admin/DinnerAdminPage'
import ReportsPage from './pages/admin/ReportsPage'
import HousekeepingPage from './pages/admin/HousekeepingPage'
import GroupContractsPage from './pages/admin/GroupContractsPage'
import InventoryPage from './pages/admin/InventoryPage'
import InspectionsPage from './pages/admin/InspectionsPage'
import ChecklistPage from './pages/public/ChecklistPage'
import FrontDeskChecklistPage from './pages/public/FrontDeskChecklistPage'
import DinnerMenuPage from './pages/public/DinnerMenuPage'
import HousekeepingStaffPage from './pages/public/HousekeepingStaffPage'
import GroupInquiryPage from './pages/public/GroupInquiryPage'
import InventoryStockCheckPage from './pages/public/InventoryStockCheckPage'
import InspectionFormPage from './pages/public/InspectionFormPage'

function ProtectedAdminShell() {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <AdminShell />
}

export default function App() {
  const { isAuthenticated } = useAuth()

  return (
    <Routes>
      <Route path="/" element={<Navigate to={isAuthenticated ? '/admin' : '/login'} replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/admin" element={<ProtectedAdminShell />}>
        <Route index element={<HomePage />} />
        <Route path="business" element={<BusinessCasePage />} />
        <Route path="frontdesk" element={<FrontDeskPage />} />
        <Route path="dinner" element={<DinnerAdminPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="housekeeping" element={<HousekeepingPage />} />
        <Route path="groups" element={<GroupContractsPage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="inspections" element={<InspectionsPage />} />
      </Route>
      <Route path="/checklist" element={<ChecklistPage />} />
      <Route path="/frontdesk" element={<FrontDeskChecklistPage />} />
      <Route path="/dinner" element={<DinnerMenuPage />} />
      <Route path="/housekeeping" element={<HousekeepingStaffPage />} />
      <Route path="/groups" element={<GroupInquiryPage />} />
      <Route path="/inventory" element={<InventoryStockCheckPage />} />
      <Route path="/inspection" element={<InspectionFormPage />} />
    </Routes>
  )
}
