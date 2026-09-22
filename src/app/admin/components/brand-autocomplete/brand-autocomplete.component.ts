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
import { Brand } from '../../../products/interfaces/product.interface';

let nextId = 0;
@Component({
  selector: 'app-brand-autocomplete',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '(focusout)': 'onFocusOut($event)', '(document:pointerdown)': 'outside($event)' },
  template: `
    <div class="relative">
      <label [for]="id" class="block font-medium mb-2">Marca</label>
      <div class="flex gap-2">
        <input
          #search
          [id]="id"
          class="input input-bordered w-full"
          type="text"
          role="combobox"
          autocomplete="off"
          placeholder="Buscar marca..."
          [disabled]="disabled()"
          [value]="open() ? query() : (selected()?.name ?? '')"
          aria-autocomplete="list"
          [attr.aria-expanded]="open()"
          [attr.aria-controls]="id + '-list'"
          [attr.aria-activedescendant]="open() && active() >= 0 ? id + '-option-' + active() : null"
          (focus)="show()"
          (input)="searchFor(search.value)"
          (keydown)="keydown($event)"
        />
        @if (value()) {
          <button
            type="button"
            class="btn btn-ghost"
            [disabled]="disabled()"
            aria-label="Limpiar marca"
            (click)="clear()"
          >
            Limpiar
          </button>
        }
      </div>
      @if (selected()) {
        <p class="text-base-content/80 mt-2 text-sm">
          Seleccionada: <strong class="text-base-content">{{ selected()?.name }}</strong>
        </p>
      }
      @if (open()) {
        <div
          class="absolute z-30 mt-1 w-full rounded-box border border-base-300 bg-base-100 shadow-xl p-2"
        >
          <ul
            [id]="id + '-list'"
            role="listbox"
            aria-label="Marcas"
            class="max-h-60 overflow-y-auto"
          >
            @for (brand of filtered(); track brand.id; let index = $index) {
              <li
                role="option"
                [id]="id + '-option-' + index"
                [attr.aria-selected]="value() === brand.id"
                class="hover:bg-base-200 flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-3 py-3"
                [class]="
                  active() === index
                    ? 'bg-base-200 ring-primary font-semibold ring-1 ring-inset'
                    : ''
                "
                (pointerdown)="$event.preventDefault()"
                (click)="select(brand)"
              >
                <span class="min-w-0 flex-1 break-words">{{ brand.name }}</span>
                @if (value() === brand.id) {
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    aria-hidden="true"
                    class="size-4 shrink-0"
                  >
                    <path
                      d="m4.5 12.75 6 6 9-13.5"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </svg>
                }
              </li>
            } @empty {
              <li role="presentation" class="text-base-content/80 p-3 text-sm">
                No hay marcas coincidentes.
              </li>
            }
          </ul>
          @if (allowCreate()) {
            <button
              type="button"
              class="btn btn-ghost w-full justify-start whitespace-normal h-auto min-h-11"
              (click)="createRequested.emit(query().trim()); open.set(false)"
            >
              {{
                filtered().length === 0 && query().trim()
                  ? '+ Crear "' + query().trim() + '"'
                  : '+ Crear nueva marca'
              }}
            </button>
          }
        </div>
      }
    </div>
  `,
})
export class BrandAutocompleteComponent {
  brands = input<Brand[]>([]);
  value = input('');
  disabled = input(false);
  allowCreate = input(true);
  selectionChange = output<string>();
  createRequested = output<string>();
  readonly id = `brand-search-${nextId++}`;
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private searchInput = viewChild.required<ElementRef<HTMLInputElement>>('search');
  readonly query = signal('');
  readonly open = signal(false);
  readonly active = signal(-1);
  readonly selected = computed(() => this.brands().find((brand) => brand.id === this.value()));
  readonly filtered = computed(() =>
    this.brands().filter((brand) =>
      brand.name.toLocaleLowerCase().includes(this.query().trim().toLocaleLowerCase()),
    ),
  );

  show(): void {
    this.query.set('');
    this.active.set(-1);
    this.open.set(true);
  }
  searchFor(query: string): void {
    this.query.set(query);
    this.active.set(-1);
    this.open.set(true);
  }
  select(brand: Brand): void {
    this.selectionChange.emit(brand.id);
    this.open.set(false);
    this.active.set(-1);
  }
  clear(): void {
    this.selectionChange.emit('');
    this.query.set('');
    this.searchInput().nativeElement.focus();
    this.open.set(false);
  }
  onFocusOut(event: FocusEvent): void {
    if (!this.host.nativeElement.contains(event.relatedTarget as Node | null)) this.open.set(false);
  }
  outside(event: Event): void {
    if (!this.host.nativeElement.contains(event.target as Node)) this.open.set(false);
  }
  keydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.open.set(false);
      event.stopPropagation();
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!this.open()) this.show();
      const length = this.filtered().length;
      if (!length) return;
      this.active.update((index) =>
        index < 0
          ? event.key === 'ArrowDown'
            ? 0
            : length - 1
          : (index + (event.key === 'ArrowDown' ? 1 : -1) + length) % length,
      );
      document
        .getElementById(`${this.id}-option-${this.active()}`)
        ?.scrollIntoView?.({ block: 'nearest' });
    }
    if (event.key === 'Enter' && this.open()) {
      event.preventDefault();
      const brand = this.filtered()[this.active()];
      if (brand) this.select(brand);
    }
  }
}
