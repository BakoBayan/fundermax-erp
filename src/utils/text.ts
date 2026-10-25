/**
 * Auto-capitalization utility:
 * If a user enters text into the system without ANY capitalization,
 * then the first letter is capitalized.
 * If they didn't do that (e.g. making the whole thing capitalized,
 * or partially capitalized), it keeps it exactly the way it is.
 * Only changes text that isn't capitalized to have its first letter capitalized and NOTHING ELSE.
 */
export function autoCapitalizeFirstLetter(input: string): string;
export function autoCapitalizeFirstLetter<T extends string | undefined | null>(input: T): T;
export function autoCapitalizeFirstLetter(input: any): any {
  if (typeof input !== "string" || !input) return input;
  // If the user typed ANY uppercase letter, keep it exactly as it is
  if (/[A-Z]/.test(input)) {
    return input;
  }
  // If there are no uppercase letters, capitalize the first letter and leave everything else unchanged
  return input.replace(/([a-z])/, (match) => match.toUpperCase());
}
