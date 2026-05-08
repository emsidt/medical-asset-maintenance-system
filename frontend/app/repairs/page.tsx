"use client";

import { useEffect, useState } from "react";
import { ServiceRequest, InventoryItem } from "@/types";
import { getServiceRequests, getInventory } from "@/app/actions/repairs";
import { CompleteRepairModal } from "@/components/CompleteRepairModal";
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
import { Wrench } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function RepairsPage() {
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<ServiceRequest | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [reqs, inv] = await Promise.all([
          getServiceRequests(),
          getInventory()
        ]);
        setRequests(reqs);
        setInventory(inv);
      } catch (error) {
        console.error("Failed to load data", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [isModalOpen]); // Reload when modal closes to show updated data

  const handleCompleteClick = (request: ServiceRequest) => {
    setSelectedRequest(request);
    setIsModalOpen(true);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-pulse text-lg text-muted-foreground">Loading repair requests...</div>
      </div>
    );
  }

  const activeRequests = requests.filter(r => r.status !== "COMPLETED");
  const completedRequests = requests.filter(r => r.status === "COMPLETED");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Repair Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Manage pending and assigned service requests.
        </p>
      </div>

      <div className="rounded-md border shadow-sm bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asset Name</TableHead>
              <TableHead>Reported By</TableHead>
              <TableHead>Issue Description</TableHead>
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
                  <TableCell className="font-medium">{req.asset?.name ?? req.assetName ?? 'N/A'}</TableCell>
                  <TableCell>{req.reportedBy?.username ?? req.reportedByUsername ?? 'N/A'}</TableCell>
                  <TableCell className="max-w-xs truncate" title={req.description}>
                    {req.description}
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
                    <Button 
                      size="sm" 
                      onClick={() => handleCompleteClick(req)}
                    >
                      <Wrench className="w-4 h-4 mr-2" />
                      Complete
                    </Button>
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {completedRequests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No repair history available.
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
                          <p className="text-sm italic">"{req.logs[0].resolutionDetails}"</p>
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

