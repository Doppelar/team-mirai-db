import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import ReportsPage from './pages/ReportsPage'
import ReportDetailPage from './pages/ReportDetailPage'
import ReportFormPage from './pages/ReportFormPage'
import MembersPage from './pages/MembersPage'
import AgendaPage from './pages/AgendaPage'
import ShortsPage from './pages/ShortsPage'
import LongVideosPage from './pages/LongVideosPage'
import LinksPage from './pages/LinksPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<ReportsPage />} />
          <Route path="shorts" element={<ShortsPage />} />
          <Route path="related-videos" element={<LongVideosPage />} />
          <Route path="long-videos" element={<LongVideosPage />} />
          <Route path="reports/new" element={<ReportFormPage />} />
          <Route path="reports/:id" element={<ReportDetailPage />} />
          <Route path="reports/:id/edit" element={<ReportFormPage />} />
          <Route path="members" element={<MembersPage />} />
          <Route path="agenda" element={<AgendaPage />} />
          <Route path="links" element={<LinksPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
