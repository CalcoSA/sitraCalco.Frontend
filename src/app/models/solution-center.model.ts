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

export interface SectionProductCreate {
  productId: number;
  sortOrder: number;
}

export interface SectionConfigurationCreate {
  sectionName: string;
  createdBy: string;
  products: SectionProductCreate[];
}

export interface SectionConfigurationCreateResult {
  sectionId: number;
}

export interface SolutionCenterDetail {
  solutionCenterId: number;
  solutionCenterTypeId: number;
  solutionCenterTypeName: string;
  solutionCenterCode: string;
  solutionCenterName: string;
  isActive: boolean;
  sections: SolutionCenterSection[];
}

export interface SolutionCenterSection {
  sectionId: number;
  sectionName: string;
  isActive: boolean;
  products: SolutionCenterSectionProduct[];
}

export interface SolutionCenterSectionProduct {
  solutionCenterProductId: number;
  productId: number;
  productName: string;
  reference: string;
  unitOfMeasure: string;
  planId: string | null;
  sortOrder: number;
  createdBy: string;
  createdAt: string;
}

export interface SolutionCenterStatusUpdate {
  isActive: boolean;
}