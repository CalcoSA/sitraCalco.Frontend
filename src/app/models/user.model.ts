export interface User {
  idUser: number;
  wordpressUserId: number;
  userLogin: string;
  userName: string;
  statusUser: boolean;
  idRole: number;
  nameRole: string;
  statusRole: number;
}

export interface UserCreate {
  wordpressUserId: number;
  userLogin: string;
  userName: string;
  statusUser: boolean;
  idRole: number;
}

export interface UserUpdate {
  idUser: number;
  statusUser: boolean;
  idRole: number;
}