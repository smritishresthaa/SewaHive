import { Outlet } from 'react-router-dom'
import AdminTopNavbar from '../components/AdminTopNavbar'
import AdminSidebar from '../components/AdminSidebar'

export default function AdminLayout() {
  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <AdminTopNavbar />
      <div className="flex pt-6">
        <AdminSidebar />
        <main className="flex-1 ml-60 px-6 pb-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}