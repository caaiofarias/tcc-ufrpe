/**
 * Abstracts time access. Real implementation returns new Date();
 * tests can inject a fixed clock.
 */
export interface Clock {
  now(): Date;
}
