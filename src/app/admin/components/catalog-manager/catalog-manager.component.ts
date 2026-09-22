import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import {
  Brand,
  ProductSubcategory,
  ProductCategory,
  PRODUCT_CATEGORY_OPTIONS,
  categoryLabel,
} from '../../../products/interfaces/product.interface';
import { ProductService } from '../../../products/services/product.service';
import {
  apiErrorMessage,
  NotificationService,
} from '../../../shared/services/notification.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { FormUtils } from '../../../utils/form-utils';

export interface CatalogChange {
  kind: 'brand' | 'subcategory';
  action: 'created' | 'updated' | 'deleted';
  item: Brand | ProductSubcategory;
}

@Component({
  selector: 'app-catalog-manager',
  imports: [ReactiveFormsModule, ConfirmDialogComponent],
  templateUrl: './catalog-manager.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CatalogManagerComponent {
  kind = input.required<'brand' | 'subcategory'>();
  changed = output<CatalogChange>();
  private service = inject(ProductService);
  private notifications = inject(NotificationService);
  private fb = inject(FormBuilder);
  private dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private editor = viewChild.required<ElementRef<HTMLDialogElement>>('editor');
  private confirmation = viewChild.required(ConfirmDialogComponent);
  readonly categoryOptions = PRODUCT_CATEGORY_OPTIONS;
  readonly categoryLabel = categoryLabel;
  readonly category = signal<ProductCategory>('ROSTRO');
  readonly items = signal<Array<Brand | ProductSubcategory>>([]);
  readonly search = signal('');
  readonly loading = signal(false);
  readonly creating = signal(false);
  readonly updating = signal(false);
  readonly deleting = signal(false);
  readonly error = signal('');
  readonly editorError = signal('');
  readonly deleteError = signal('');
  readonly editing = signal<Brand | ProductSubcategory | null>(null);
  readonly pendingDelete = signal<Brand | ProductSubcategory | null>(null);
  readonly noun = computed(() => (this.kind() === 'brand' ? 'marca' : 'subcategoría'));
  readonly filtered = computed(() =>
    this.items().filter((item) =>
      item.name.toLocaleLowerCase().includes(this.search().trim().toLocaleLowerCase()),
    ),
  );
  readonly saving = computed(() => this.creating() || this.updating());
  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.pattern(/\S/)]],
    slug: [
      '',
      [Validators.required, Validators.minLength(3), Validators.pattern(FormUtils.slugPattern)],
    ],
  });
  private loadVersion = 0;

  open(category?: ProductCategory | null): void {
    if (category) this.category.set(category);
    this.search.set('');
    this.dialog().nativeElement.showModal();
    void this.load();
  }
  async load(): Promise<void> {
    const version = ++this.loadVersion;
    this.loading.set(true);
    this.error.set('');
    try {
      const items = await firstValueFrom(
        this.kind() === 'brand'
          ? this.service.getBrands()
          : this.service.getSubcategoriesByCategory(this.category()),
      );
      if (version === this.loadVersion) this.items.set(items);
    } catch (error) {
      if (version === this.loadVersion) this.error.set(apiErrorMessage(error));
    } finally {
      if (version === this.loadVersion) this.loading.set(false);
    }
  }
  setCategory(value: string): void {
    const category = this.categoryOptions.find((option) => option.value === value)?.value;
    if (category) {
      this.category.set(category);
      void this.load();
    }
  }
  create(name = '', category?: ProductCategory | null): void {
    if (category) this.category.set(category);
    this.editing.set(null);
    this.editorError.set('');
    this.form.reset({ name, slug: FormUtils.slugify(name) });
    this.editor().nativeElement.showModal();
  }
  edit(item: Brand | ProductSubcategory): void {
    this.editing.set(item);
    this.editorError.set('');
    this.form.reset({ name: item.name, slug: item.slug });
    this.editor().nativeElement.showModal();
  }
  suggestSlug(): void {
    if (!this.editing() && !this.form.controls.slug.dirty)
      this.form.controls.slug.setValue(FormUtils.slugify(this.form.controls.name.value));
  }
  async save(): Promise<void> {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving()) return;
    const editing = this.editing();
    const loading = editing ? this.updating : this.creating;
    loading.set(true);
    this.editorError.set('');
    const value = this.form.getRawValue();
    const payload = { name: value.name.trim(), slug: value.slug.trim() };
    try {
      const item = await firstValueFrom(
        this.kind() === 'brand'
          ? editing
            ? this.service.updateBrand(editing.id, payload)
            : this.service.createBrand(payload)
          : editing
            ? this.service.updateSubcategory(editing.id, { ...payload, category: this.category() })
            : this.service.createSubcategory({ ...payload, category: this.category() }),
      );
      this.editor().nativeElement.close();
      this.changed.emit({ kind: this.kind(), action: editing ? 'updated' : 'created', item });
      this.notifications.success(
        editing
          ? 'Cambios guardados'
          : `${this.kind() === 'brand' ? 'Marca creada' : 'Subcategoría creada'}`,
      );
      if (this.dialog().nativeElement.open) await this.load();
    } catch (error) {
      this.editorError.set(apiErrorMessage(error));
    } finally {
      loading.set(false);
    }
  }
  askDelete(item: Brand | ProductSubcategory): void {
    this.pendingDelete.set(item);
    this.deleteError.set('');
    this.confirmation().open();
  }
  async remove(): Promise<void> {
    const item = this.pendingDelete();
    if (!item || this.deleting()) return;
    this.deleting.set(true);
    this.deleteError.set('');
    try {
      await firstValueFrom(
        this.kind() === 'brand'
          ? this.service.deleteBrand(item.id)
          : this.service.deleteSubcategory(item.id),
      );
      this.changed.emit({ kind: this.kind(), action: 'deleted', item });
      this.deleting.set(false);
      this.confirmation().close();
      this.notifications.success('Eliminación completada');
      await this.load();
    } catch (error) {
      this.deleteError.set(apiErrorMessage(error));
    } finally {
      this.deleting.set(false);
    }
  }
}
