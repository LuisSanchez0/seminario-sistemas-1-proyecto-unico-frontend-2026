import { Component, computed, CUSTOM_ELEMENTS_SCHEMA, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../../auth/services/auth.service';


@Component({
  selector: 'app-admin-dashboard-layout',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive
],
  templateUrl: './admin-dashboard-layout.component.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AdminDashboardLayoutComponent {
  authService = inject( AuthService );
  router = inject( Router )

  user = computed( () => this.authService.user() )


  logout(){
    this.authService.logout()
    this.router.navigate(['/'])
  }
}
