import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

interface PageHeaderProps {
  title: string;
  backHref?: string;
  children?: React.ReactNode; // For actions like a "New" button
}

export function PageHeader({ title, backHref, children }: PageHeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center px-4 sm:px-6 lg:px-8">
        {backHref && (
          <Button variant="ghost" size="icon" className="mr-2 -ml-2" asChild>
            <Link href={backHref}>
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Back</span>
            </Link>
          </Button>
        )}
        <h1 className="text-xl font-semibold flex-1 truncate">{title}</h1>
        {children && <div className="ml-auto flex items-center space-x-2">{children}</div>}
      </div>
    </header>
  );
}
