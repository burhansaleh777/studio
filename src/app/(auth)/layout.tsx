import { BimaHubLogo } from "@/components/shared/bima-hub-logo";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
