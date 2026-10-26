import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TimelineStep } from '../../interfaces/order.interface';

/** Línea de tiempo del pedido. Horizontal desde `sm`, vertical en móviles. */
@Component({
  selector: 'app-order-timeline',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ol class="flex flex-col gap-4 sm:flex-row sm:gap-0" aria-label="Seguimiento del pedido">
      @for (step of steps(); track step.key; let last = $last) {
        <li
          class="relative flex items-center gap-3 sm:flex-1 sm:flex-col sm:gap-2 sm:text-center"
          [attr.aria-current]="step.state === 'current' ? 'step' : null"
        >
          @if (!last) {
            <span
              aria-hidden="true"
              class="absolute left-4 top-8 h-4 w-0.5 sm:left-1/2 sm:top-4 sm:h-0.5 sm:w-full"
              [class]="step.state === 'done' ? 'bg-emerald-600' : 'bg-gray-300'"
            ></span>
          }
          <span
            aria-hidden="true"
            class="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ring-2"
            [class]="
              step.state === 'done'
                ? 'bg-emerald-600 text-white ring-emerald-600'
                : step.state === 'current'
                  ? 'bg-white text-indigo-700 ring-indigo-600'
                  : 'bg-white text-gray-500 ring-gray-300'
            "
          >
            @if (step.state === 'done') {
              ✓
            } @else {
              •
            }
          </span>
          <span class="text-sm" [class]="
              step.state === 'done'
                ? 'font-semibold text-gray-900'
                : step.state === 'current'
                  ? 'font-medium text-indigo-700'
                  : 'text-gray-600'
            ">
            {{ step.label }}
            <span class="sr-only">
              {{
                step.state === 'done'
                  ? '(completado)'
                  : step.state === 'current'
                    ? '(siguiente paso)'
                    : '(pendiente)'
              }}
            </span>
          </span>
        </li>
      }
    </ol>
  `,
})
export class OrderTimelineComponent {
  readonly steps = input.required<TimelineStep[]>();
}
