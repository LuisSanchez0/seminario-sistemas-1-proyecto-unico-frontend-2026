import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';


@Component({
  selector: 'app-auth-layout',
  imports: [
    RouterOutlet,
    RouterLink
  ],
  templateUrl: './auth-layout.component.html',
})
export class AuthLayoutComponent {
  router = inject(Router)
}
