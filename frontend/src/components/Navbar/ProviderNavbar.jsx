import TopNavbar from "./TopNavbar";
import ProviderSidebar from "./ProviderSidebar";

export default function ProviderNavbar() {
  return (
    <>
      <TopNavbar />
      <div className="flex w-full">
        <ProviderSidebar />
      </div>
    </>
  );
}