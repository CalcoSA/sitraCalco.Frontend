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
import { SectionService } from '../../../services/section.service';
import { MatFormFieldModule } from '@angular/material/form-field';
import { Component, inject, OnInit, signal } from '@angular/core';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { Section } from '../../../models/section.model';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';

interface SelectedSectionProduct {
  productId: number;
  productName: string;
  reference: string;
  unitOfMeasure: string;
  planId: string | null;
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
  private readonly sessionService = inject(SessionService);
  private readonly sectionService = inject(SectionService);
  private readonly productService = inject(ProductService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);

  readonly productSearchControl = new FormControl<string | ProductSearchResult>('');
  readonly selectedProduct = signal<ProductSearchResult | null>(null);
  readonly createdSolutionCenterTypeId = signal<number | null>(null);
  readonly configuredSections = signal<SolutionCenterSection[]>([]);
  readonly selectedProducts = signal<SelectedSectionProduct[]>([]);
  readonly solutionCenterTypes = signal<SolutionCenterType[]>([]);
  readonly createdSolutionCenterId = signal<number | null>(null);
  readonly productResults = signal<ProductSearchResult[]>([]);
  readonly sections = signal<Section[]>([]);
  
  readonly loadingConfiguredSections = signal(false);
  readonly searchingProducts = signal(false);
  readonly loadingSections = signal(false);
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

  readonly sectionForm =
    this.formBuilder.nonNullable.group({
      sectionId: [0],
    });

  ngOnInit(): void {
    this.loadSolutionCenterTypes();
    this.configureProductSearch();
  }

  uppercaseInput(event: Event, control: FormControl<string>): void {
    const input = event.target as HTMLInputElement;
    const value = input.value.toUpperCase();

    input.value = value;

    control.setValue(
      value,
      {
        emitEvent: false,
      }
    );
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
            types = types.filter(type => type.solution_center_type_name.trim().toUpperCase() === 'BODEGA');
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
          this.createdSolutionCenterTypeId.set(solutionCenterTypeId);
          this.validationError = '';
          this.loadSections();
        },

        error: (error) => {
          const message = error.status === 0
              ? 'No fue posible comunicarse con el servidor.'
              : error.error?.message || 'Ocurrió un error al crear el centro de solución.';

          this.responseModalService.show('error', 'Error al crear', message);
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

  loadSections(): void {
    const solutionCenterTypeId = this.createdSolutionCenterTypeId();

    if (!solutionCenterTypeId) {
      this.sections.set([]);
      return;
    }

    this.loadingSections.set(true);
    this.sectionService
      .getAll(solutionCenterTypeId)
      .pipe(
        finalize(() => {
          this.loadingSections.set(false);
        })
      )
      .subscribe({
        next: (response) => {

          if (!response.isSuccess) {
            this.sections.set([]);
            return;
          }

          const activeSections = (response.result ?? []).filter(section => section.isActive);
          this.sections.set(activeSections);
        },

        error: (error) => {
          this.sections.set([]);

          const message = error.status === 0
              ? 'No fue posible comunicarse con el servidor.'
              : error.error?.message || 'Ocurrió un error al consultar las secciones.';

          this.responseModalService.show('error', 'Error al cargar secciones', message);
        },
      });
  }

  private configureProductSearch(): void {
    this.productSearchControl
      .valueChanges
      .pipe(
        debounceTime(400),
        distinctUntilChanged()
      )
      .subscribe(value => {
        if (typeof value !== 'string') {
          return;
        }

        const search = value.trim();
        this.selectedProduct.set(null);

        if (search.length < 2) {
          this.productResults.set([]);
          return;
        }

        this.searchProducts(search);
      });
  }

  private searchProducts(search: string): void {
    this.searchingProducts.set(true);
    this.productService
      .searchProduct(search, 20)
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

        error: () => {
          this.productResults.set([]);
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

  selectProduct(product: ProductSearchResult): void {
    this.selectedProduct.set(product);
  }

  addProduct(): void {
    this.sectionValidationError = '';
    const product = this.selectedProduct();

    if (!product) {
      this.sectionValidationError = 'Debes seleccionar un producto de la lista.';
      return;
    }

    const exists = this.selectedProducts().some(item => item.productId === product.productId);

    if (exists) {
      this.sectionValidationError = 'El producto seleccionado ya fue agregado.';
      return;
    }

    const newProduct:
      SelectedSectionProduct = {
        productId: product.productId,
        productName: product.productName,
        reference: product.reference,
        unitOfMeasure: product.unitOfMeasure,
        planId: product.planId,
        sortOrder: this.selectedProducts().length + 1,
      };

    this.selectedProducts.update(
      products => [
        ...products,
        newProduct,
      ]
    );

    this.selectedProduct.set(null);
    this.productSearchControl.setValue('', { emitEvent: false, });
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
  }

  saveSectionConfiguration(): void {
    this.sectionValidationError = '';
    const solutionCenterId = this.createdSolutionCenterId();

    if (!solutionCenterId) {
      this.sectionValidationError = 'Primero debes crear la bodega.';
      return;
    }

    const sectionId = this.sectionForm.controls.sectionId.value;

    if (sectionId <= 0) {
      this.sectionValidationError = 'Debes seleccionar una sección.';
      return;
    }

    const products = this.selectedProducts();

    if (products.length === 0) {
      this.sectionValidationError = 'Debes agregar al menos un producto.';
      return;
    }

    this.savingSection.set(true);
    this.solutionCenterService
      .createSection(
        solutionCenterId,
        {
          id_section: sectionId,
          products:
            products.map(product => ({
              productId: product.productId,
              sortOrder: product.sortOrder,
            })),
        }
      )
      .pipe(
        finalize(() => {
          this.savingSection.set(false);
        })
      )
      .subscribe({
        next: (response) => {

          if (!response.isSuccess) {
            this.responseModalService.show('error', 'No se pudo guardar', response.message || 'No fue posible guardar la configuración de la sección.');
            return;
          }

          this.clearSectionConfiguration();
          this.loadConfiguredSections();
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

  clearSectionConfiguration(): void {
    this.sectionForm.reset({ sectionId: 0, });
    this.productSearchControl.setValue('', { emitEvent: false, });
    this.selectedProduct.set(null);
    this.selectedProducts.set([]);
    this.productResults.set([]);
    this.sectionValidationError = '';
  }

  loadConfiguredSections(): void {
    const solutionCenterId = this.createdSolutionCenterId();

    if (!solutionCenterId) {
      this.configuredSections.set([]);
      return;
    }

    this.loadingConfiguredSections.set(true);
    this.solutionCenterService
      .getById(solutionCenterId)
      .pipe(
        finalize(() => {
          this.loadingConfiguredSections.set(false);
        })
      )
      .subscribe({
        next: (response) => {

          if (!response.isSuccess || !response.result) {
            this.configuredSections.set([]);
            this.responseModalService.show('error', 'Error al consultar secciones', response.message || 'No fue posible consultar las secciones configuradas.');
            return;
          }

          this.configuredSections.set(response.result.sections ?? []);
        },

        error: (error) => {
          this.configuredSections.set([]);

          const message = error.status === 0
              ? 'No fue posible comunicarse con el servidor.'
              : error.error?.message || 'Ocurrió un error al consultar las secciones configuradas.';

          this.responseModalService.show('error', 'Error al consultar secciones', message);
        },
      });
  }

  finishCreation(): void {
    this.solutionCenterForm.enable();
    this.solutionCenterForm.reset({
      solutionCenterTypeId: 0,
      solutionCenterCode: '',
      solutionCenterName: '',
    });
    this.sectionForm.reset({ sectionId: 0, });
    this.productSearchControl.setValue('', { emitEvent: false, });
    this.selectedProduct.set(null);
    this.selectedProducts.set([]);
    this.productResults.set([]);
    this.createdSolutionCenterId.set(null);
    this.createdSolutionCenterTypeId.set(null);
    this.sections.set([]);
    this.configuredSections.set([]);
    this.validationError = '';
    this.sectionValidationError = '';
  }

  goBack(): void {
    this.router.navigateByUrl('/inventarios/configuracion-bodega');
  }
}