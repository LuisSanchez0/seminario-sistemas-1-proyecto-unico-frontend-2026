import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-sell-admin-empty-state',
  standalone: true,
  imports: [],
  template: `
    <div class="flex flex-col items-center justify-center rounded-3xl border border-slate-200/70
                bg-white px-8 py-16 text-center shadow-sm">
      <div class="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-slate-400" viewBox="0 0 24 24"
             fill="none" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round"
                d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2
                   M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" />
        </svg>
      </div>
      <p class="text-base font-semibold text-slate-700">{{ headline() }}</p>
      <p class="mt-1 text-sm text-slate-400">{{ subline() }}</p>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SellAdminEmptyStateComponent {
  /** True when one or more filters are currently active. */
  readonly hasFilters = input<boolean>(false);

  readonly headline = computed<string>(() =>
    this.hasFilters()
      ? 'No se encontraron ventas con los filtros aplicados.'
      : 'No se encontraron ventas.',
  );

  readonly subline = computed<string>(() =>
    this.hasFilters()
      ? 'Prueba con diferentes criterios de búsqueda o limpia los filtros.'
      : 'Aún no hay pedidos registrados en el sistema.',
  );
}
