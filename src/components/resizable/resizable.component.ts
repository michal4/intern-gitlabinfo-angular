import {Component, ElementRef, HostBinding} from "@angular/core";
import { CookieService } from "../../service/cookie.service";

@Component({
  selector: "th[resizable]",
  templateUrl: "./resizable.component.html",
  styleUrls: ["./resizable.component.scss"],
})
export class ResizableComponent {

  @HostBinding("style.width.px")
  width: number | null = null;

  columnId: string | null = null;

  constructor(private elementRef: ElementRef<HTMLElement>,
              private cookieService: CookieService) {
  }

  ngOnInit() {
    this.columnId = this.elementRef.nativeElement.id;
  }

  onResize(width: number) {
    this.width = width;
    this.cookieService.setCookie(`${this.columnId}_width`, width.toString())
  }

}