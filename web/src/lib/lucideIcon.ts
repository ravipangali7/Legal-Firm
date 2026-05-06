import * as Icons from "lucide-react";
import type { LucideIcon } from "lucide-react";

/** Resolve CMS / API icon name to a Lucide component (allowlist via lucide-react exports). */
export function resolveLucideIcon(name: string | undefined | null): LucideIcon {
  const key = (name || "").trim() || "Scale";
  const Icon = (Icons as Record<string, LucideIcon | undefined>)[key];
  return Icon ?? Icons.Scale;
}
