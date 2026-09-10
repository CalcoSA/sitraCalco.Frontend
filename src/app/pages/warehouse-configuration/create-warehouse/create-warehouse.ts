import { SolutionCenterType, SolutionCenterSection } from '../../../models/solution-center.model';
import { SolutionCenterService } from '../../../services/solution-center.service';
import { ResponseModalService } from '../../../services/response-modal.service';
import { FormBuilder, FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { debounceTime, distinctUntilChanged, finalize } from 'rxjs';
import { ProductSearchResult } from '../../../models/product.model';
import { ProductService } from '../../../services/product.service';
import { SessionService } from '../../../services/session.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { Component, inject, OnInit, signal } from '@angular/core';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';

interface SelectedSectionProduct extends ProductSearchResult {
  sortOrder: number;
}

@Component({
  selector: 'app-create-warehouse',
  standalone: true,
  imports: [
    MatProgressSpinnerModule,
    MatAutocompleteModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatExpansionModule,
    MatTooltipModule,
    MatSelectModule,
    MatButtonModule,
    MatInputModule,
    MatIconModule,
  ],
  templateUrl: './create-warehouse.html',
})

export class CreateWarehouse implements OnInit {

  private readonly solutionCenterService = inject(SolutionCenterService);
  private readonly responseModalService = inject(ResponseModalService);
  readonly selectedProducts = signal<SelectedSectionProduct[]>([]);
  readonly solutionCenterTypes = signal<SolutionCenterType[]>([]);
  readonly createdSolutionCenterId = signal<number | null>(null);
  readonly savedSections = signal<SolutionCenterSection[]>([]);
  readonly productResults = signal<ProductSearchResult[]>([]);
  private readonly sessionService = inject(SessionService);
  private readonly productService = inject(ProductService);
  private readonly formBuilder = inject(FormBuilder);
  readonly searchingProducts = signal(false);
  readonly loadingSections = signal(false);
  private readonly router = inject(Router);
  readonly savingSection = signal(false);
  readonly loadingTypes = signal(false);
  readonly saving = signal(false);
  sectionValidationError = '';
  validationError = '';
  
  readonly solutionCenterForm = this.formBuilder.nonNullable.group({
    solutionCenterTypeId: [0],
    solutionCenterCode: [''],
    solutionCenterName: [''],
  });

  readonly sectionForm = this.formBuilder.nonNullable.group({
    sectionName: [''],
  });

  readonly productSearchControl = new FormControl<string | ProductSearchResult>('', {
    nonNullable: true,
  });

  ngOnInit(): void {
    this.loadSolutionCenterTypes();
    this.productSearchControl.valueChanges
      .pipe(
        debounceTime(400),
        distinctUntilChanged()
      )
      .subscribe(value => {

        if (typeof value !== 'string') {
          return;
        }

        const search = value.trim();

        if (search.length < 2) {
          this.productResults.set([]);
          return;
        }

        this.searchProducts(search);
      });
  }

  loadSolutionCenterTypes(): void {
    this.loadingTypes.set(true);
    this.solutionCenterService.getTypes()
      .pipe(
        finalize(() => {
          this.loadingTypes.set(false);
        })
      )
      .subscribe({
        next: (response) => {

          if (!response.isSuccess) {
            this.solutionCenterTypes.set([]);
            this.responseModalService.show('error', 'Error al cargar tipos', response.message || 'No fue posible consultar los tipos de centros de solución.');
            return;
          }

          const role = this.sessionService.getUser() ?.nameRole ?.trim().toUpperCase() ?? '';
          let types = response.result ?? [];

          if (role === 'ALMACEN') {
            types = types.filter(type => type.solution_center_type_name.trim().toUpperCase() !== 'BODEGA');
          }

          this.solutionCenterTypes.set(types);
        },

        error: (error) => {
          this.solutionCenterTypes.set([]);

          const message = error.status === 0
              ? 'No fue posible comunicarse con el servidor.'
              : error.error?.message || 'Ocurrió un error al consultar los tipos de centros de solución.';

          this.responseModalService.show('error', 'Error al cargar tipos', message);
        },
      });
  }

  createSolutionCenter(): void {

    this.validationError = '';

    const solutionCenterTypeId = this.solutionCenterForm.controls.solutionCenterTypeId.value;
    const solutionCenterCode = this.solutionCenterForm.controls.solutionCenterCode.value.trim();
    const solutionCenterName = this.solutionCenterForm.controls.solutionCenterName.value.trim();

    if (solutionCenterTypeId <= 0) {
      this.validationError = 'Debes seleccionar un tipo de centro de solución.';
      return;
    }

    if (!solutionCenterCode) {
      this.validationError = 'Debes ingresar el código del centro de solución.';
      return;
    }

    if (!solutionCenterName) {
      this.validationError = 'Debes ingresar el nombre del centro de solución.';
      return;
    }

    this.saving.set(true);
    this.solutionCenterForm.disable();
    this.solutionCenterService
      .create({
        solutionCenterTypeId,
        solutionCenterCode,
        solutionCenterName,
      })
      .pipe(
        finalize(() => {
          this.saving.set(false);

          if (!this.createdSolutionCenterId()) {
            this.solutionCenterForm.enable();
          }

        })
      )
      .subscribe({
        next: (response) => {

          if (!response.isSuccess || !response.result?.solutionCenterId)  {
            this.responseModalService.show('error', 'No se pudo crear', response.message || 'No se pudo crear el centro de solución.');
            return;
          }

          this.createdSolutionCenterId.set(response.result.solutionCenterId);
          this.validationError = '';
        },

        error: (error) => {

          const message = error.status === 0
              ? 'No fue posible comunicarse con el servidor.'
              : error.error?.message || 'Ocurrió un error al crear el centro de solución.';

          this.responseModalService.show('error', 'Error al crear', message);
        },
      });
  }

  searchProducts(search: string): void {
    const cleanSearch = search.trim();

    if (cleanSearch.length < 2) {
      this.productResults.set([]);
      return;
    }

    this.searchingProducts.set(true);
    this.productService
      .searchProduct(cleanSearch, 20)
      .pipe(
        finalize(() => {
          this.searchingProducts.set(false);
        })
      )
      .subscribe({
        next: (response) => {

          if (!response.isSuccess) {
            this.productResults.set([]);
            return;
          }

          this.productResults.set(response.result ?? []);
        },

        error: (error) => {
          this.productResults.set([]);

          const message = error.status === 0
              ? 'No fue posible comunicarse con el servidor.'
              : error.error?.message || 'Ocurrió un error al buscar productos.';

          this.responseModalService.show('error', 'Error al buscar productos', message);
        },
      });
  }

  displayProduct(product: ProductSearchResult | string): string {

    if (typeof product === 'string') {
      return product;
    }

    if (!product) {
      return '';
    }

    return `${product.reference} - ${product.productName}`;
  }

  addProduct(product: ProductSearchResult): void {
    this.sectionValidationError = '';
    const repeatedCombination = this.selectedProducts().some(selected => selected.reference === product.reference && selected.unitOfMeasure === product.unitOfMeasure);

    if (repeatedCombination) {
      this.sectionValidationError = 'Ya agregaste un producto con la misma referencia y unidad de medida.';
      this.productSearchControl.setValue('');
      this.productResults.set([]);
      return;
    }

    const newProduct: SelectedSectionProduct = {
      ...product,
      sortOrder: this.selectedProducts().length + 1,
    };

    this.selectedProducts.update(products => [...products, newProduct]);
    this.productSearchControl.setValue('');
    this.productResults.set([]);
  }

  removeProduct(productId: number): void {
    const products =
      this.selectedProducts()
        .filter(
          product =>
            product.productId !== productId
        )
        .map(
          (product, index) => ({
            ...product,
            sortOrder: index + 1,
          })
        );

    this.selectedProducts.set(products);
    this.sectionValidationError = '';
  }

  saveSection(): void {
    this.sectionValidationError = '';

    const solutionCenterId = this.createdSolutionCenterId();
    const sectionName = this.sectionForm.controls.sectionName.value.trim();

    if (!solutionCenterId) {
      this.sectionValidationError = 'Primero debes guardar el centro de solución.';
      return;
    }

    if (!sectionName) {
      this.sectionValidationError = 'Debes ingresar el nombre de la sección.';
      return;
    }

    if (this.selectedProducts().length === 0) {
      this.sectionValidationError = 'Debes agregar al menos un producto.';
      return;
    }

    const user = this.sessionService.getUser();
    const createdBy = user?.userLogin?.trim() ?? '';

    if (!createdBy) {
      this.responseModalService.show('error', 'Error de sesión', 'No fue posible identificar el usuario que realiza la configuración.');
      return;
    }

    this.savingSection.set(true);
    this.sectionForm.disable();
    this.productSearchControl.disable();
    this.solutionCenterService
      .createSection(
        solutionCenterId,
        {
          sectionName,
          createdBy,
          products:
            this.selectedProducts().map(
              product => ({
                productId: product.productId,
                sortOrder: product.sortOrder,
              })
            ),
        }
      )
      .pipe(
        finalize(() => {

          this.savingSection.set(false);
          this.sectionForm.enable();
          this.productSearchControl.enable();
        })
      )
      .subscribe({
        next: (response) => {

          if (!response.isSuccess) {
            this.responseModalService.show('error', 'No se pudo guardar', response.message || 'No se pudo guardar la configuración de la sección.');
            return;
          }

          this.sectionForm.reset({
            sectionName: '',
          });

          this.productSearchControl.setValue('');
          this.productResults.set([]);
          this.selectedProducts.set([]);
          this.sectionValidationError = '';
          this.loadSavedSections();
          this.responseModalService.show('success', 'Configuración guardada', response.message || 'Configuración de la sección guardada correctamente.');
        },

        error: (error) => {

          const message = error.status === 0
              ? 'No fue posible comunicarse con el servidor.'
              : error.error?.message || 'Ocurrió un error al guardar la configuración de la sección.';

          this.responseModalService.show('error', 'Error al guardar', message);
        },
      });
  }

  loadSavedSections(): void {
    const solutionCenterId = this.createdSolutionCenterId();

    if (!solutionCenterId) {
      this.savedSections.set([]);
      return;
    }

    this.loadingSections.set(true);
    this.solutionCenterService
      .getById(solutionCenterId)
      .pipe(
        finalize(() => {
          this.loadingSections.set(false);
        })
      )
      .subscribe({
        next: (response) => {

          if (!response.isSuccess || !response.result) {
            this.savedSections.set([]);
            this.responseModalService.show('error', 'Error al cargar secciones', response.message || 'No fue posible consultar las secciones creadas.');
            return;
          }

          this.savedSections.set(response.result.sections ?? []);
        },

        error: (error) => {
          this.savedSections.set([]);

          const message = error.status === 0
              ? 'No fue posible comunicarse con el servidor.'
              : error.error?.message || 'Ocurrió un error al consultar las secciones creadas.';

          this.responseModalService.show('error', 'Error al cargar secciones', message);
        },
      });
  }

  clearForm(): void {

    if (this.createdSolutionCenterId()) {
      return;
    }

    this.solutionCenterForm.reset({
      solutionCenterTypeId: 0,
      solutionCenterCode: '',
      solutionCenterName: '',
    });

    this.validationError = '';
  }

  clearSection(): void {
    this.sectionForm.reset({
      sectionName: '',
    });

    this.productSearchControl.setValue('');
    this.productResults.set([]);
    this.selectedProducts.set([]);
    this.sectionValidationError = '';
  }

  goBack(): void {
    this.router.navigateByUrl('/inventarios/configuracion-bodega');
  }
}