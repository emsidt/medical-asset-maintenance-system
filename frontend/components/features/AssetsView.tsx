"use client";

import { useState } from "react";
import { Asset, ServiceRequest, InventoryItem } from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ReportFailureForm } from "@/components/features/ReportFailureForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Play, Wrench, Loader2 } from "lucide-react";
import { getActiveRequests } from "@/actions/assets";
import { startMaintenance } from "@/actions/repairs";
import { CompleteRepairModal } from "@/components/features/CompleteRepairModal";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AssetsViewProps {
  assets: Asset[];
  inventory?: InventoryItem[];
  userRole?: string;
}

export function AssetsView({ assets, inventory = [], userRole }: AssetsViewProps) {
  const router = useRouter();
  const canReportFailure = ['ADMIN', 'DOCTOR'].includes(userRole || '');
  const isEngineer = userRole === 'ENGINEER';

  const [loadingAssetId, setLoadingAssetId] = useState<number | string | null>(null);
  
  // States cho modal Hoàn thành bảo trì
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);

  // States cho modal Chọn Request khi có nhiều request cùng lúc
  const [activeRequestsList, setActiveRequestsList] = useState<ServiceRequest[]>([]);
  const [isSelectRequestModalOpen, setIsSelectRequestModalOpen] = useState(false);

  const statusLabels: Record<Asset['status'], string> = {
    AVAILABLE: "Sẵn sàng",
    BROKEN: "Hỏng hóc",
    UNDER_MAINTENANCE: "Đang bảo trì",
    MAINTENANCE_DUE: "Đến hạn bảo trì",
  };

  const statusBadgeStyles: Record<Asset['status'], string> = {
    AVAILABLE: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 border font-medium",
    UNDER_MAINTENANCE: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 border font-medium",
    BROKEN: "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 border font-medium",
    MAINTENANCE_DUE: "bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100 border font-medium",
  };

  const handleActionClick = async (assetId: number | string, action: 'start' | 'complete') => {
    setLoadingAssetId(assetId);
    try {
      const requests = await getActiveRequests(assetId);
      
      if (requests.length === 0) {
        toast.error("Không tìm thấy phiếu yêu cầu nào đang chờ xử lý cho thiết bị này.");
        return;
      }

      // Lọc các request phù hợp với action
      const validRequests = requests.filter(r => 
        action === 'start' ? r.status === 'PENDING' : r.status === 'ASSIGNED'
      );

      if (validRequests.length === 0) {
        toast.error(`Không có phiếu nào ở trạng thái phù hợp để ${action === 'start' ? 'bắt đầu' : 'hoàn thành'}.`);
        return;
      }

      if (validRequests.length === 1) {
        // Chỉ có 1 phiếu, tiến hành luôn
        if (action === 'start') {
          await processStart(validRequests[0].id);
        } else {
          openCompleteModal(validRequests[0]);
        }
      } else {
        // Có nhiều phiếu, mở modal cho người dùng chọn
        setActiveRequestsList(validRequests);
        setIsSelectRequestModalOpen(true);
      }
    } catch {
      toast.error("Có lỗi xảy ra khi lấy thông tin phiếu.");
    } finally {
      setLoadingAssetId(null);
    }
  };

  const processStart = async (requestId: string | number) => {
    const result = await startMaintenance(requestId);
    if (result.success) {
      toast.success("Đã tiếp nhận xử lý thiết bị.");
      router.refresh();
      setIsSelectRequestModalOpen(false);
    } else {
      toast.error(result.message);
    }
  };

  const openCompleteModal = (request: ServiceRequest) => {
    setSelectedRequest(request);
    setIsCompleteModalOpen(true);
    setIsSelectRequestModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Danh mục thiết bị</h2>
          <p className="text-muted-foreground">Quản lý và theo dõi danh sách trang thiết bị y tế của bệnh viện.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tất cả thiết bị</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tên thiết bị</TableHead>
                <TableHead>Mã thiết bị</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Bảo trì tiếp theo</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assets.map((asset) => (
                <TableRow key={asset.id}>
                  <TableCell className="font-medium">{asset.name}</TableCell>
                  <TableCell>{asset.code}</TableCell>
                  <TableCell>
                    <Badge className={statusBadgeStyles[asset.status]}>
                      {statusLabels[asset.status] || asset.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {asset.nextMaintenanceDate ? (
                      <span className="text-sm">{formatDate(asset.nextMaintenanceDate)}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">Không có</span>
                    )}
                  </TableCell>

                  <TableCell className="text-right flex items-center justify-end gap-2">
                    {(asset.status === 'AVAILABLE' || asset.status === 'MAINTENANCE_DUE') && canReportFailure && (
                      <ReportFailureForm assetId={asset.id} assetName={asset.name} />
                    )}

                    {(asset.status === 'MAINTENANCE_DUE' || asset.status === 'BROKEN') && isEngineer && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-36 border-blue-500 text-blue-600 hover:bg-blue-50 ml-2"
                        onClick={() => handleActionClick(asset.id, 'start')}
                        disabled={loadingAssetId === asset.id}
                      >
                        {loadingAssetId === asset.id ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Play className="w-4 h-4 mr-2" />
                        )}
                        Xử lý
                      </Button>
                    )}

                    {asset.status === 'UNDER_MAINTENANCE' && isEngineer && (
                      <Button
                        size="sm"
                        className="w-36 bg-green-600 hover:bg-green-700 text-white ml-2"
                        onClick={() => handleActionClick(asset.id, 'complete')}
                        disabled={loadingAssetId === asset.id}
                      >
                        {loadingAssetId === asset.id ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Wrench className="w-4 h-4 mr-2" />
                        )}
                        Hoàn thành
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal Hoàn thành sửa chữa */}
      <CompleteRepairModal
        request={selectedRequest}
        isOpen={isCompleteModalOpen}
        onClose={() => setIsCompleteModalOpen(false)}
        inventory={inventory}
      />

      {/* Modal Chọn Phiếu nếu có nhiều phiếu cùng lúc */}
      <Dialog open={isSelectRequestModalOpen} onOpenChange={setIsSelectRequestModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chọn phiếu yêu cầu để xử lý</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Thiết bị này đang có nhiều phiếu yêu cầu cùng lúc. Vui lòng chọn phiếu bạn muốn thao tác:
            </p>
            <div className="space-y-2">
              {activeRequestsList.map(req => (
                <div key={req.id} className="flex items-center justify-between p-3 border rounded-md hover:bg-muted/50">
                  <div>
                    <p className="font-medium text-sm">{req.description}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Người báo: {req.reportedByUsername || 'Hệ thống'} • Tạo lúc: {req.createdAt ? formatDate(req.createdAt) : 'N/A'}
                    </p>
                  </div>
                  <Button 
                    size="sm" 
                    onClick={() => {
                      if (req.status === 'PENDING') {
                        processStart(req.id);
                      } else {
                        openCompleteModal(req);
                      }
                    }}
                  >
                    Chọn
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
