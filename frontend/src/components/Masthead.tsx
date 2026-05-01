"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

export default function Masthead() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Close the index when navigation occurs
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const navItems = [
    { name: "Overview", path: "/" },
    { name: "The Archive", path: "/transactions" },
    { name: "The Holdings", path: "/accounts" },
    { name: "The Strategy", path: "/strategy" },
    { name: "Preferences", path: "/settings" },
  ];

  return (
    <>
      <header className="flex justify-between items-end border-b border-border pb-4 mb-16 relative z-50">
        <span className="text-muted-foreground text-sm font-medium tracking-wide">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </span>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="font-serif text-2xl font-bold tracking-tight absolute left-1/2 -translate-x-1/2 hover:opacity-70 transition-opacity focus:outline-none"
        >
          {isOpen ? "Close." : "Sure."}
        </button>
        <Link href="/settings" className="w-8 h-8 rounded-full border border-foreground flex items-center justify-center font-serif text-sm hover:bg-foreground hover:text-background transition-colors">
          ME
        </Link>
      </header>

      {/* The Index (Full-screen typographic navigation overlay) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="fixed inset-0 bg-background z-40 flex flex-col pt-32 px-6 overflow-y-auto"
          >
            <div className="max-w-4xl mx-auto w-full">
              <h2 className="text-sm tracking-widest uppercase text-muted-foreground mb-12">The Index</h2>
              <nav className="flex flex-col space-y-6">
                {navItems.map((item, i) => (
                  <motion.div
                    key={item.path}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 + 0.2 }}
                  >
                    <Link 
                      href={item.path} 
                      className={`font-serif text-6xl md:text-8xl tracking-tighter hover:italic transition-all duration-300 ${pathname === item.path ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
                    >
                      {item.name}
                    </Link>
                  </motion.div>
                ))}
              </nav>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
