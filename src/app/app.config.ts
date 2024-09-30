import {HttpClient, HttpClientModule} from "@angular/common/http"; // Import HttpClientModule
import {ApplicationConfig, importProvidersFrom} from "@angular/core";
import {TranslateHttpLoader} from '@ngx-translate/http-loader';
import {CookieService} from "ngx-cookie-service";
import {MAT_DATE_LOCALE} from "@angular/material/core";
import {provideRouter} from "@angular/router";
import {provideAnimations} from "@angular/platform-browser/animations";
import {provideAnimationsAsync} from '@angular/platform-browser/animations/async';
import {TranslateLoader, TranslateModule} from "@ngx-translate/core";
import {APP_ROUTES} from "./app.routes";
import {XmlHttpRequestUtils} from "../util/xmlHttpRequestUtils";
import {ApiModule, Configuration} from "intern-gitlabinfo-openapi-angular";


export function HttpLoaderFactory(http: HttpClient): TranslateHttpLoader {
  return new TranslateHttpLoader(http, './assets/i18n/');
}

export const appConfig: ApplicationConfig = {
  providers: [
    CookieService,
    {provide: MAT_DATE_LOCALE, useValue: 'de-DE'},
    provideRouter(APP_ROUTES),
    provideAnimations(),
    provideAnimationsAsync(),
    importProvidersFrom(
      HttpClientModule, // Add HttpClientModule here
      TranslateModule.forRoot({
        loader: {
          provide: TranslateLoader,
          useFactory: HttpLoaderFactory,
          deps: [HttpClient],
        },
      }),
      ApiModule.forRoot(() => {
        return new Configuration({
          basePath: XmlHttpRequestUtils.getApiBasePathXMLHttpRequest(),
        });
      })
    )
  ],
};
