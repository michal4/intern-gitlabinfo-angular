import {DOCUMENT} from "@angular/common";
import {Directive, ElementRef, EventEmitter, Inject, OnInit, Output} from "@angular/core";
import {distinctUntilChanged, map, switchMap, takeUntil, tap} from "rxjs/operators";
import {fromEvent} from "rxjs";

@Directive({
  selector: "[resizable]"
})
export class ResizableDirective implements OnInit {

  @Output()
  readonly resizable = new EventEmitter<number>();

  constructor(
    @Inject(DOCUMENT) private readonly documentRef: Document,
    private readonly elementRef: ElementRef<HTMLElement>
  ) {
  }

  ngOnInit() {
    fromEvent<MouseEvent>(
      this.elementRef.nativeElement,
      "mousedown"
    ).pipe(
      tap(e => e.preventDefault()),
      switchMap(() => {
        const thElement = this.elementRef.nativeElement.closest("th");


        const columnId = thElement?.getAttribute('id');
        console.log('id ' + columnId)

        if (!thElement) {
          throw new Error("The closest <th> element is not found.");
        }

        const {width, right} = thElement.getBoundingClientRect();

        return fromEvent<MouseEvent>(this.documentRef, "mousemove").pipe(
          map(({clientX}) => width + clientX - right),
          distinctUntilChanged(),
          takeUntil(fromEvent(this.documentRef, "mouseup"))
        );
      })
    ).subscribe(value => {
      this.resizable.emit(value);
    });
  }
}
