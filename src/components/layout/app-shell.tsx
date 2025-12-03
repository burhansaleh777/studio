import { BottomNavigation } from "./bottom-navigation";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-grow pb-16 md:pb-0"> {/* Padding bottom for nav bar */}
        {children}
      </main>
      <BottomNavigation />
    </div>
  );
}
