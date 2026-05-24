import { getServiceRequests } from "@/actions/repairs";
import { DashboardView } from "@/components/features/DashboardView";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function DashboardPage() {
  const requests = await getServiceRequests();
  const session = await getServerSession(authOptions);
  const userRole = (session?.user as { role?: string })?.role;


  return <DashboardView requests={requests} userRole={userRole} />;
}

