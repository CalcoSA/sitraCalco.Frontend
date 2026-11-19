import { InventoryCountNumber } from '../models/inventory.model';
import { Injectable } from '@angular/core';
import { Workbook } from 'exceljs';

export type InventoryExcelCountStatus = | 'GUARDADO' | 'POR SINCRONIZAR';

export interface InventoryExcelExportCount {
  countNumber: InventoryCountNumber;
  status: InventoryExcelCountStatus;
  value: number | null;
  open: number | null;
  closed: number | null;
  multiplicationValue: number | null;
}

export interface InventoryExcelExportProduct {
  reference: string;
  productName: string;
  unitOfMeasure: string;
  counts: Partial<Record<InventoryCountNumber, InventoryExcelExportCount>>;
}

export interface InventoryExcelExportData {
  solutionCenterCode: string;
  solutionCenterName: string;
  solutionCenterTypeId: number;
  solutionCenterTypeName: string;
  inventoryConfigurationName: string;
  sectionName: string;
  inventoryExecutionId: string | null;
  countNumbers: InventoryCountNumber[];
  products: InventoryExcelExportProduct[];
}

@Injectable({
  providedIn: 'root',
})

export class InventoryExcelExportService {

  async exportInventory(data: InventoryExcelExportData): Promise<void> {

    if (data.countNumbers.length === 0) {
      throw new Error('No existen conteos finalizados para exportar.');
    }

    if (data.products.length === 0) {
      throw new Error('No existen productos para exportar.');
    }

    const workbook = new Workbook();

    workbook.creator = 'SITRA CALCO';
    workbook.lastModifiedBy = 'SITRA CALCO';
    workbook.created = new Date();
    workbook.modified = new Date();

    const isWarehouse = data.solutionCenterTypeId === 1;
    const columnsPerCount = isWarehouse ? 3 : 4;
    const totalColumns = 3 + (data.countNumbers.length * columnsPerCount);

    const worksheet =
      workbook.addWorksheet(
        'Inventario',
        {
          views: [
            {
              state: 'frozen',
              ySplit: 10,
              xSplit: 3,
            },
          ],
          pageSetup: {
            orientation: 'landscape',
            fitToPage: true,
            fitToWidth: 1,
            fitToHeight: 0,
          },
        }
      );

    worksheet.mergeCells(1, 1, 1, totalColumns);

    const titleCell = worksheet.getCell(1, 1);

    titleCell.value = 'SITRA CALCO S.A. - INVENTARIO';

    titleCell.font = {
      bold: true,
      size: 18,
      color: {
        argb: 'FFFFFFFF',
      },
    };

    titleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: {
        argb: 'FF4B2E1F',
      },
    };

    titleCell.alignment = {
      horizontal: 'center',
      vertical: 'middle',
    };

    worksheet.getRow(1).height = 32;
    worksheet.getCell('A3').value = 'Centro de solución';
    worksheet.getCell('B3').value = `${data.solutionCenterCode} - ${data.solutionCenterName}`;
    worksheet.getCell('A4').value = 'Tipo';
    worksheet.getCell('B4').value = data.solutionCenterTypeName;
    worksheet.getCell('A5').value = 'Inventario';
    worksheet.getCell('B5').value = data.inventoryConfigurationName;
    worksheet.getCell('A6').value = 'Sección';
    worksheet.getCell('B6').value = data.sectionName;
    worksheet.getCell('A7').value = 'Ejecución';
    worksheet.getCell('B7').value = data.inventoryExecutionId ?? 'Pendiente de sincronización';
    worksheet.getCell('A8').value = 'Fecha de exportación';
    worksheet.getCell('B8').value = this.formatDateTime(new Date());

    for (let rowNumber = 3; rowNumber <= 8; rowNumber++) {

      const labelCell = worksheet.getCell(rowNumber, 1);

      labelCell.font = {
        bold: true,
        color: {
          argb: 'FF4B2E1F',
        },
      };

      labelCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: {
          argb: 'FFF7E8D8',
        },
      };
    }

    const groupHeaderRowNumber = 9;
    const columnHeaderRowNumber = 10;

    worksheet.mergeCells(groupHeaderRowNumber, 1, columnHeaderRowNumber, 1);
    worksheet.getCell(groupHeaderRowNumber, 1).value = 'Referencia';
    worksheet.mergeCells(groupHeaderRowNumber, 2, columnHeaderRowNumber, 2);
    worksheet.getCell(groupHeaderRowNumber, 2).value = 'Producto';
    worksheet.mergeCells(groupHeaderRowNumber, 3, columnHeaderRowNumber, 3);
    worksheet.getCell(groupHeaderRowNumber, 3).value = 'Unidad de medida';

    let currentColumn = 4;

    for (const countNumber of data.countNumbers) {
      const startColumn = currentColumn;
      const endColumn = currentColumn + columnsPerCount - 1;

      worksheet.mergeCells(groupHeaderRowNumber, startColumn, groupHeaderRowNumber, endColumn);
      worksheet.getCell(groupHeaderRowNumber, startColumn).value = `Conteo ${countNumber}`;

      if (isWarehouse) {
        worksheet.getCell(columnHeaderRowNumber, currentColumn).value = 'Valor';
        worksheet.getCell(columnHeaderRowNumber, currentColumn + 1).value = 'Factor';
        worksheet.getCell(columnHeaderRowNumber, currentColumn + 2).value = 'Estado';
      } else {
        worksheet.getCell(columnHeaderRowNumber, currentColumn).value = 'Abierto';
        worksheet.getCell(columnHeaderRowNumber, currentColumn + 1).value = 'Cerrado';
        worksheet.getCell(columnHeaderRowNumber, currentColumn + 2).value = 'Factor';
        worksheet.getCell(columnHeaderRowNumber, currentColumn + 3).value = 'Estado';
      }

      currentColumn += columnsPerCount;
    }

    for (let rowNumber = groupHeaderRowNumber; rowNumber <= columnHeaderRowNumber; rowNumber++) {
      const row = worksheet.getRow(rowNumber);

      row.height = 27;

      for (let column = 1; column <= totalColumns; column++) {
        const cell = row.getCell(column);

        cell.font = {
          bold: true,
          color: {
            argb: 'FF4B2E1F',
          },
        };

        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: {
            argb: 'FFF7E8D8',
          },
        };

        cell.alignment = {
          horizontal: 'center',
          vertical: 'middle',
          wrapText: true,
        };

        cell.border = {
          top: {
            style: 'thin',
            color: {
              argb: 'FFE0CDBB',
            },
          },
          left: {
            style: 'thin',
            color: {
              argb: 'FFE0CDBB',
            },
          },
          bottom: {
            style: 'thin',
            color: {
              argb: 'FFE0CDBB',
            },
          },
          right: {
            style: 'thin',
            color: {
              argb: 'FFE0CDBB',
            },
          },
        };
      }
    }

    let rowNumber = 11;

    for (const product of data.products) {
      const row = worksheet.getRow(rowNumber);

      row.getCell(1).value = product.reference;
      row.getCell(1).numFmt = '@';
      row.getCell(2).value = product.productName;
      row.getCell(3).value = product.unitOfMeasure;

      currentColumn = 4;

      for (const countNumber of data.countNumbers) {

        const count = product.counts[countNumber];

        if (isWarehouse) {
          row.getCell(currentColumn).value = count?.value ?? null;
          row.getCell(currentColumn + 1).value = count?.multiplicationValue ?? null;
          row.getCell(currentColumn + 2).value = count ? this.getStatusLabel(count.status) : null;
        } else {
          row.getCell(currentColumn).value = count?.open ?? null;
          row.getCell(currentColumn + 1).value = count?.closed ?? null;
          row.getCell(currentColumn + 2).value = count?.multiplicationValue ?? null;
          row.getCell(currentColumn + 3).value = count ? this.getStatusLabel(count.status) : null;
        }

        currentColumn += columnsPerCount;
      }

      for (let column = 1; column <= totalColumns; column++) {
        const cell = row.getCell(column);

        cell.alignment = {
          vertical: 'middle',
          horizontal:
            column <= 3
              ? 'left'
              : 'center',
          wrapText: true,
        };

        cell.border = {
          bottom: {
            style: 'thin',
            color: {
              argb: 'FFEBE6E2',
            },
          },
        };

        if (column >= 4 && typeof cell.value === 'number') {
          cell.numFmt = '#,##0.####';
        }
      }

      row.height = 24;

      rowNumber++;
    }

    worksheet.getColumn(1).width = 16;
    worksheet.getColumn(2).width = 34;
    worksheet.getColumn(3).width = 24;

    for (let column = 4; column <= totalColumns; column++) {
      worksheet.getColumn(column).width = 18;
    }

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([ buffer as BlobPart, ], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = this.buildFileName(data);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  private getStatusLabel(status: InventoryExcelCountStatus): string {
    return status === 'GUARDADO' ? 'Guardado' : 'Por sincronizar';
  }

  private formatDateTime(date: Date): string {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    return (`${day}/${month}/${year} ` + `${hours}:${minutes}`);
  }

  private buildFileName(data: InventoryExcelExportData): string {
    const now = new Date();
    const date = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0'),].join('');
    const center = this.sanitizeFileName(data.solutionCenterCode);
    const inventory = this.sanitizeFileName(data.inventoryConfigurationName);
    const section = this.sanitizeFileName(data.sectionName);

    return (
      `Inventario_` +
      `${center}_` +
      `${inventory}_` +
      `${section}_` +
      `${date}.xlsx`
    );
  }

  private sanitizeFileName(value: string): string {
    return value
      .normalize('NFD')
      .replace(
        /[\u0300-\u036f]/g,
        ''
      )
      .replace(
        /[^a-zA-Z0-9_-]+/g,
        '_'
      )
      .replace(
        /^_+|_+$/g,
        ''
      );
  }
}