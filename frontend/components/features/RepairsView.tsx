"use client";

import { useState } from "react";
import { ServiceRequest, InventoryItem } from "@/types";
import { CompleteRepairModal } from "@/components/features/CompleteRepairModal";
import { startMaintenance } from "@/actions/repairs";
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
import { Wrench, Play } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { ExportButton } from "@/components/ui/ExportButton";

interface RepairsViewProps {
  initialRequests: ServiceRequest[];
  inventory: InventoryItem[];
}

export function RepairsView({ initialRequests, inventory }: RepairsViewProps) {
  const router = useRouter();
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleStartMaintenance = async (id: string | number) => {
    const result = await startMaintenance(id);
    if (result.success) {
      toast.success("Maintenance started. Asset status updated to UNDER_MAINTENANCE");
      router.refresh();
    } else {
      toast.error(result.message);
    }
  };

  const handleCompleteClick = (request: ServiceRequest) => {
    setSelectedRequest(request);
    setIsModalOpen(true);
  };

  const priorityOrder: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  
  const activeRequests = initialRequests
    .filter(r => r.status !== "COMPLETED")
    .sort((a, b) => priorityOrder[a.priority || 'LOW'] - priorityOrder[b.priority || 'LOW']);
  const completedRequests = initialRequests.filter(r => r.status === "COMPLETED");

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Repair Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Manage pending and assigned service requests.
          </p>
        </div>
        <div className="flex gap-2">
          <ExportButton url="http://localhost:8080/api/service-requests/export-critical" filename="critical_incidents.xlsx" label="Export Critical Log" />
          <ExportButton url="http://localhost:8080/api/service-requests/export" filename="service_requests_report.xlsx" label="Export Requests" />
        </div>
      </div>

      <div className="rounded-md border shadow-sm bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asset Name</TableHead>
              <TableHead>Reported By</TableHead>
              <TableHead>Issue Description</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Date Reported</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activeRequests.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No pending repairs found.
                </TableCell>
              </TableRow>
            ) : (
              activeRequests.map((req) => (
                <TableRow key={req.id}>
                  <TableCell className="font-medium">{req.assetName}</TableCell>
                  <TableCell>{req.reportedByUsername}</TableCell>
                  <TableCell className="max-w-xs truncate" title={req.description}>
                    {req.description}
                  </TableCell>
                  <TableCell>
                    {req.priority === 'CRITICAL' ? (
                      <Badge variant="destructive" className="animate-pulse">CRITICAL</Badge>
                    ) : (
                      <Badge variant="outline">{req.priority || 'LOW'}</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {req.createdAt ? formatDate(req.createdAt) : 'N/A'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={req.status === 'PENDING' ? 'destructive' : 'default'}>
                      {req.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {req.status === 'PENDING' ? (
                      <Button 
                        size="sm" 
                        variant="outline"
                        className="border-blue-500 text-blue-600 hover:bg-blue-50"
                        onClick={() => handleStartMaintenance(req.id)}
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Start
                      </Button>
                    ) : (
                      <Button 
                        size="sm" 
                        onClick={() => handleCompleteClick(req)}
                      >
                        <Wrench className="w-4 h-4 mr-2" />
                        Complete
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight">Repair History</h2>
        <div className="rounded-md border shadow-sm bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Asset Name</TableHead>
                <TableHead>Issue</TableHead>
                <TableHead>Resolution</TableHead>
                <TableHead>Parts Used</TableHead>
                <TableHead>Date Completed</TableHead>
                <TableHead className="text-right">Handover</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {completedRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No repair history available.
                  </TableCell>
                </TableRow>
              ) : (
                completedRequests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell className="font-medium">{req.assetName}</TableCell>
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
                        <span className="text-muted-foreground italic">No details provided</span>
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
                        <span className="text-xs text-muted-foreground">None</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {req.completedAt ? formatDate(req.completedAt) : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      <ExportButton 
                        url={`http://localhost:8080/api/service-requests/${req.id}/export-protocol`} 
                        filename={`handover_protocol_${req.id}.xlsx`} 
                        label="Protocol" 
                        size="sm"
                      />
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
    </div>
  );
}
