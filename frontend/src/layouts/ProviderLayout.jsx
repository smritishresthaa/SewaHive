import TopNavbar from "../components/Navbar/TopNavbar";
import ProviderSidebar from "../components/Navbar/ProviderSidebar";

export default function ProviderLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navbar */}
      <TopNavbar />

      {/* Main Layout */}
      <div className="flex w-full">
        {/* Sidebar
           ProviderSidebar already handles:
           - desktop sidebar
           - mobile drawer
           - its own responsive visibility
        */}
        <ProviderSidebar />

        {/* Main Content */}
        <main className="min-w-0 flex-1 px-4 py-4 sm:px-6 sm:py-6 lg:ml-60 lg:px-8 lg:py-8 xl:ml-64">
          {children}
        </main>
      </div>
    </div>
  );
}