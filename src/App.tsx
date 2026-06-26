import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import ReportsPage from './pages/ReportsPage'
import ReportDetailPage from './pages/ReportDetailPage'
import ReportFormPage from './pages/ReportFormPage'
import MembersPage from './pages/MembersPage'
import AgendaPage from './pages/AgendaPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<ReportsPage />} />
          <Route path="reports/new" element={<ReportFormPage />} />
          <Route path="reports/:id" element={<ReportDetailPage />} />
          <Route path="reports/:id/edit" element={<ReportFormPage />} />
          <Route path="members" element={<MembersPage />} />
          <Route path="agenda" element={<AgendaPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
