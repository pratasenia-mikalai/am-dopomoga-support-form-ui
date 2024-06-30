import {ApplicationConfig, inject, provideZoneChangeDetection} from '@angular/core';
import {provideRouter} from '@angular/router';

import {routes} from './app.routes';
import {provideAnimationsAsync} from '@angular/platform-browser/animations/async';
import {
  HttpErrorResponse, HttpEvent,
  HttpHandlerFn,
  HttpRequest,
  provideHttpClient,
  withFetch,
  withInterceptors
} from "@angular/common/http";
import {AuthService} from "./airtable-api/auth.service";
import {catchError, Observable, throwError} from "rxjs";
import {MatSnackBar} from "@angular/material/snack-bar";
import {AirtableEntity, Good} from "./model";

export const _DATE_FORMAT = {
  parse: {
    dateInput: 'DD/MM/YYYY',
  },
  display: {
    dateInput: 'DD/MM/YYYY',
    monthYearLabel: 'MMMM YYYY',
    dateA11yLabel: 'DD/MM/YYYY',
    monthYearA11yLabel: 'MMMM YYYY',
  },
};

export const _API_ROOT: string = "https://api.airtable.com/v0"

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({eventCoalescing: true}),
    provideRouter(routes),
    provideAnimationsAsync(),
    provideHttpClient(withFetch(), withInterceptors([authInterceptor]))
  ]
};

export function authInterceptor(req: HttpRequest<unknown>, next: HttpHandlerFn) {
  const authToken = inject(AuthService).getToken();
  const snackBar = inject(MatSnackBar)
  let nextEvent: Observable<HttpEvent<any>>;
  if (authToken && !req.headers.has("Authorization")) {
    const newReq = req.clone({
      headers: req.headers.append("Authorization", authToken),
    });
    nextEvent = next(newReq)
  } else {
    nextEvent = next(req)
  }

  return nextEvent.pipe(
    catchError(err => {
      if (err instanceof HttpErrorResponse) {
        snackBar.open(`${err.status} : ${err.message}`, "close", {duration: 5000})
      }
      return throwError(err)
    })
  )

}
