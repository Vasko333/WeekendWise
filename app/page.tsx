import Dashboard from "@/components/Dashboard";
import { listRecentSearches } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function Home() {
  const initialHistory = await listRecentSearches(10);
  return <Dashboard initialHistory={initialHistory} />;
}
