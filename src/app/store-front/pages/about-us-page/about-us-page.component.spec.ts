import axe from 'axe-core';
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AboutUsPageComponent } from './about-us-page.component';

@Component({ template: '' })
class BlankPage {}

describe('AboutUsPageComponent', () => {
  let fixture: ComponentFixture<AboutUsPageComponent>;

  const root = () => fixture.nativeElement as HTMLElement;
  const hrefs = () =>
    Array.from(root().querySelectorAll<HTMLAnchorElement>('a')).map((a) => a.getAttribute('href'));

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AboutUsPageComponent],
      providers: [
        provideRouter([
          { path: '', component: BlankPage },
          { path: 'products', component: BlankPage },
          { path: 'cart', component: BlankPage },
          { path: 'my-orders', component: BlankPage },
        ]),
      ],
    });
    fixture = TestBed.createComponent(AboutUsPageComponent);
    fixture.detectChanges();
  });

  it('renders the brand story sections under a single page heading', () => {
    expect(root().querySelectorAll('h1')).toHaveLength(1);
    expect(root().querySelector('h1')?.textContent).toContain('Belleza que');
    expect(
      Array.from(root().querySelectorAll('h2')).map((heading) => heading.textContent?.trim()),
    ).toEqual([
      'Nuestra idea',
      'Nuestro propósito',
      'Lo que nos mueve',
      'Tu experiencia LuminaBeauty',
      expect.stringContaining('Tu rutina. Tu estilo.'),
    ]);
  });

  it('lists the purpose pillars, values and the real purchase journey', () => {
    const text = root().textContent ?? '';
    for (const pillar of ['Descubrir', 'Elegir', 'Disfrutar']) expect(text).toContain(pillar);
    for (const value of ['Diversidad', 'Cercanía', 'Confianza', 'Cuidado', 'Simplicidad']) {
      expect(text).toContain(value);
    }

    const steps = Array.from(root().querySelectorAll('#experiencia ol > li h3')).map((h) =>
      h.textContent?.trim(),
    );
    expect(steps).toEqual(['Descubre', 'Conoce', 'Elige', 'Compra', 'Sigue tu pedido']);
  });

  it('routes back to the catalog and to the pages behind each journey step', () => {
    const links = hrefs();
    expect(links.filter((href) => href === '/products').length).toBeGreaterThanOrEqual(2);
    expect(links).toContain('/');
    expect(links).toContain('/cart');
    expect(links).toContain('/my-orders');
    expect(links).toContain('#experiencia');
  });

  it('carries no leftover apparel branding or invented claims', () => {
    expect(root().textContent).not.toMatch(
      /ProWear|uniforme|prenda|bordado|Próximamente|fundad[ao] en|envío gratis|\d+\s*%/i,
    );
  });

  it('has no detectable structural AXE violations', async () => {
    const result = await axe.run(root(), {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(result.violations.map((item) => item.id)).toEqual([]);
  });
});
