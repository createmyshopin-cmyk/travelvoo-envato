"use client";

import AdminThemePreview from "@/spa-pages/admin/AdminThemePreview";

export default function Page({ params }: { params: { slug: string } }) {
  return <AdminThemePreview params={params} />;
}
