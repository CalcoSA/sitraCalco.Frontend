export type ResponseModalSeverity =
  | 'success'
  | 'error'
  | 'warning'
  | 'info';

export interface ResponseModalData {
  severity: ResponseModalSeverity;
  title: string;
  message: string;
  buttonText?: string;
  confirmButtonText?: string;
  confirm?: boolean;
}

export interface ModalConfig {
  icon: string;
  color: string;
  backgroundColor: string;
}
