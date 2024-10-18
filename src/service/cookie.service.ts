import {Injectable} from '@angular/core';
import { PREFIX_COOKIE } from '../view/projects/projects.component';

@Injectable({
  providedIn: 'root'
})
export class CookieService {

  constructor() {
  }

  /**
   * Set a cookie with a specified expiration date.
   * @param name Name of the cookie.
   * @param value Value of the cookie.
   * @param days Number of days until the cookie expires.
   */
  setCookie(name: `${typeof PREFIX_COOKIE}${string}`, value: string, days?: number): void {
    //              <- @hejny You can restrict names much more narrowly than just string
    let expires = '';
    if (days) {
      const date = new Date();
      date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
      expires = `; expires=${date.toUTCString()}`;
    }
    document.cookie = `${name}=${value || ''}${expires}; path=/`;
  }

  /**
   * Get the value of a cookie by its name.
   * @param name Name of the cookie to retrieve.
   * @returns The value of the cookie, or null if it doesn't exist.
   */
  getCookie(name: `${typeof PREFIX_COOKIE}${string}`): string | null {
    //              <- @hejny You can restrict names much more narrowly than just string
    const nameEQ = `${name}=`;
    const ca = document.cookie.split(';');
    //    <- @hejny Some naming is meaningless and probably should be done better.
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i];
      while (c.charAt(0) === ' ') {
        c = c.substring(1, c.length);
      }
      if (c.indexOf(nameEQ) === 0) {
        return c.substring(nameEQ.length, c.length);
      }
    }
    return null;
  }

  /**
   * Delete a cookie by setting its expiration date to a past date.
   * @param name Name of the cookie to delete.
   */
  deleteCookie(name: `${typeof PREFIX_COOKIE}${string}`): void {
    //              <- @hejny You can restrict names much more narrowly than just string
    this.setCookie(name, '', -1);
  }
}