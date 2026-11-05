/** Always show Latin digits in Arabic storefront copy and amounts. */
export function latinDigits(value: string | number | null | undefined): string {
  return String(value ?? '').replace(/[٠-٩۰-۹]/g, char => {
    const arabic = '٠١٢٣٤٥٦٧٨٩';
    const persian = '۰۱۲۳۴۵۶۷۸۹';
    return String(arabic.includes(char) ? arabic.indexOf(char) : persian.indexOf(char));
  });
}
