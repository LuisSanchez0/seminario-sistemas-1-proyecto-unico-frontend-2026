import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from '../../components/navbar/navbar.component';
import { ToastContainerComponent } from '../../../shared/components/toast-container/toast-container.component';
import { Footer } from "../../../shared/components/footer/footer";

@Component({
  selector: 'app-store-front-layout',
  imports: [NavbarComponent, RouterOutlet, ToastContainerComponent, Footer],
  templateUrl: './store-front-layout.component.html',
})
export class StoreFrontLayoutComponent {}
