import axe from 'axe-core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BrandAutocompleteComponent } from './brand-autocomplete.component';
const brands = [
  { id: 'one', name: 'Maybelline', slug: 'maybelline' },
  { id: 'two', name: 'MAC Cosmetics', slug: 'mac-cosmetics' },
];

describe('Brand autocomplete', () => {
  let fixture: ComponentFixture<BrandAutocompleteComponent>;
  let component: BrandAutocompleteComponent;
  beforeEach(() => {
    fixture = TestBed.createComponent(BrandAutocompleteComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('brands', brands);
    fixture.detectChanges();
  });
  it('exposes an accessible expanded combobox', async () => {
    component.show();
    fixture.detectChanges();
    const result = await axe.run(fixture.nativeElement, {
      runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] },
      rules: { 'color-contrast': { enabled: false } },
    });
    expect(result.violations.map((violation) => violation.id)).toEqual([]);
  });
  it('shows all on focus, filters case-insensitively and selects with keyboard', () => {
    const selected = vi.fn();
    component.selectionChange.subscribe(selected);
    component.show();
    expect(component.filtered()).toHaveLength(2);
    component.searchFor('mAc');
    expect(component.filtered()).toEqual([brands[1]]);
    component.keydown(new KeyboardEvent('keydown', { key: 'ArrowDown' }));
    component.keydown(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(selected).toHaveBeenCalledWith('two');
    expect(component.open()).toBe(false);
  });
  it('offers explicit creation without treating typed text as selected brand', () => {
    const selected = vi.fn();
    const create = vi.fn();
    component.selectionChange.subscribe(selected);
    component.createRequested.subscribe(create);
    component.searchFor('Rare Beauty');
    fixture.detectChanges();
    expect(selected).not.toHaveBeenCalled();
    expect(create).not.toHaveBeenCalled();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    button.click();
    expect(create).toHaveBeenCalledWith('Rare Beauty');
    expect(component.open()).toBe(false);
  });
  it('keeps the list open when focus moves inside and closes on outside interaction', () => {
    component.show();
    fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    component.onFocusOut(new FocusEvent('focusout', { relatedTarget: input }));
    expect(component.open()).toBe(true);
    component.onFocusOut(new FocusEvent('focusout', { relatedTarget: document.body }));
    expect(component.open()).toBe(false);
    component.show();
    component.keydown(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(component.open()).toBe(false);
  });
  it('clears the selected id and exposes selection through ARIA', () => {
    fixture.componentRef.setInput('value', 'one');
    component.show();
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('[role="option"]').getAttribute('aria-selected'),
    ).toBe('true');
    const selected = vi.fn();
    component.selectionChange.subscribe(selected);
    component.clear();
    expect(selected).toHaveBeenCalledWith('');
  });
});
