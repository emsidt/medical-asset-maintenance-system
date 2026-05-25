import { getAssetScores, getDepartmentScores } from "@/actions/analytics";
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
import { AssetScore, DepartmentScore, RiskLevel } from "@/types";
import { Activity, Building2, Gauge, Wrench } from "lucide-react";

const statusLabels: Record<string, string> = {
  AVAILABLE: "Sẵn sàng",
  BROKEN: "Hỏng hóc",
  UNDER_MAINTENANCE: "Đang bảo trì",
  MAINTENANCE_DUE: "Đến hạn bảo trì",
};

const statusBadgeStyles: Record<string, string> = {
  AVAILABLE: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 border font-medium",
  UNDER_MAINTENANCE: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 border font-medium",
  BROKEN: "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 border font-medium",
  MAINTENANCE_DUE: "bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100 border font-medium",
};

function getRiskStyles(riskLevel: RiskLevel): string {
  switch (riskLevel) {
    case "VERY_HIGH":
      return "bg-red-100 text-red-800 border-red-200 hover:bg-red-200 font-bold";
    case "HIGH":
      return "bg-orange-100 text-orange-800 border-orange-200 hover:bg-orange-200 font-semibold";
    case "MEDIUM":
      return "bg-yellow-100 text-yellow-800 border-yellow-200 hover:bg-yellow-200 font-medium";
    default:
      return "bg-green-100 text-green-800 border-green-200 hover:bg-green-200 font-medium";
  }
}

function formatRisk(riskLevel: RiskLevel) {
  return riskLevel.replace("_", " ");
}

import { ExportButton } from "@/components/ui/ExportButton";

export default async function AnalyticsPage() {
  const [assetScores, departmentScores] = await Promise.all([
    getAssetScores(),
    getDepartmentScores(),
  ]);

  const totalRepairs90d = departmentScores.reduce((sum, item) => sum + item.repairCount90d, 0);
  const brokenAssets = departmentScores.reduce((sum, item) => sum + item.brokenAssetCount, 0);
  const highestDepartment = departmentScores[0];
  const highestAsset = assetScores[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Maintenance Analytics</h2>
          <p className="text-muted-foreground">Score assets and departments from repair history.</p>
        </div>
        <ExportButton url="http://localhost:8080/api/analytics/export" filename="maintenance_analytics.xlsx" label="Export Analytics" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Repairs 90 Days</CardTitle>
            <Wrench className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalRepairs90d}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Broken Assets</CardTitle>
            <Activity className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{brokenAssets}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Highest Department</CardTitle>
            <Building2 className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="truncate text-2xl font-bold">{highestDepartment?.score ?? 0}</div>
            <p className="truncate text-xs text-muted-foreground">
              {highestDepartment?.departmentName ?? "No data"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Highest Asset</CardTitle>
            <Gauge className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="truncate text-2xl font-bold">{highestAsset?.score ?? 0}</div>
            <p className="truncate text-xs text-muted-foreground">
              {highestAsset?.assetName ?? "No data"}
            </p>
          </CardContent>
        </Card>
      </div>

      <DepartmentScoreTable scores={departmentScores} />
      <AssetScoreTable scores={assetScores} />
    </div>
  );
}

function DepartmentScoreTable({ scores }: { scores: DepartmentScore[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Department Scores</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Department</TableHead>
              <TableHead>Assets</TableHead>
              <TableHead>Broken</TableHead>
              <TableHead>Repairs 90d</TableHead>
              <TableHead>Repairs 365d</TableHead>
              <TableHead>Avg Downtime</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Risk</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {scores.map((score) => (
              <TableRow key={score.departmentId}>
                <TableCell className="font-medium">
                  {score.departmentName}
                  <div className="text-xs text-muted-foreground">{score.departmentCode}</div>
                </TableCell>
                <TableCell>{score.assetCount}</TableCell>
                <TableCell>{score.brokenAssetCount}</TableCell>
                <TableCell>{score.repairCount90d}</TableCell>
                <TableCell>{score.repairCount365d}</TableCell>
                <TableCell>{score.avgDowntimeHours}h</TableCell>
                <TableCell className="font-semibold">{score.score}</TableCell>
                <TableCell>
                  <Badge className={getRiskStyles(score.riskLevel)}>{formatRisk(score.riskLevel)}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function AssetScoreTable({ scores }: { scores: AssetScore[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Asset Scores</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asset</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Repairs 90d</TableHead>
              <TableHead>Repairs 365d</TableHead>
              <TableHead>Parts 365d</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Risk</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {scores.map((score) => (
              <TableRow key={score.assetId}>
                <TableCell className="font-medium">
                  {score.assetName}
                  <div className="text-xs text-muted-foreground">{score.assetCode}</div>
                </TableCell>
                <TableCell>{score.departmentName ?? "Unassigned"}</TableCell>
                <TableCell>
                  <Badge className={statusBadgeStyles[score.assetStatus] || "bg-gray-100 text-gray-800"}>
                    {statusLabels[score.assetStatus] || score.assetStatus.replace("_", " ")}
                  </Badge>
                </TableCell>
                <TableCell>{score.repairCount90d}</TableCell>
                <TableCell>{score.repairCount365d}</TableCell>
                <TableCell>{score.usedPartQuantity365d}</TableCell>
                <TableCell className="font-semibold">{score.score}</TableCell>
                <TableCell>
                  <Badge className={getRiskStyles(score.riskLevel)}>{formatRisk(score.riskLevel)}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
