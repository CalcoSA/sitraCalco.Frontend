import { ReceptionLotDetail } from "./reception-lot.model";
import { ConformityDetail } from "./conformity.model";

export interface CreateReception {
  reception_type_id: number;
  supplier_id: number;
  is_compliant: boolean;
  comments: string;
}

export interface CreateReceptionResult {
  reception_id: number;
  reception_number: string;
  status: string;
}

export interface ReceptionDetail {
  reception_id: number;
  reception_number: string;
  reception_type_name: string;
  reception_type_form_code: string | null;
  supplier_code: string;
  supplier_name: string;
  reception_date: string;
  status: string;
  transport_is_compliant: boolean | null;
  transport_comments: string | null;
  lots: ReceptionLotDetail[];
  nonconformities: ConformityDetail[];
}