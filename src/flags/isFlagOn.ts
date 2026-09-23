/**
 * Whether the change wrapped by a flag should render for this viewer.
 * A flag id such as `req-42` is on when its request is shipped (the issue
 * carries the `shipped` label) or the viewer has a local override
 * for it, and only ever in demo mode. Outside demo mode this is always false.
 */
export function isFlagOn(
  id: string,
  shipped: ReadonlySet<string>,
  overrides: ReadonlySet<string>,
  demo: boolean,
): boolean {
  return demo && (shipped.has(id) || overrides.has(id))
}
