import ClientTopNavbar from "../components/Navbar/ClientTopNavbar";
import ClientSidebar from "../components/Navbar/ClientSidebar";

export default function ClientLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navbar */}
      <ClientTopNavbar />

      {/* Main Layout */}
      <div className="flex w-full">
        {/* Sidebar
           ClientSidebar already handles:
           - desktop sidebar
           - mobile drawer
           - its own responsive visibility
        */}
        <ClientSidebar />

        {/* Main Content */}
        <main className="min-w-0 flex-1 px-4 py-4 sm:px-6 sm:py-6 lg:ml-60 lg:px-8 lg:py-8 xl:ml-64">
          {children}
        </main>
      </div>
    </div>
  );
}