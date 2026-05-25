"use client";

import { useEffect, useState, useMemo } from "react";
import { ServiceRequest, InventoryItem, User } from "@/types";
import { assignRepair, getServiceRequests, getInventory, startMaintenance } from "@/actions/repairs";
import { getUsers } from "@/actions/users";
import { CompleteRepairModal } from "@/components/features/CompleteRepairModal";
import { AssignEngineerModal } from "@/components/features/AssignEngineerModal";
import { useSocket } from "@/components/providers/socket-provider";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Send, Wrench, Play } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";

export default function MaintenancePage() {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [engineers, setEngineers] = useState<User[]>([]);
  const { data: session } = useSession();
  
  // Create a compatible user object for the existing logic
  const currentUser = useMemo(() => {
    return session?.user ? {
      id: session.user.name, // The backend stores username in 'name' or 'id'
      username: session.user.name,
      role: (session.user as { role?: string }).role,
    } : null;
  }, [session]);

  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRequestForAssign, setSelectedRequestForAssign] = useState<ServiceRequest | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const shouldLoadUsers = currentUser?.role === "ADMIN";
        const [reqs, inv, users] = await Promise.all([
          getServiceRequests(),
          getInventory(),
          shouldLoadUsers ? getUsers() : Promise.resolve([])
        ]);
        setRequests(reqs);
        setInventory(inv);
        setEngineers(users.filter(user => user.role === "ENGINEER"));
      } catch (error) {
        console.error("Failed to load data", error);
      } finally {
        setLoading(false);
      }
    }
    
    if (currentUser) {
      loadData();
    }
  }, [currentUser]); // Initial load only, WebSocket handles real-time updates

  const { subscribe } = useSocket();

  useEffect(() => {
    const unsubscribe = subscribe("new-repair-request", (newRequest: ServiceRequest) => {
      setRequests((prev) => {
        const index = prev.findIndex((r) => r.id === newRequest.id);
        if (index > -1) {
          const updated = [...prev];
          updated[index] = newRequest;
          return updated;
        }
        return [newRequest, ...prev];
      });
    });
    return unsubscribe;
  }, [subscribe]);

  const handleStartMaintenance = async (id: string | number) => {
    const result = await startMaintenance(id);
    if (result.success) {
      toast.success("Đã tiếp nhận yêu cầu sửa chữa. Trạng thái thiết bị được cập nhật thành Đang bảo trì.");
      // Danh sách ServiceRequest sẽ tự động cập nhật qua WebSocket
    } else {
      toast.error(result.message || "Lỗi tiếp nhận yêu cầu sửa chữa.");
    }
  };

  const handleCompleteClick = (request: ServiceRequest) => {
    setSelectedRequest(request);
    setIsModalOpen(true);
  };

  const handleAssignClick = (request: ServiceRequest) => {
    setSelectedRequestForAssign(request);
    setIsAssignModalOpen(true);
  };

  const handleAssignSuccess = async () => {
    // Không cần gọi API, WebSocket sẽ tự update ServiceRequest.
  };

  const renderStatusBadge = (status: ServiceRequest['status']) => {
    switch (status) {
      case 'PENDING':
        return (
          <Badge className="bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 border font-medium">
            Chờ xử lý
          </Badge>
        );
      case 'ASSIGNED':
        return (
          <Badge className="bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 border font-medium">
            Đang sửa chữa
          </Badge>
        );
      case 'COMPLETED':
        return (
          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 border font-medium">
            Đã hoàn thành
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-pulse text-lg text-muted-foreground">Đang tải danh sách yêu cầu sửa chữa...</div>
      </div>
    );
  }

  const maintenanceRequests = requests.filter(r => r.description?.startsWith("Bảo trì định kỳ"));
  const activeRequests = maintenanceRequests.filter(r => r.status !== "COMPLETED");
  const completedRequests = maintenanceRequests.filter(r => r.status === "COMPLETED");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Bảo trì định kỳ</h1>
        <p className="text-muted-foreground mt-2">
          Quản lý các yêu cầu bảo dưỡng định kỳ hệ thống.
        </p>
      </div>

      <div className="rounded-md border shadow-sm bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tên thiết bị</TableHead>
              <TableHead>Người báo cáo</TableHead>
              <TableHead>Kỹ sư phụ trách</TableHead>
              <TableHead>Mô tả sự cố</TableHead>
              <TableHead>Ngày báo cáo</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead className="text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activeRequests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Không tìm thấy yêu cầu sửa chữa nào đang chờ.
                </TableCell>
              </TableRow>
            ) : (
              activeRequests.map((req) => {
                const isAssignedToMe = Number(req.assignedEngineerId) === Number(currentUser?.id) || 
                  (req.assignedEngineerUsername && req.assignedEngineerUsername === currentUser?.username);
                return (
                  <TableRow key={req.id}>
                    <TableCell className="font-medium">{req.asset?.name ?? req.assetName ?? 'N/A'}</TableCell>
                    <TableCell>{req.reportedBy?.username ?? req.reportedByUsername ?? 'N/A'}</TableCell>
                    <TableCell>{req.assignedEngineerUsername ?? 'Chưa phân công'}</TableCell>
                    <TableCell className="max-w-xs truncate" title={req.description}>
                      {req.description}
                    </TableCell>
                    <TableCell>
                      {req.createdAt ? formatDate(req.createdAt) : 'N/A'}
                    </TableCell>
                    <TableCell>
                      {renderStatusBadge(req.status)}
                    </TableCell>
                    <TableCell className="text-right">
                      {req.status === "PENDING" ? (
                        currentUser?.role === "ADMIN" ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAssignClick(req)}
                          >
                            <Send className="w-4 h-4 mr-2" />
                            Phân công
                          </Button>
                        ) : currentUser?.role === "ENGINEER" ? (
                          <Button 
                            size="sm" 
                            variant="outline"
                            className="border-blue-500 text-blue-600 hover:bg-blue-50"
                            onClick={() => handleStartMaintenance(req.id)}
                          >
                            <Play className="w-4 h-4 mr-2" />
                            Tiếp nhận
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            Chờ phân công
                          </span>
                        )
                      ) : req.status === "ASSIGNED" ? (
                        currentUser?.role === "ENGINEER" && isAssignedToMe ? (
                          <Button
                            size="sm"
                            onClick={() => handleCompleteClick(req)}
                          >
                            <Wrench className="w-4 h-4 mr-2" />
                            Hoàn thành
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground font-medium text-amber-700">
                            Đang thực hiện (Kỹ sư: {req.assignedEngineerUsername || "Chưa rõ"})
                          </span>
                        )
                      ) : (
                        <span className="text-xs text-emerald-600 font-semibold">
                          Hoàn thành
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight">Lịch sử sửa chữa</h2>
        <div className="rounded-md border shadow-sm bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên thiết bị</TableHead>
                <TableHead>Sự cố</TableHead>
                <TableHead>Phương án xử lý</TableHead>
                <TableHead>Linh kiện sử dụng</TableHead>
                <TableHead>Ngày hoàn thành</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {completedRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Không tìm thấy lịch sử sửa chữa.
                  </TableCell>
                </TableRow>
              ) : (
                completedRequests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell className="font-medium">{req.asset?.name ?? req.assetName ?? 'N/A'}</TableCell>
                    <TableCell className="max-w-xs truncate" title={req.description}>
                      {req.description}
                    </TableCell>
                    <TableCell className="max-w-xs">
                      {req.logs && req.logs.length > 0 ? (
                        <div>
                          <p className="text-sm font-semibold text-primary">{req.logs[0].engineerUsername}</p>
                          <p className="text-sm italic">&quot;{req.logs[0].resolutionDetails}&quot;</p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic">Không có chi tiết</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {req.logs && req.logs[0]?.usedParts?.length ? (
                        <div className="flex flex-wrap gap-1">
                          {req.logs[0].usedParts.map((p, i) => (
                            <Badge key={i} variant="outline" className="text-[10px]">
                              {p.partName} x{p.quantity}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">Không sử dụng</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {req.completedAt ? formatDate(req.completedAt) : 'N/A'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <CompleteRepairModal 
        request={selectedRequest}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        inventory={inventory}
      />

      <AssignEngineerModal
        request={selectedRequestForAssign}
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        engineers={engineers}
        onAssignSuccess={handleAssignSuccess}
        onAssignAction={assignRepair}
      />
    </div>
  );
}
