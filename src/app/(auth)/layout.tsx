
"use client"; // Make it a client component for hooks

import { BimaHubLogo } from "@/components/shared/bima-hub-logo";
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { currentUser, loadingAuth } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loadingAuth && currentUser) {
      router.push("/dashboard");
    }
  }, [currentUser, loadingAuth, router]);

  if (loadingAuth || currentUser) { // Show loader if loading or if user exists (before redirect)
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-primary/10 via-background to-background p-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // Only render auth layout if not loading and no user
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-primary/10 via-background to-background p-4">
      <div className="absolute top-4 left-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/" aria-label="Back to Welcome">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
      </div>
      <Link href="/" className="mb-8">
        <BimaHubLogo className="h-12 w-auto" />
      </Link>
      <main className="w-full max-w-md">{children}</main>
    </div>
  );
}
