// filter-dropdown.component.ts
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormControl } from '@angular/forms';

@Component({
  selector: 'app-filter-dropdown',
  template: `
    <mat-form-field>
      <mat-select [formControl]="filterControl" multiple (selectionChange)="onSelectionChange()">
        <mat-option *ngFor="let item of items" [value]="item.name">
          {{ item.name }}
        </mat-option>
      </mat-select>
    </mat-form-field>
  `
})
export class FilterDropdownComponent {
  @Input() items: any[] = [];
  @Input() filterControl: FormControl = new FormControl();

  @Output() selectionChange = new EventEmitter<string[]>();

  onSelectionChange(): void {
    this.selectionChange.emit(this.filterControl.value);
  }
}