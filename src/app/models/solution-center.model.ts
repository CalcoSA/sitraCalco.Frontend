export interface SolutionCenter {
  solutionCenterId: number;
  solutionCenterTypeId: number;
  solutionCenterTypeName: string;
  solutionCenterCode: string;
  solutionCenterName: string;
  isActive: boolean;
}

export interface SolutionCenterType {
  solution_center_type_id: number;
  solution_center_type_name: string;
}

export interface SolutionCenterCreate {
  solutionCenterTypeId: number;
  solutionCenterCode: string;
  solutionCenterName: string;
}

export interface SolutionCenterCreateResult {
  solutionCenterId: number;
}