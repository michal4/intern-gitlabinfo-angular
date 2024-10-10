import { Component, ElementRef, HostBinding, AfterViewInit } from "@angular/core";
import { CookieService } from "../../service/cookie.service";

@Component({
  selector: "th[resizable]",
  templateUrl: "./resizable.component.html",
  styleUrls: ["./resizable.component.scss"],
})
export class ResizableComponent implements AfterViewInit {
  @HostBinding("style.width.px")
  width: number | null = null;

  columnId: string | null = null;

  constructor(private elementRef: ElementRef<HTMLElement>, private cookieService: CookieService) {}

  ngOnInit() {
    this.columnId = this.elementRef.nativeElement.id;

    // Check for a saved width in cookies and set it
    const savedWidth = this.cookieService.getCookie(`${this.columnId}_width`);
    if (savedWidth) {
      this.width = parseInt(savedWidth, 10);
      this.elementRef.nativeElement.style.width = `${this.width}px`;
    }
  }

  ngAfterViewInit() {
    const header = this.elementRef.nativeElement;
    const observer = new ResizeObserver(() => {
      const newWidth = header.offsetWidth;
      this.onResize(newWidth);
    });

    observer.observe(header);
  }

  onResize(width: number) {
    this.width = width;
    this.cookieService.setCookie(`${this.columnId}_width`, width.toString());
  }
}
