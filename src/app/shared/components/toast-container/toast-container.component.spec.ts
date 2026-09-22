import axe from 'axe-core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ToastContainerComponent } from './toast-container.component';
import { NotificationService } from '../../services/notification.service';

describe('Toast container', () => {
  let fixture: ComponentFixture<ToastContainerComponent>;
  let notifications: NotificationService;
  beforeEach(async () => {
    vi.useFakeTimers();
    await TestBed.configureTestingModule({
      imports: [ToastContainerComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(ToastContainerComponent);
    notifications = TestBed.inject(NotificationService);
    fixture.detectChanges();
  });
  afterEach(() => vi.useRealTimers());

  function toasts(): HTMLElement[] {
    return [...fixture.nativeElement.querySelectorAll('[aria-atomic="true"]')];
  }

  it('renders the title and description of a notification', () => {
    notifications.success('Producto guardado', 'Los cambios se guardaron.');
    fixture.detectChanges();
    expect(toasts()).toHaveLength(1);
    const text = toasts()[0].textContent ?? '';
    expect(text).toContain('Producto guardado');
    expect(text).toContain('Los cambios se guardaron.');
  });

  it('omits the description paragraph when none is provided', () => {
    notifications.success('Imagen eliminada');
    fixture.detectChanges();
    expect(toasts()[0].querySelectorAll('p')).toHaveLength(1);
  });

  it('gives each type its own semantic variant and hidden type label', () => {
    notifications.success('Guardado');
    notifications.error('No se pudo guardar');
    notifications.info('Sincronizando');
    fixture.detectChanges();
    const [success, error, info] = toasts();

    expect(success.querySelector('.bg-success')).toBeTruthy();
    expect(success.textContent).toContain('Éxito:');
    expect(success.getAttribute('role')).toBe('status');
    expect(success.getAttribute('aria-live')).toBe('polite');

    expect(error.querySelector('.bg-error')).toBeTruthy();
    expect(error.textContent).toContain('Error:');
    expect(error.getAttribute('role')).toBe('alert');
    expect(error.getAttribute('aria-live')).toBe('assertive');

    expect(info.querySelector('.bg-info')).toBeTruthy();
    expect(info.textContent).toContain('Información:');
    expect(info.getAttribute('role')).toBe('status');
  });

  it('announces each toast once: no live region wraps the list', () => {
    notifications.error('Error de red');
    fixture.detectChanges();
    const liveRegions = fixture.nativeElement.querySelectorAll('[aria-live]');
    expect(liveRegions).toHaveLength(1);
    expect(liveRegions[0].getAttribute('role')).toBe('alert');
  });

  it('stacks multiple notifications and dismisses only the chosen one', () => {
    notifications.success('Uno');
    notifications.success('Dos');
    notifications.error('Tres');
    fixture.detectChanges();
    expect(toasts()).toHaveLength(3);

    const close = toasts()[1].querySelector<HTMLButtonElement>(
      'button[aria-label="Cerrar notificación"]',
    );
    expect(close).toBeTruthy();
    close!.click();
    fixture.detectChanges();
    const remaining = toasts().map((t) => t.textContent);
    expect(remaining).toHaveLength(2);
    expect(remaining[0]).toContain('Uno');
    expect(remaining[1]).toContain('Tres');
  });

  it('auto-dismisses on the service duration', () => {
    notifications.success('Temporal');
    fixture.detectChanges();
    expect(toasts()).toHaveLength(1);
    vi.advanceTimersByTime(3500);
    fixture.detectChanges();
    expect(toasts()).toHaveLength(0);
  });

  it('has no detectable WCAG A/AA violations', async () => {
    // axe.run awaits real timers/microtasks; fake timers would stall it.
    vi.useRealTimers();
    notifications.success('Producto guardado', 'Los cambios se guardaron.');
    notifications.error('No se pudo guardar', 'Revisa la conexión.');
    notifications.info('Sincronizando');
    fixture.detectChanges();
    const result = await axe.run(fixture.nativeElement, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'best-practice'] },
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(result.violations.map((violation) => violation.id)).toEqual([]);
  });
});
