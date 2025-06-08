
"use client";

import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { PageContainer } from "@/components/shared/page-container";
import { Loader2 } from "lucide-react";

export default function AuthenticatedAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { currentUser, loadingAuth } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loadingAuth && !currentUser) {
      router.push("/login");
    }
  }, [currentUser, loadingAuth, router]);

  if (loadingAuth) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!currentUser) {
    // This helps prevent rendering children briefly before redirect
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Redirecting to login...</p>
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
