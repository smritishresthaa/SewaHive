import { Outlet } from 'react-router-dom'
import AdminTopNavbar from '../components/AdminTopNavbar'
import AdminSidebar from '../components/AdminSidebar'

export default function AdminLayout() {
  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <AdminTopNavbar />

      <AdminSidebar />

      <main className="px-4 pb-6 pt-6 sm:px-6 lg:ml-60 lg:px-6">
        <Outlet />
      </main>
    </div>
  )
}