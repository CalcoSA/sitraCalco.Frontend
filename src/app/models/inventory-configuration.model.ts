export interface InventoryConfigurationOption {
  solutionCenterId?: number;
  solutionCenterTypeId?: number;
  solutionCenterTypeName?: string;
  solutionCenterCode?: string;
  solutionCenterName?: string;
  sectionId?: number;
  sectionName?: string;
  isActive: boolean;
}

export interface SolutionCenterInventoryConfigurations {
  solutionCenterId: number;
  solutionCenterTypeId: number;
  solutionCenterTypeName: string;
  solutionCenterCode: string;
  solutionCenterName: string;
  isActive: boolean;
  configurations: InventoryConfigurationDetail[];
}

export interface InventoryConfigurationDetail {
  inventoryConfigurationId: number;
  inventoryConfigurationName: string;
  startDay: number | null;
  endDay: number | null;
  daysOfWeek: InventoryConfigurationDay[];
  days: string[];
  sections: InventoryConfigurationSection[];
}

export interface InventoryConfigurationSection {
  sectionId: number;
  sectionName: string;
  sectionIsActive: boolean;
  isActive: boolean;
}

export interface InventoryConfigurationCreate {
  inventoryConfigurationName: string;
  startDay: number | null;
  endDay: number | null;
}

export interface InventoryConfigurationCreateResult {
  inventoryConfigurationId: number;
}

export interface InventoryConfigurationDaysCreate {
  days: string[];
}

export interface InventoryConfigurationDaysCreateResult {
  inventoryConfigurationId: number;
  daysCreated: number;
  days: string[];
}

export interface InventoryConfigurationDay {
  inventoryConfigurationDayId: number;
  dayOfWeek: string;
}

export interface InventoryConfigurationListItem {
  daysOfWeek: InventoryConfigurationDay[];
  inventoryConfigurationId: number;
  inventoryConfigurationName: string;
  startDay: number | null;
  endDay: number | null;
}

export interface InventoryConfigurationUpdate {
  inventoryConfigurationName: string;
  startDay: number | null;
  endDay: number | null;
}

export interface InventoryConfigurationUpdateResult {
  inventoryConfigurationId: number;
  inventoryConfigurationName: string;
  startDay: number | null;
  endDay: number | null;
}

export interface InventoryConfigurationDayDeleteResult {
  inventoryConfigurationId: number;
  day: string;
}

export interface InventoryConfigurationSolutionCenter {
  solutionCenterId: number;
  solutionCenterTypeId: number;
  solutionCenterTypeName: string;
  solutionCenterCode: string;
  solutionCenterName: string;
  isActive: boolean;
  sections: InventoryConfigurationSolutionCenterSection[];
}

export interface InventoryConfigurationSolutionCenterSection {
  sectionId: number;
  solutionCenterTypeId: number;
  sectionName: string;
  isActive: boolean;
}

export interface InventoryConfigurationAssignment {
  solutionCenterId: number;
  sectionId: number;
}

export interface InventoryConfigurationAssignmentsCreate {
  assignments: InventoryConfigurationAssignment[];
}

export interface InventoryConfigurationAssignmentsCreateResult {
  inventoryConfigurationId: number;
  assignmentsCreated: number;
}

export interface InventoryConfigurationAssignmentDeleteResult {
  inventoryConfigurationId: number;
  solutionCenterId: number;
  sectionId: number;
}

export interface InventoryConfigurationSectionDetail {
  sectionId: number;
  sectionName: string;
  isActive: boolean;
  solutionCenters: InventoryConfigurationSectionSolutionCenter[];
}

export interface InventoryConfigurationSectionSolutionCenter {
  solutionCenterId: number;
  solutionCenterTypeId: number;
  solutionCenterTypeName: string;
  solutionCenterCode: string;
  solutionCenterName: string;
  isActive: boolean;
}

export interface InventoryConfigurationSolutionCenterDeleteResult {
  inventoryConfigurationId: number;
  solutionCenterId: number;
  deletedAssignments: number;
}

export interface InventoryAvailableOption {
  inventoryConfigurationId: number;
  inventoryConfigurationName: string;
}

export interface InventoryAvailableSectionOption {
  sectionId: number;
  sectionName: string;
}