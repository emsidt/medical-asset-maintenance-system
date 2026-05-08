export interface Asset {
  id: string | number;
  code: string;
  name: string;
  status: 'AVAILABLE' | 'BROKEN' | 'UNDER_MAINTENANCE';
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
  id: string;
  asset?: Asset;
  assetId?: string | number;
  assetName?: string;
  reportedBy?: User;
  reportedByUsername?: string;
  description: string;
  status: 'PENDING' | 'ASSIGNED' | 'COMPLETED';
  createdAt: string;
  completedAt?: string;
  logs?: ServiceLog[];
}

export interface InventoryItem {
  id: number;
  partName: string;
  quantity: number;
}

