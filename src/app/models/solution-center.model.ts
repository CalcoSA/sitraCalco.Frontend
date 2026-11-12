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
  id_section: number;
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
  assignmentIsActive: boolean;
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

export interface SolutionCenterUpdate {
  solutionCenterCode: string;
  solutionCenterName: string;
}

export interface SolutionCenterUpdateResult {
  solutionCenterId: number;
  solutionCenterCode: string;
  solutionCenterName: string;
}

export interface SolutionCenterSectionAssignmentResult {
  solutionCenterId: number;
  sectionId: number;
  isActive: boolean;
}

export interface SolutionCenterSectionStatusUpdate {
  isActive: boolean;
}

export interface SolutionCenterProductOrderUpdate {
  newPosition: number;
}

export interface SolutionCenterProductOrderUpdateResult {
  solutionCenterProductId: number;
  newPosition: number;
}

export interface SolutionCenterSectionProductAdd {
  productId: number;
  position: number;
}

export interface SolutionCenterSectionProductAddResult {
  solutionCenterProductId: number;
  solutionCenterId: number;
  sectionId: number;
  productId: number;
  position: number;
}

export interface SolutionCenterSectionProductDeleteResult {
  solutionCenterProductId: number;
  solutionCenterId: number;
  sectionId: number;
}

export interface SolutionCenterSectionRemoveResult {
  solutionCenterId: number;
  sectionId: number;
  deletedProducts: number;
}