import { ConformityDetail } from "./conformity.model";

export type ReceptionLotStatus =
  | 'APPROVED'
  | 'PENDING_APPROVAL'
  | 'REJECTED';

export type ReceptionMeasurementPoint =
  | 'START'
  | 'MIDDLE'
  | 'END';

export interface CreateReceptionLot {
  reception_id: number;
  product_id: number;
  lot_number: string;
  guide_number: string | null;
  expiration_date: string | null;
  lot_size: number | null;
  unit_count: number | null;
  lot_status?: ReceptionLotStatus;
  shelf_life_comments: string | null;
  document_type: string | null;
  document_number: string | null;
  quantity: number | null;
}

export interface CreateReceptionLotResult {
  reception_lot_id: number;
  lot_status: ReceptionLotStatus;
  shelf_life: boolean | null;
  requires_temperature: boolean;
  requires_visual_inspection: boolean;
  nonconformity_id: number | null;
  nonconformity_number: string | null;
  nonconformity_form_code: string | null;
}

export interface ReceptionTemperatureMeasurement {
  measurement_point: ReceptionMeasurementPoint;
  temperature_celsius: number;
  comments: string;
}

export interface ReceptionVisualInspection {
  inspected_units: number | null;
  compliant_units: number;
  non_compliant_units: number;
  comments: string;
}

export interface CreateReceptionLotEvaluation {
  reception_lot_id: number;
  temperature_measurements: ReceptionTemperatureMeasurement[];
  visual_inspection: ReceptionVisualInspection | null;
  document_type: string | null;
  document_number: string | null;
}

export interface ReceptionTemperatureMeasurementResult {
  measurement_point: ReceptionMeasurementPoint;
  temperature_celsius: number;
  comments: string;
}

export interface ReceptionVisualInspectionResult {
  inspected_units: number | null;
  compliant_units: number;
  non_compliant_units: number;
  comments: string | null;
}

export interface CreateReceptionLotEvaluationResult {
  reception_lot_id: number;
  lot_status: ReceptionLotStatus;
  temperature_measurements: ReceptionTemperatureMeasurementResult[];
  visual_inspection: ReceptionVisualInspectionResult | null;
  nonconformity_id: number | null;
  nonconformity_number: string | null;
  nonconformity_form_code: string | null;
  nonconformity_reason: string | null;
}

export interface ReceptionLotDetail {
  reception_lot_id: number;
  lot_number: string;
  product_reference: string;
  product_name: string | null;
  unit_of_measure: string;
  guide_number: string | null;
  expiration_date: string | null;
  lot_size: number | null;
  lot_size_unit: string | null;
  unit_count: number | null;
  shelf_life: boolean | null;
  shelf_life_comments: string | null;
  lot_status: string;
  visual_inspection: ReceptionVisualInspectionDetail | null;
  temperature_measurements: ReceptionTemperatureMeasurementDetail[];
  nonconformities: ConformityDetail[];
}

export interface ReceptionVisualInspectionDetail {
  compliant_units: number;
  non_compliant_units: number;
  comments: string | null;
}

export interface ReceptionTemperatureMeasurementDetail {
  temperature_measurement_id: number;
  measurement_point: string;
  temperature_celsius: number;
  temperature_status: string;
  comments: string | null;
}