export interface ReceptionType {
  reception_type_id: number;
  name: string;
  form_code: string | null;
  is_active: boolean | null;
}

export interface CreateReceptionType {
  name: string;
  form_code: string | null;
  is_active: boolean;
}

export interface UpdateReceptionType {
  name: string;
  form_code: string | null;
  is_active: boolean;
}