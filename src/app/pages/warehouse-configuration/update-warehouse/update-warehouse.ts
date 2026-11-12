import { SolutionCenterDetail, SolutionCenterType, SolutionCenterSection, SolutionCenterSectionProduct } from '../../../models/solution-center.model';
import { CdkDragDrop, DragDropModule, moveItemInArray, } from '@angular/cdk/drag-drop';
import { SolutionCenterService } from '../../../services/solution-center.service';
import { ResponseModalService } from '../../../services/response-modal.service';
import { FormBuilder, FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { debounceTime, distinctUntilChanged, finalize } from 'rxjs';
import { ProductSearchResult } from '../../../models/product.model';
import { SectionService } from '../../../services/section.service';
import { ProductService } from '../../../services/product.service';
import { Component, inject, OnInit, signal } from '@angular/core';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatExpansionModule } from '@angular/material/expansion';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { ActivatedRoute, Router } from '@angular/router';
import { MatInputModule } from '@angular/material/input';
import { Section } from '../../../models/section.model';
import { MatIconModule } from '@angular/material/icon';
import { DestroyRef } from '@angular/core';

@Component({
  selector: 'app-update-warehouse',
  standalone: true,
  imports: [
    MatProgressSpinnerModule,
    MatAutocompleteModule,
    MatSlideToggleModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatExpansionModule,
    MatTooltipModule,
    MatSelectModule,
    MatButtonModule,
    MatInputModule,
    DragDropModule,
    MatIconModule,
  ],
  templateUrl: './update-warehouse.html',
})

export class UpdateWarehouse implements OnInit {

  private readonly solutionCenterService = inject(SolutionCenterService);
  private readonly responseModalService = inject(ResponseModalService);
  private readonly sectionService = inject(SectionService);
  private readonly productService = inject(ProductService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);  

  private readonly productSearchControls = new Map<number, FormControl<string | ProductSearchResult | null>>();

  readonly solutionCenterId = Number(this.route.snapshot.paramMap.get('solutionCenterId'));

  readonly productResults = signal<Record<number, ProductSearchResult[]>>({});
  readonly solutionCenterDetail = signal<SolutionCenterDetail | null>(null);
  readonly searchingProductSectionId = signal<number | null>(null);
  readonly solutionCenterTypes = signal<SolutionCenterType[]>([]);
  readonly updatingSectionStatusId = signal<number | null>(null);
  readonly updatingProductOrderId = signal<number | null>(null);
  readonly addingProductSectionId = signal<number | null>(null);
  readonly removingSectionId = signal<number | null>(null);
  readonly removingProductId = signal<number | null>(null);  
  readonly availableSections = signal<Section[]>([]); 

  readonly loadingAvailableSections = signal(false);
  readonly assigningSection = signal(false);
  readonly loading = signal(false);
  readonly saving = signal(false);

  validationError = '';

  readonly sectionToAssignControl = this.formBuilder.nonNullable.control(0);
  readonly solutionCenterForm =
    this.formBuilder.nonNullable.group({
      solutionCenterTypeId: [
        {
          value: 0,
          disabled: true,
        }
      ],
      solutionCenterCode: [''],
      solutionCenterName: [''],
    });

  ngOnInit(): void {
    if (!this.solutionCenterId || this.solutionCenterId <= 0) {
      this.responseModalService.show('error', 'Bodega no válida', 'No fue posible identificar la bodega que deseas actualizar.');
      this.cancel();
      return;
    }
    this.loadData();
  }

  private loadData(): void {
    this.loading.set(true);
    this.solutionCenterService
      .getTypes()
      .subscribe({
        next: (response) => {

          if (response.isSuccess) {
            this.solutionCenterTypes.set(response.result ?? []);
          }

          this.loadSolutionCenter();
        },

        error: () => {
          this.solutionCenterTypes.set([]);
          this.loadSolutionCenter();
        },
      });
  }

  private loadSolutionCenter(): void {
    this.solutionCenterService
      .getById(this.solutionCenterId)
      .pipe(
        finalize(() => {
          this.loading.set(false);
        })
      )
      .subscribe({
        next: (response) => {

          if (!response.isSuccess || !response.result) {
            this.responseModalService.show('error', 'Error al consultar', response.message || 'No fue posible consultar la bodega.');
            return;
          }

          const detail: SolutionCenterDetail = {
            ...response.result,
            sections: response.result.sections.map(section => ({
              ...section,
              products: [...section.products].sort(
                (a, b) => a.sortOrder - b.sortOrder
              ),
            })),
          };

          this.solutionCenterDetail.set(detail);
          this.initializeProductSearchControls(detail.sections);
          this.solutionCenterForm.patchValue({
            solutionCenterTypeId: detail.solutionCenterTypeId,
            solutionCenterCode: detail.solutionCenterCode,
            solutionCenterName: detail.solutionCenterName,
          });
          this.loadAvailableSections(detail);
        },

        error: (error) => {
          const message = error.status === 0
              ? 'No fue posible comunicarse con el servidor.'
              : error.error?.message || 'Ocurrió un error al consultar la bodega.';

          this.responseModalService.show('error', 'Error al consultar', message);
        },
      });
  }

  updateSolutionCenter(): void {
    this.validationError = '';
    const solutionCenterCode = this.solutionCenterForm.controls.solutionCenterCode.value.trim().toUpperCase();
    const solutionCenterName = this.solutionCenterForm.controls.solutionCenterName.value.trim().toUpperCase();

    if (!solutionCenterCode) {
      this.validationError = 'Debes ingresar el código de la bodega.';
      return;
    }

    if (!solutionCenterName) {
      this.validationError = 'Debes ingresar el nombre de la bodega.';
      return;
    }

    this.saving.set(true);
    this.solutionCenterService
      .update(
        this.solutionCenterId,
        {
          solutionCenterCode,
          solutionCenterName,
        }
      )
      .pipe(
        finalize(() => {
          this.saving.set(false);
        })
      )
      .subscribe({
        next: (response) => {

          if (!response.isSuccess) {
            this.responseModalService.show('error', 'No se pudo actualizar', response.message || 'No fue posible actualizar la bodega.');
            return;
          }

          this.responseModalService.show('success', 'Bodega actualizada', response.message || 'Bodega actualizada correctamente.');
          this.loadSolutionCenter();
        },

        error: (error) => {
          const message = error.status === 0
              ? 'No fue posible comunicarse con el servidor.'
              : error.error?.message || 'Ocurrió un error al actualizar la bodega.';

          this.responseModalService.show('error', 'Error al actualizar', message);
        },
      });
  }

  onCodeInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.toUpperCase();

    input.value = value;
    this.solutionCenterForm.controls
      .solutionCenterCode
      .setValue(
        value,
        {
          emitEvent: false,
        }
      );
  }

  onNameInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.toUpperCase();

    input.value = value;
    this.solutionCenterForm.controls
      .solutionCenterName
      .setValue(
        value,
        {
          emitEvent: false,
        }
      );
  }

  private loadAvailableSections(detail: SolutionCenterDetail): void {
    this.loadingAvailableSections.set(true);
    this.sectionService
      .getAll(detail.solutionCenterTypeId)
      .pipe(
        finalize(() => {
          this.loadingAvailableSections.set(false);
        })
      )
      .subscribe({
        next: response => {

          if (!response.isSuccess) {
            this.availableSections.set([]);
            return;
          }

          const configuredSectionIds = new Set(detail.sections.map(section => section.sectionId));
          const available = (response.result ?? []).filter(section => section.isActive && !configuredSectionIds.has(section.sectionId));

          this.availableSections.set(available);
        },

        error: error => {
          this.availableSections.set([]);

          const message = error.status === 0
              ? 'No fue posible comunicarse con el servidor.'
              : error.error?.message || 'Ocurrió un error al consultar las secciones.';

          this.responseModalService.show('error', 'Error al consultar secciones', message);
        },

      });
  }

  assignSection(): void {
    const sectionId = this.sectionToAssignControl.value;

    if (sectionId <= 0) {
      this.responseModalService.show('warning', 'Selecciona una sección', 'Debes seleccionar una sección para agregar.');
      return;
    }

    if (this.assigningSection()) {
      return;
    }

    this.assigningSection.set(true);
    this.solutionCenterService
      .assignSection(this.solutionCenterId, sectionId)
      .pipe(
        finalize(() => {
          this.assigningSection.set(false);
        })
      )
      .subscribe({
        next: response => {

          if (!response.isSuccess) {
            this.responseModalService.show('error', 'No se pudo asignar', response.message || 'No fue posible asignar la sección.');
            return;
          }

          this.sectionToAssignControl.setValue(0);
          this.responseModalService.show('success', 'Sección asignada', response.message || 'Sección asignada correctamente.');
          this.loadSolutionCenter();
        },

        error: error => {
          const message = error.status === 0
              ? 'No fue posible comunicarse con el servidor.'
              : error.error?.message || 'Ocurrió un error al asignar la sección.';

          this.responseModalService.show('error', 'Error al asignar', message);
        },

      });
  }

  updateSectionAssignmentStatus(section: SolutionCenterSection, isActive: boolean): void {

    if (this.updatingSectionStatusId() !== null) {
      return;
    }

    this.updatingSectionStatusId.set(section.sectionId);
    this.solutionCenterService
      .updateSectionAssignmentStatus(
        this.solutionCenterId,
        section.sectionId,
        {
          isActive,
        }
      )
      .pipe(
        finalize(() => {
          this.updatingSectionStatusId.set(null);
        })
      )
      .subscribe({
        next: response => {

          if (!response.isSuccess) {
            this.responseModalService.show('error', 'No se pudo actualizar', response.message || 'No fue posible actualizar el estado de la sección.');
            this.loadSolutionCenter();
            return;
          }

          this.solutionCenterDetail.update(detail => {

            if (!detail) {
              return detail;
            }

            return {
              ...detail,
              sections: detail.sections.map(item =>
                item.sectionId === section.sectionId
                  ? {
                      ...item,
                      assignmentIsActive: isActive,
                    }
                  : item
              ),
            };
          });

          this.responseModalService.show('success', 'Estado actualizado', response.message);
        },

        error: error => {
          const message = error.status === 0
              ? 'No fue posible comunicarse con el servidor.'
              : error.error?.message || 'Ocurrió un error al actualizar el estado de la sección.';

          this.responseModalService.show('error', 'Error al actualizar', message);
          this.loadSolutionCenter();
        },

      });
  }

  dropProduct(section: SolutionCenterSection, event: CdkDragDrop<SolutionCenterSectionProduct[]>): void {

    if (event.previousIndex === event.currentIndex || this.updatingProductOrderId() !== null) {
      return;
    }

    const products = [...section.products].sort((a, b) => a.sortOrder - b.sortOrder);

    moveItemInArray(products, event.previousIndex, event.currentIndex);

    const movedProduct = products[event.currentIndex];

    if (!movedProduct) {
      return;
    }

    const newPosition = event.currentIndex + 1;

    const reorderedProducts = products.map(
      (product, index) => ({
        ...product,
        sortOrder: index + 1,
      })
    );

    this.solutionCenterDetail.update(detail => {

      if (!detail) {
        return detail;
      }

      return {
        ...detail,
        sections: detail.sections.map(item =>
          item.sectionId === section.sectionId
            ? {
                ...item,
                products: reorderedProducts,
              }
            : item
        ),
      };
    });

    this.updatingProductOrderId.set(movedProduct.solutionCenterProductId);
    this.solutionCenterService
      .updateProductOrder(
        this.solutionCenterId,
        section.sectionId,
        movedProduct.solutionCenterProductId,
        {
          newPosition,
        }
      )
      .pipe(
        finalize(() => {
          this.updatingProductOrderId.set(null);
        })
      )
      .subscribe({
        next: response => {

          if (!response.isSuccess) {
            this.responseModalService.show('error', 'No se pudo cambiar el orden', response.message || 'No fue posible cambiar el orden del producto.');
            this.loadSolutionCenter();
            return;
          }

          this.loadSolutionCenter();
        },

        error: error => {
          const message = error.status === 0
              ? 'No fue posible comunicarse con el servidor.'
              : error.error?.message || 'Ocurrió un error al cambiar el orden del producto.';

          this.responseModalService.show('error', 'Error al cambiar orden', message);
          this.loadSolutionCenter();
        },
      });
  }

  private initializeProductSearchControls(sections: SolutionCenterSection[]): void {

    for (const section of sections) {

      if (this.productSearchControls.has(section.sectionId)) {
        continue;
      }

      const control = new FormControl<string | ProductSearchResult | null>(null);
      this.productSearchControls.set(section.sectionId, control);
      control.valueChanges
        .pipe(
          debounceTime(400),
          distinctUntilChanged(),
          takeUntilDestroyed(this.destroyRef)
        )
        .subscribe(value => {

          if (typeof value !== 'string') {
            return;
          }

          const search = value.trim();

          if (search.length < 2) {
            this.setProductResults(section.sectionId, []);
            return;
          }

          this.searchProductsForSection(section.sectionId, search);
        });
    }
  }

  getProductSearchControl(sectionId: number): FormControl<string | ProductSearchResult | null> {
    let control = this.productSearchControls.get(sectionId);

    if (!control) {
      control = new FormControl<string | ProductSearchResult | null>(null);
      this.productSearchControls.set(sectionId, control);
    }

    return control;
  }

  getProductResults(sectionId: number): ProductSearchResult[] {
    return this.productResults()[sectionId] ?? [];
  }

  private setProductResults(sectionId: number, products: ProductSearchResult[]): void {
    this.productResults.update(current => ({
      ...current,
      [sectionId]: products,
    }));
  }

  private searchProductsForSection(sectionId: number, search: string): void {
    this.searchingProductSectionId.set(sectionId);
    this.productService
      .searchProduct(search, 20)
      .pipe(
        finalize(() => {

          if (this.searchingProductSectionId() === sectionId) {
            this.searchingProductSectionId.set(null);
          }

        })
      )
      .subscribe({
        next: response => {

          if (!response.isSuccess) {
            this.setProductResults(sectionId, []);
            return;
          }

          this.setProductResults(sectionId, response.result ?? []);
        },

        error: () => {
          this.setProductResults(sectionId, []);
        },
      });
  }

  displayProduct(product: ProductSearchResult | string | null): string {

    if (!product) {
      return '';
    }

    if (typeof product === 'string') {
      return product;
    }

    return `${product.reference} - ${product.productName}`;
  }

  addProduct(section: SolutionCenterSection): void {

    if (this.addingProductSectionId() !== null) {
      return;
    }

    const control = this.getProductSearchControl(section.sectionId);
    const selectedProduct = control.value;

    if (!selectedProduct || typeof selectedProduct === 'string') {
      this.responseModalService.show('warning', 'Selecciona un producto', 'Debes seleccionar un producto de la lista de resultados.');
      return;
    }

    const alreadyExists = section.products.some(product => product.productId === selectedProduct.productId);

    if (alreadyExists) {
      this.responseModalService.show('warning', 'Producto ya agregado', 'El producto seleccionado ya pertenece a esta sección.');
      return;
    }

    const position = section.products.length === 0 ? 1 : Math.max(...section.products.map(product => product.sortOrder)) + 1;
    this.addingProductSectionId.set(section.sectionId);
    this.solutionCenterService
      .addProductToSection(
        this.solutionCenterId,
        section.sectionId,
        {
          productId: selectedProduct.productId,
          position,
        }
      )
      .pipe(
        finalize(() => {
          this.addingProductSectionId.set(null);
        })
      )
      .subscribe({
        next: response => {

          if (!response.isSuccess) {
            this.responseModalService.show('error', 'No se pudo agregar', response.message || 'No fue posible agregar el producto a la sección.');
            return;
          }

          control.setValue(null, { emitEvent: false, });
          this.setProductResults(section.sectionId, []);
          this.responseModalService.show('success', 'Producto agregado', response.message || 'Producto agregado a la sección correctamente.');
          this.loadSolutionCenter();
        },

        error: error => {
          const message = error.status === 0
              ? 'No fue posible comunicarse con el servidor.'
              : error.error?.message || 'Ocurrió un error al agregar el producto.';

          this.responseModalService.show('error', 'Error al agregar', message);
        },
      });
  }

  removeProduct(section: SolutionCenterSection, product: SolutionCenterSectionProduct): void {

    if (this.removingProductId() !== null) {
      return;
    }

    this.removingProductId.set(product.solutionCenterProductId);
    this.solutionCenterService
      .removeProductFromSection(this.solutionCenterId, section.sectionId, product.solutionCenterProductId)
      .pipe(
        finalize(() => {
          this.removingProductId.set(null);
        })
      )
      .subscribe({
        next: response => {

          if (!response.isSuccess) {
            this.responseModalService.show('error', 'No se pudo eliminar', response.message || 'No fue posible eliminar el producto de la sección.');
            return;
          }

          this.responseModalService.show('success', 'Producto eliminado', response.message || 'Producto eliminado de la sección correctamente.');
          this.loadSolutionCenter();
        },

        error: error => {
          const message = error.status === 0
              ? 'No fue posible comunicarse con el servidor.'
              : error.error?.message || 'Ocurrió un error al eliminar el producto.';

          this.responseModalService.show('error', 'Error al eliminar', message);
        },
      });
  }

  removeSection(section: SolutionCenterSection): void {

    if (this.removingSectionId() !== null) {
      return;
    }

    this.responseModalService
      .confirm('warning', 'Retirar sección', `¿Estás seguro de retirar la sección "${section.sectionName}" del centro de solución?`, 'Retirar')
      .subscribe(confirmed => {

        if (confirmed !== true) {
          return;
        }

        this.deleteSection(section);
      });
  }

  private deleteSection(section: SolutionCenterSection): void {
    this.removingSectionId.set(section.sectionId);
    this.solutionCenterService
      .removeSection(this.solutionCenterId, section.sectionId)
      .pipe(
        finalize(() => {
          this.removingSectionId.set(null);
        })
      )
      .subscribe({
        next: response => {

          if (!response.isSuccess) {
            this.responseModalService.show('error', 'No se pudo retirar', response.message || 'No fue posible retirar la sección del centro de solución.');
            return;
          }

          this.responseModalService.show('success', 'Sección retirada', response.message || 'Sección retirada correctamente.');
          this.loadSolutionCenter();
        },

        error: error => {
          const message = error.status === 0
              ? 'No fue posible comunicarse con el servidor.'
              : error.error?.message || 'Ocurrió un error al retirar la sección.';

          this.responseModalService.show('error', 'Error al retirar sección', message);
        },
      });
  }

  cancel(): void {
    this.router.navigateByUrl('/inventarios/configuracion-bodega');
  }
}