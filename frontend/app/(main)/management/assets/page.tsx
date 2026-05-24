import { getAssets } from "@/actions/assets";
import { AssetManagementView } from "@/components/features/AssetManagementView";

export default async function AssetManagementPage() {
  const assets = await getAssets();

  return <AssetManagementView initialAssets={assets} />;
}
