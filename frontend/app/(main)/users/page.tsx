import { getUsers } from "@/actions/users";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserListTable } from "@/components/UserListTable";

export default async function UsersPage() {
  const users = await getUsers();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Quản lý tài khoản</h2>
        <p className="text-muted-foreground">Xem danh sách tài khoản nhân sự bệnh viện theo vai trò.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Danh sách Bác sĩ và Kỹ sư thiết bị</CardTitle>
        </CardHeader>
        <CardContent>
          <UserListTable users={users} />
        </CardContent>
      </Card>
    </div>
  );
}
