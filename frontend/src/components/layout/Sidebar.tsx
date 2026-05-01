"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Wallet, ArrowLeftRight, PieChart, Settings, Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const navItems = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Accounts", href: "/accounts", icon: Wallet },
  { name: "Transactions", href: "/transactions", icon: ArrowLeftRight },
  { name: "Budgets", href: "/budgets", icon: PieChart },
  { name: "AI Assistant", href: "/chat", icon: Bot },
  { name: "Settings", href: "/settings", icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col h-full shrink-0">
      <div className="p-6">
        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-[0_0_15px_rgba(99,102,241,0.5)]">
            <span className="text-white text-lg">S</span>
          </div>
          Sure.
        </h1>
      </div>
      
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all relative group",
                isActive ? "text-white" : "text-muted-foreground hover:text-white hover:bg-muted/50"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 bg-primary/10 border border-primary/20 rounded-lg -z-10"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <item.icon className={cn("w-5 h-5", isActive ? "text-primary" : "text-muted-foreground group-hover:text-white transition-colors")} />
              {item.name}
            </Link>
          );
        })}
      </nav>
      
      <div className="p-4 mt-auto border-t border-border">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/30">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold">
            JD
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-medium text-white">John Doe</span>
            <span className="text-xs text-muted-foreground">Pro Plan</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
