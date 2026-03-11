import type { ReactNode } from "react";
import { AuthProvider } from "@/lib/auth";

export function AppProvider({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
  return <AuthProvider>{children}</AuthProvider>;
}
