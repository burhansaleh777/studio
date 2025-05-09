"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, FileText, MessageCircle, CreditCard, User } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/claims", label: "Claims", icon: FileText },
  { href: "/chat", label: "Chat", icon: MessageCircle },
  { href: "/payments", label: "Payments", icon: CreditCard },
  { href: "/profile", label: "Profile", icon: User },
];

export function BottomNavigation() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border shadow-t-lg md:hidden z-50">
      <div className="flex h-full items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center p-2 rounded-md transition-colors duration-150 ease-in-out",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <item.icon className="h-6 w-6 mb-0.5" strokeWidth={isActive ? 2.5 : 2} />
              <span className={cn("text-xs font-medium", isActive ? "font-semibold" : "")}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
