export interface Conformity {}

export interface ConformityDetail {
  nonconformity_id: number;
  nonconformity_number: string;
  reception_type_name: string;
  reception_type_form_code: string | null;
  reason_type: string;
  quantity: number | null;
  document_type: string | null;
  document_number: string | null;
  observations: string;
  status: string;
}
