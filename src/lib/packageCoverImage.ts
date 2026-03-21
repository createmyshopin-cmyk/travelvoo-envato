/** Cover gallery item for package / trip admin (kept out of dnd-kit chunk for lighter dialogs). */
export type PackageCoverImage = { id: string; url: string };

export function newPackageImageId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `pkg-img-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
