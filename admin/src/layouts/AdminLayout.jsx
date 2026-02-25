import { Outlet } from 'react-router-dom'
import AdminTopNavbar from '../components/AdminTopNavbar'
import AdminSidebar from '../components/AdminSidebar'

export default function AdminLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminTopNavbar />
      <div className="flex pt-16">
        <AdminSidebar />
        <main className="flex-1 ml-64 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

