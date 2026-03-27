// src/components/Dashboard/ClientHero.jsx
import { useAuth } from "../../context/AuthContext";

export default function ClientHero() {
  const { user } = useAuth();

  return (
    <section className="bg-brand-700 text-white p-10 rounded-2xl mt-6 shadow">
      <h2 className="text-3xl font-semibold">
        Welcome back, {user?.profile?.name || "Client"} 
      </h2>
      <p className="mt-2 text-white/80">
        What service do you need today?
      </p>
    </section>
  );
}
