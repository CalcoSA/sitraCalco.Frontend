export interface Permission {
  permissionId: number;
  permissionKey: string;
  permissionValue: string;
}

export interface PermissionCreate {
  permissionKey: string;
  permissionValue: string;
}

export interface PermissionCreateResult {
  permissionId: number;
}

export interface PermissionUpdate {
  permissionKey: string;
  permissionValue: string;
}

export interface PermissionUpdateResult {
  permissionId: number;
  permissionKey: string;
  permissionValue: string;
}