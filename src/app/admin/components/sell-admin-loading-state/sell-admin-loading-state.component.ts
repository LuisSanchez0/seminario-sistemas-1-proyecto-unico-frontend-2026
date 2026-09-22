import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-sell-admin-loading-state',
  standalone: true,
  imports: [],
  template: `
    <div class="space-y-4" aria-busy="true" aria-label="Cargando ventas…">
      @for (i of skeletons; track i) {
        <div class="rounded-3xl border border-slate-200/70 bg-gradient-to-br from-white via-slate-50
                    to-indigo-50/40 p-6 shadow-sm animate-pulse">
          <div class="flex items-start justify-between mb-5">
            <div class="space-y-2">
              <div class="h-3 w-16 rounded bg-slate-200"></div>
              <div class="h-5 w-48 rounded bg-slate-200"></div>
            </div>
            <div class="flex gap-2">
              <div class="h-5 w-20 rounded-full bg-slate-200"></div>
              <div class="h-5 w-24 rounded-full bg-slate-200"></div>
            </div>
          </div>
          <div class="grid grid-cols-2 gap-3 mb-5">
            <div class="h-4 w-36 rounded bg-slate-200"></div>
            <div class="h-4 w-24 rounded bg-slate-200"></div>
            <div class="h-4 w-56 rounded bg-slate-200 col-span-2"></div>
          </div>
          <div class="flex items-center justify-between pt-4 border-t border-slate-200/60">
            <div class="flex gap-4">
              <div class="h-5 w-20 rounded bg-slate-200"></div>
              <div class="h-4 w-32 rounded bg-slate-200"></div>
            </div>
            <div class="h-8 w-32 rounded-lg bg-slate-200"></div>
          </div>
        </div>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SellAdminLoadingStateComponent {
  readonly skeletons = [1, 2, 3, 4, 5];
}
