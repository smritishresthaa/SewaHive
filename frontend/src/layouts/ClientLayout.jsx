import ClientTopNavbar from "../components/Navbar/ClientTopNavbar";
import ClientSidebar from "../components/Navbar/ClientSidebar";

export default function ClientLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* Top Navbar */}
      <ClientTopNavbar />

      {/* Main Layout */}
      <div className="flex">

        {/* Sidebar */}
        <aside className="w-60 bg-white border-r min-h-screen">
          <ClientSidebar />
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          {children}
        </main>

      </div>
    </div>
  );
}
