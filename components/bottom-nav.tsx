"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, Images, Bell, BookOpen, Badge as Bandage } from "lucide-react";
import { useLanguage } from "@/lib/i18n/context";

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useLanguage();

  const navItems = [
    { href: "/dashboard", label: t.common.home, icon: Home },
    { href: "/dashboard/gallery", label: t.common.photos, icon: Images },
    { href: "/dashboard/dressing-log", label: t.common.dressing, icon: Bandage },
    { href: "/dashboard/notifications", label: t.common.alerts, icon: Bell },
    { href: "/dashboard/education", label: t.common.learn, icon: BookOpen },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition-colors",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
