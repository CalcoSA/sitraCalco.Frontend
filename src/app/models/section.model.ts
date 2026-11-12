export interface Section {
  sectionId: number;
  solutionCenterTypeId: number;
  solutionCenterTypeName: string;
  sectionName: string;
  isActive: boolean;
}

export interface SectionCreate {
  sectionName: string;
  solutionCenterTypeId: number;
}

export interface SectionCreateResult {
  sectionId: number;
}

export interface SectionUpdate {
  sectionName: string;
  isActive: boolean;
  solutionCenterTypeId: number;
}

export interface SectionUpdateResult {
  sectionId: number;
  sectionName: string;
  isActive: boolean;
}