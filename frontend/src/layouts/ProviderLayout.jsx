// src/layouts/ProviderLayout.jsx
import TopNavbar from "../components/Navbar/TopNavbar";
import ProviderSidebar from "../components/Navbar/ProviderSidebar";

export default function ProviderLayout({ children }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <TopNavbar />
      <div className="flex">
        <ProviderSidebar />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
