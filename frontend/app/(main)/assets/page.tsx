import { getAssets } from "@/actions/assets";
import { AssetsView } from "@/components/features/AssetsView";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export default async function AssetsPage() {
  const assets = await getAssets();
  const session = await getServerSession(authOptions);
  const userRole = (session?.user as { role?: string })?.role;


  return <AssetsView assets={assets} userRole={userRole} />;
}

