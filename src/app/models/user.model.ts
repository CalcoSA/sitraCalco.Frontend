export interface User {
  idUser: number;
  wordpressUserId: number;
  userLogin: string;
  userName: string;
  statusUser: boolean;
  idRole: number;
  nameRole: string;
  statusRole: number;
  solutionCenterId?: number | null;
  solutionCenterCode?: string | null;
  solutionCenterName?: string | null;
}

export interface UserCreate {
  wordpressUserId: number;
  userLogin: string;
  userName: string;
  statusUser: boolean;
  idRole: number;
  solutionCenterId: number;
}

export interface UserUpdate {
  idUser: number;
  statusUser: boolean;
  idRole: number;
  solutionCenterId: number;
}

export interface SolutionCenter {
  solutionCenterId: number;
  solutionCenterCode: string;
  solutionCenterName: string;
}