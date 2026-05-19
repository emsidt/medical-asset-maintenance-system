import { getUsers } from "@/actions/users";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserListTable } from "@/components/UserListTable";

export default async function UsersPage() {
  const users = await getUsers();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">User Management</h2>
        <p className="text-muted-foreground">View hospital staff accounts by role.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Doctors and Engineers</CardTitle>
        </CardHeader>
        <CardContent>
          <UserListTable users={users} />
        </CardContent>
      </Card>
    </div>
  );
}
