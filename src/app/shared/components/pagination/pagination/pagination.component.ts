import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-pagination',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  templateUrl: './pagination.component.html',
})
export class PaginationComponent {
  pages = input(0);
  currentPage = input<number>(1);

  getPagesList = computed(() => {
    const start = Math.max(1, Math.min(this.currentPage() - 2, this.pages() - 4));
    return Array.from({ length: Math.min(5, this.pages()) }, (_, i) => start + i);
  });
}
