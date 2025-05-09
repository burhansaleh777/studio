import { AppShell } from "@/components/layout/app-shell";

export default function AuthenticatedAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // In a real app, you'd protect these routes, e.g., redirect if not authenticated.
  return <AppShell>{children}</AppShell>;
}
