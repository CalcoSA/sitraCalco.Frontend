import { MenuOption } from './menu-option.model';

export interface Role {
  idRole: number;
  nameRole: string;
  statusRole: number;
}

export interface RoleDetail extends Role {
  menuOptions: MenuOption[];
}

export interface RoleCreate {
  nameRole: string;
  statusRole: number;
  menuOptionIds: number[];
}

export interface RoleUpdate {
  idRole: number;
  nameRole: string;
  statusRole: number;
  menuOptionIds: number[];
}