import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar.jsx'
import ToastContainer from './components/ToastContainer.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Upload from './pages/Upload.jsx'
import VideoDetail from './pages/VideoDetail.jsx'
import Search from './pages/Search.jsx'

export default function App() {
  return (
    <div className="layout">
      <Sidebar />
      <div className="main">
        <Routes>
          <Route path="/"            element={<Dashboard />} />
          <Route path="/upload"      element={<Upload />} />
          <Route path="/video/:id"   element={<VideoDetail />} />
          <Route path="/search"      element={<Search />} />
        </Routes>
      </div>
      <ToastContainer />
    </div>
  )
}
