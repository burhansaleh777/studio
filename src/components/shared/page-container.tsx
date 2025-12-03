import { cn } from "@/lib/utils";

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
}

export function PageContainer({ children, className }: PageContainerProps) {
  return (
    <div className={cn("container mx-auto p-4 sm:p-6 lg:p-8 max-w-4xl", className)}>
      {children}
    </div>
  );
}
