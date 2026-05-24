export interface Asset {
  id: string | number;
  code: string;
  name: string;
  status: 'AVAILABLE' | 'BROKEN' | 'UNDER_MAINTENANCE' | 'MAINTENANCE_DUE';
  nextMaintenanceDate?: string;
  department?: Department | null;
  purchasePrice?: number | null;
  purchaseDate?: string | null;
  warrantyUntil?: string | null;
  replacementCost?: number | null;
}

export interface Department {
  id: string | number;
  code: string;
  name: string;
  createdAt?: string;
}


export interface FailureReportRequest {
  description: string;
}

export interface User {
  id?: string | number;
  username: string;
  role: 'ADMIN' | 'DOCTOR' | 'ENGINEER';
}

export interface AuthResponse {
  token: string;
  refreshToken: string;
  username: string;
  role: 'ADMIN' | 'DOCTOR' | 'ENGINEER';
}

export interface ApiResponse<T> {
  status: string;
  message: string;
  data: T;
}

export interface ServiceLogPart {
  partName: string;
  quantity: number;
}

export interface ServiceLog {
  id: number;
  engineerUsername: string;
  resolutionDetails: string;
  usedParts: ServiceLogPart[];
  additionalLogData?: string;
  createdAt: string;
}

export interface ServiceRequest {
  id: string | number;
  asset?: Asset;
  assetId?: string | number;
  assetName?: string;
  reportedBy?: User;
  reportedByUsername?: string;
  assignedEngineerId?: string | number;
  assignedEngineerUsername?: string;
  description: string;
  status: 'PENDING' | 'ASSIGNED' | 'COMPLETED';
  priority: RequestPriority;
  createdAt: string;
  completedAt?: string;
  logs?: ServiceLog[];
}

export interface InventoryItem {
  id: number;
  partName: string;
  quantity: number;
  minQuantity?: number;
  unitPrice?: number;
  unitCost?: number | null;
}

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';

export type RequestPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface AssetScore {
  assetId: number;
  assetCode: string;
  assetName: string;
  assetStatus: Asset['status'];
  departmentId?: number | null;
  departmentName?: string | null;
  repairCount90d: number;
  repairCount365d: number;
  avgDowntimeHours: number;
  usedPartQuantity365d: number;
  score: number;
  riskLevel: RiskLevel;
}

export interface DepartmentScore {
  departmentId: number;
  departmentCode: string;
  departmentName: string;
  assetCount: number;
  brokenAssetCount: number;
  repairCount90d: number;
  repairCount365d: number;
  avgDowntimeHours: number;
  usedPartQuantity365d: number;
  score: number;
  riskLevel: RiskLevel;
}

export interface FinancialSummary {
  assetCount: number;
  totalPurchaseValue: number;
  totalReplacementValue: number;
  totalPartsCost: number;
  totalLaborCost: number;
  totalRepairCost: number;
  repairToPurchaseRatioPercent: number;
}

export interface AssetFinancial {
  assetId: number;
  assetCode: string;
  assetName: string;
  departmentId?: number | null;
  departmentName?: string | null;
  purchasePrice: number;
  replacementCost: number;
  purchaseDate?: string | null;
  warrantyUntil?: string | null;
  repairCount: number;
  partsCost: number;
  laborCost: number;
  totalRepairCost: number;
  repairToPurchaseRatioPercent: number;
  replacementRecommended: boolean;
}

export interface DepartmentFinancial {
  departmentId: number;
  departmentCode: string;
  departmentName: string;
  assetCount: number;
  purchaseValue: number;
  replacementValue: number;
  repairCount: number;
  partsCost: number;
  laborCost: number;
  totalRepairCost: number;
  repairToPurchaseRatioPercent: number;
}

// Phase 5 - Dashboard types
export interface AssetStatistics {
  available: number;
  broken: number;
  underMaintenance: number;
  maintenanceDue: number;
  total: number;
}

export interface LowStockAlert {
  id: number;
  partName: string;
  quantity: number;
  threshold: number;
}

export interface DashboardStats {
  assetStats: AssetStatistics;
  lowStockAlerts: LowStockAlert[];
}

export interface MaintenanceSchedule {
  id: number;
  assetId: number;
  assetName: string;
  assetCode: string;
  scheduledDate: string;
  notes: string;
}

export interface NotificationDto {
  id: number;
  recipientId: number;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}
