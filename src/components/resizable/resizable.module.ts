import {NgModule} from '@angular/core';
import {ResizableComponent} from './resizable.component';
import {ResizableDirective} from './resizable.directive';

@NgModule({
  declarations: [ResizableComponent, ResizableDirective],
  exports: [ResizableComponent],
})
export class ResizableModule {
}