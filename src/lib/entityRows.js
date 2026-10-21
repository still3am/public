/** Normalize SDK array and paginated entity responses without assuming either shape.
 * @param {unknown} value
 * @returns {any[]}
 */
export function entityRows(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object" && "items" in value && Array.isArray(value.items)) return value.items;
  return [];
}
