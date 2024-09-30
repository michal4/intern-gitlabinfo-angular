import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class CookieService {

  constructor() { }

  /**
   * Set a cookie with a specified expiration date.
   * @param name Name of the cookie.
   * @param value Value of the cookie.
   * @param days Number of days until the cookie expires.
   */
  setCookie(name: string, value: string, days?: number): void {
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
  getCookie(name: string): string | null {
    const nameEQ = `${name}=`;
    const ca = document.cookie.split(';');
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
  deleteCookie(name: string): void {
    this.setCookie(name, '', -1);
  }
}