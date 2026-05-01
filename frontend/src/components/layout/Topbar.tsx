"use client";

import { Bell, Search } from "lucide-react";

export default function Topbar() {
  return (
    <header className="h-16 border-b border-border bg-background/80 backdrop-blur-md flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center bg-card rounded-full px-4 py-2 border border-border focus-within:border-primary/50 transition-colors w-96">
        <Search className="w-4 h-4 text-muted-foreground mr-2" />
        <input 
          type="text" 
          placeholder="Search transactions, accounts..." 
          className="bg-transparent border-none outline-none text-sm w-full text-foreground placeholder:text-muted-foreground"
        />
      </div>

      <div className="flex items-center gap-4">
        <button className="relative p-2 rounded-full hover:bg-muted transition-colors text-muted-foreground hover:text-white">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full ring-2 ring-background"></span>
        </button>
      </div>
    </header>
  );
}
