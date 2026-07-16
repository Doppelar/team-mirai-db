import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import ReportsPage from './pages/ReportsPage'
import ReportDetailPage from './pages/ReportDetailPage'
import ReportFormPage from './pages/ReportFormPage'
import MembersPage from './pages/MembersPage'
import MemberActivityPage from './pages/MemberActivityPage'
import AgendaPage from './pages/AgendaPage'
import ShortsPage from './pages/ShortsPage'
import LongVideosPage from './pages/LongVideosPage'
import LinksPage from './pages/LinksPage'
import SearchPage from './pages/SearchPage'
import PartyOverviewPage from './pages/PartyOverviewPage'
import TopPage from './pages/TopPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<TopPage />} />
          <Route path="search" element={<SearchPage />} />
          <Route path="weekly-reports" element={<ReportsPage />} />
          <Route path="shorts" element={<ShortsPage />} />
          <Route path="related-videos" element={<LongVideosPage />} />
          <Route path="long-videos" element={<LongVideosPage />} />
          <Route path="party" element={<PartyOverviewPage />} />
          <Route path="reports/new" element={<ReportFormPage />} />
          <Route path="reports/:id" element={<ReportDetailPage />} />
          <Route path="reports/:id/edit" element={<ReportFormPage />} />
          <Route path="members" element={<MembersPage />} />
          <Route path="members/:id" element={<MemberActivityPage />} />
          <Route path="agenda" element={<AgendaPage />} />
          <Route path="links" element={<LinksPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
