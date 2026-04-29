import ClientTopNavbar from "../components/Navbar/ClientTopNavbar";
import ClientSidebar from "../components/Navbar/ClientSidebar";
import SpotlightOnboarding from "../components/onboarding/SpotlightOnboarding";

export default function ClientLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navbar */}
      <ClientTopNavbar />

      {/* Main Layout */}
      <div className="flex flex-col lg:flex-row w-full">
        {/* Sidebar
           ClientSidebar already handles:
           - desktop sidebar
           - mobile drawer
           - its own responsive visibility
        */}
        <ClientSidebar />

        {/* Main Content */}
        <main data-onboarding="client-main" className="min-w-0 flex-1 px-4 py-4 sm:px-6 sm:py-6 lg:ml-60 lg:px-8 lg:py-8 xl:ml-64">
          {children}
        </main>

        <SpotlightOnboarding role="client" />
      </div>
    </div>
  );
}