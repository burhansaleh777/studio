
"use client";

import { AppShell } from "@/components/layout/app-shell";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
// import { signOut } from "firebase/auth"; // Uncomment if explicit sign out is desired
// import { auth } from "@/lib/firebase";    // Uncomment if explicit sign out is desired

export default function AuthenticatedAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { currentUser, userProfile, loadingAuth, loadingProfile } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (loadingAuth) {
      return; // Wait until auth status is clear
    }

    if (!currentUser) {
      router.push("/login");
      return;
    }

    // At this point, currentUser exists. Now check profile.
    if (loadingProfile) {
      return; // Wait until profile loading is complete
    }

    if (!userProfile) {
      // currentUser exists, profile loading done, but userProfile is null
      toast({
        title: "Profile Error",
        description: "Could not load your user profile. Please try logging in again or contact support.",
        variant: "destructive",
      });
      // Optional: sign out the user before redirecting to login
      // signOut(auth).then(() => router.push("/login")).catch(() => router.push("/login"));
      router.push("/login");
    }
  }, [currentUser, userProfile, loadingAuth, loadingProfile, router, toast]);

  // Show loader if:
  // 1. Auth status is still being determined (loadingAuth is true)
  // 2. Auth status is known (currentUser exists), but profile data is still loading (loadingProfile is true)
  if (loadingAuth || (currentUser && loadingProfile)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading user data...</p>
      </div>
    );
  }

  // If, after all loading attempts:
  // 1. There's no current user (unauthenticated)
  // 2. OR there is a currentUser, but no userProfile could be loaded
  // ...then show a loading/redirecting message. The useEffect above will handle the actual redirection.
  if (!currentUser || (currentUser && !userProfile)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">
          {!currentUser ? "Redirecting to login..." : "Verifying profile or redirecting..."}
        </p>
      </div>
    );
  }

  // If all checks pass (currentUser and userProfile exist, and not loading), render the app shell.
  return <AppShell>{children}</AppShell>;
}
