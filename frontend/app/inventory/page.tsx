import { getInventory } from "@/actions/repairs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { InventoryListTable } from "@/components/InventoryListTable";

export default async function InventoryPage() {
  const items = await getInventory();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Inventory</h2>
        <p className="text-muted-foreground">View remaining maintenance items and quantities.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Remaining Items</CardTitle>
        </CardHeader>
        <CardContent>
          <InventoryListTable items={items} />
        </CardContent>
      </Card>
    </div>
  );
}
