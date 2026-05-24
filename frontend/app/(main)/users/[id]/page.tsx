import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, UserRound } from "lucide-react";
import { getUser } from "@/actions/users";
import { getServiceRequests } from "@/actions/repairs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/utils";
import { User } from "@/types";

interface UserDetailPageProps {
  params: {
    id: string;
  };
}

export default async function UserDetailPage({ params }: UserDetailPageProps) {
  const [user, requests] = await Promise.all([
    getUser(params.id),
    getServiceRequests(),
  ]);

  if (!user || !["DOCTOR", "ENGINEER"].includes(user.role)) {
    notFound();
  }

  const userRequests = requests.filter((request) => {
    if (user.role === "DOCTOR") {
      return (request.reportedBy?.username ?? request.reportedByUsername) === user.username;
    }

    return request.logs?.some((log) => log.engineerUsername === user.username);
  });

  const roleVariant = (role: User["role"]): "secondary" | "outline" =>
    role === "DOCTOR" ? "secondary" : "outline";

  const statusVariant = (status: "PENDING" | "ASSIGNED" | "COMPLETED"): "default" | "destructive" | "outline" =>
    status === "COMPLETED" ? "default" : status === "PENDING" ? "destructive" : "outline";

  const roleLabels: Record<string, string> = {
    DOCTOR: "Bác sĩ",
    ENGINEER: "Kỹ sư",
  };

  const statusLabels = {
    PENDING: "Chờ tiếp nhận",
    ASSIGNED: "Đang sửa chữa",
    COMPLETED: "Đã hoàn thành",
  };

  return (
    <div className="space-y-6">
      <Link
        href="/users"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Quay lại danh sách
      </Link>

      <div>
        <h2 className="text-2xl font-bold tracking-tight">Chi tiết nhân sự</h2>
        <p className="text-muted-foreground">Xem thông tin chi tiết tài khoản nhân viên.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-600">
              <UserRound className="h-5 w-5" />
            </span>
            {user.username}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border p-4">
              <dt className="text-sm text-muted-foreground">Mã ID nhân viên</dt>
              <dd className="mt-1 text-base font-medium">{user.id}</dd>
            </div>
            <div className="rounded-lg border p-4">
              <dt className="text-sm text-muted-foreground">Tên đăng nhập</dt>
              <dd className="mt-1 text-base font-medium">{user.username}</dd>
            </div>
            <div className="rounded-lg border p-4">
              <dt className="text-sm text-muted-foreground">Vai trò hệ thống</dt>
              <dd className="mt-2">
                <Badge variant={roleVariant(user.role)}>
                  {roleLabels[user.role] || user.role}
                </Badge>
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {user.role === "DOCTOR" ? "Lịch sử báo cáo sự cố" : "Lịch sử xử lý sửa chữa"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên thiết bị</TableHead>
                <TableHead>Sự cố chi tiết</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Ngày báo cáo</TableHead>
                <TableHead>Ngày hoàn thành</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {userRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    Không có lịch sử yêu cầu nào.
                  </TableCell>
                </TableRow>
              ) : (
                userRequests.map((request) => (
                  <TableRow key={request.id}>
                    <TableCell className="font-medium">
                      {request.asset?.name ?? request.assetName ?? "N/A"}
                    </TableCell>
                    <TableCell className="max-w-xs truncate" title={request.description}>
                      {request.description}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(request.status)}>
                        {statusLabels[request.status] || request.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {request.createdAt ? formatDate(request.createdAt) : "Không có"}
                    </TableCell>
                    <TableCell>
                      {request.completedAt ? formatDate(request.completedAt) : "Chưa hoàn thành"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
