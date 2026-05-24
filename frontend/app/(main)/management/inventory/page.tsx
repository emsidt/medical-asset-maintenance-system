import { getInventory } from "@/actions/repairs";
import { InventoryManagementView } from "@/components/features/InventoryManagementView";

export default async function InventoryManagementPage() {
  const inventory = await getInventory();

  return <InventoryManagementView initialInventory={inventory} />;
}
