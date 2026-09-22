import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CatalogManagerComponent } from './catalog-manager.component';
import { environment } from '../../../../environments/environment';

const url = environment.baseUrl;
const brand = { id: '000000000000000000000001', name: 'Rare Beauty', slug: 'rare-beauty' };

describe('Inline catalog management', () => {
  let fixture: ComponentFixture<CatalogManagerComponent>;
  let component: CatalogManagerComponent;
  let http: HttpTestingController;
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CatalogManagerComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(CatalogManagerComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('kind', 'brand');
    fixture.detectChanges();
    http = TestBed.inject(HttpTestingController);
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        this.open = true;
      },
    });
    Object.defineProperty(HTMLDialogElement.prototype, 'close', {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        this.open = false;
      },
    });
  });
  afterEach(() => {
    http.verify();
    vi.restoreAllMocks();
  });

  it('requires explicit submit to create a brand and emits the new record', async () => {
    const changed = vi.fn();
    component.changed.subscribe(changed);
    component.create('Rare Beauty');
    expect(component.form.controls.slug.value).toBe('rare-beauty');
    http.expectNone(`${url}/brands`);
    const save = component.save();
    const request = http.expectOne(`${url}/brands`);
    expect(request.request.body).toEqual({ name: 'Rare Beauty', slug: 'rare-beauty' });
    request.flush({ ok: true, brand });
    await save;
    expect(changed).toHaveBeenCalledWith({ kind: 'brand', action: 'created', item: brand });
    expect(component.creating()).toBe(false);
  });

  it('creates a subcategory in the selected parent category', async () => {
    fixture.componentRef.setInput('kind', 'subcategory');
    fixture.detectChanges();
    component.create('Iluminador', 'ROSTRO');
    const save = component.save();
    const request = http.expectOne(`${url}/subcategories`);
    expect(request.request.body).toEqual({
      name: 'Iluminador',
      slug: 'iluminador',
      category: 'ROSTRO',
    });
    request.flush({
      ok: true,
      subcategory: { ...brand, name: 'Iluminador', slug: 'iluminador', category: 'ROSTRO' },
    });
    await save;
    expect(component.editorError()).toBe('');
  });

  it('edits a brand and prevents duplicate submission while updating', async () => {
    component.edit(brand);
    component.form.controls.name.setValue('Rare Beauty Studio');
    const save = component.save();
    await component.save();
    const request = http.expectOne(`${url}/brands/${brand.id}`);
    expect(request.request.method).toBe('PATCH');
    expect(component.updating()).toBe(true);
    expect(request.request.body.slug).toBe('rare-beauty');
    request.flush({ ok: true, ...brand, name: 'Rare Beauty Studio' });
    await save;
    expect(component.updating()).toBe(false);
  });

  it('preserves records and selection on delete conflict and displays backend msg', async () => {
    component.items.set([brand]);
    const changed = vi.fn();
    component.changed.subscribe(changed);
    component.askDelete(brand);
    const remove = component.remove();
    http
      .expectOne(`${url}/brands/${brand.id}`)
      .flush(
        { msg: 'No se puede eliminar la marca porque existen productos asociados.' },
        { status: 409, statusText: 'Conflict' },
      );
    await remove;
    fixture.detectChanges();
    expect(component.items()).toEqual([brand]);
    expect(changed).not.toHaveBeenCalled();
    expect(component.deleteError()).toContain('productos asociados');
    expect(fixture.nativeElement.textContent).toContain('No se puede eliminar la marca');
  });

  it('confirms successful deletion, emits removal, then refreshes category list', async () => {
    fixture.componentRef.setInput('kind', 'subcategory');
    fixture.detectChanges();
    const item = { ...brand, category: 'ROSTRO' as const };
    const changed = vi.fn();
    component.changed.subscribe(changed);
    component.askDelete(item);
    const remove = component.remove();
    const request = http.expectOne(`${url}/subcategories/${item.id}`);
    expect(request.request.method).toBe('DELETE');
    request.flush({ ok: true });
    await Promise.resolve();
    http.expectOne(`${url}/subcategories/category/ROSTRO`).flush({ ok: true, subcategories: [] });
    await remove;
    expect(changed).toHaveBeenCalledWith({ kind: 'subcategory', action: 'deleted', item });
    expect(component.items()).toEqual([]);
  });

  it('keeps editable slug suggestions after accent normalization', () => {
    component.create();
    component.form.controls.name.setValue('Protección Solar');
    component.suggestSlug();
    expect(component.form.controls.slug.value).toBe('proteccion-solar');
    component.form.controls.slug.setValue('personalizado');
    component.form.controls.slug.markAsDirty();
    component.form.controls.name.setValue('Otro nombre');
    component.suggestSlug();
    expect(component.form.controls.slug.value).toBe('personalizado');
  });
});
