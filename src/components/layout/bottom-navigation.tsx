
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, FileText, MessageCircle, CreditCard, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext"; // Added import

const navItemsConfig = [
  { href: "/dashboard", labelKey: "bottomNav.dashboard", icon: Home },
  { href: "/claims", labelKey: "bottomNav.claims", icon: FileText },
  { href: "/chat", labelKey: "bottomNav.chat", icon: MessageCircle },
  { href: "/payments", labelKey: "bottomNav.payments", icon: CreditCard },
  { href: "/profile", labelKey: "bottomNav.profile", icon: User },
];

export function BottomNavigation() {
  const pathname = usePathname();
  const { t } = useLanguage(); // Added useLanguage hook

  const navItems = navItemsConfig.map(item => ({
    ...item,
    label: t(item.labelKey),
  }));

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
                "flex flex-col items-center justify-center p-2 rounded-md transition-colors duration-150 ease-in-out w-[calc(100%/5)]", // Ensure equal width
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <item.icon className="h-6 w-6 mb-0.5" strokeWidth={isActive ? 2.5 : 2} />
              <span className={cn("text-xs font-medium text-center truncate w-full", isActive ? "font-semibold" : "")}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
