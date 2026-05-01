"use client";

import Masthead from "@/components/Masthead";
import { motion } from "framer-motion";

export default function Settings() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-12 pb-32 min-h-screen flex flex-col">
      <Masthead />
      
      <section className="mb-16">
        <h1 className="font-serif text-5xl md:text-6xl tracking-tighter mb-4">Preferences</h1>
        <p className="text-muted-foreground">Configure your operational parameters.</p>
      </section>

      <section className="max-w-xl space-y-12">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          <h2 className="text-sm tracking-widest uppercase text-muted-foreground border-b border-border pb-2 mb-6">Profile</h2>
          <div className="space-y-6">
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium">Name</label>
              <input 
                type="text" 
                defaultValue="Meher" 
                className="bg-transparent border-b border-border py-2 focus:outline-none focus:border-foreground transition-colors font-serif text-xl" 
              />
            </div>
            <div className="flex flex-col space-y-2">
              <label className="text-sm font-medium">Email</label>
              <input 
                type="email" 
                defaultValue="meher@example.com" 
                className="bg-transparent border-b border-border py-2 focus:outline-none focus:border-foreground transition-colors font-serif text-xl" 
              />
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
          <h2 className="text-sm tracking-widest uppercase text-muted-foreground border-b border-border pb-2 mb-6">Data Providers</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2">
              <span className="font-medium text-lg">Plaid Integration</span>
              <button className="text-sm border border-border px-4 py-1 rounded-full hover:bg-foreground hover:text-background transition-colors">Connected</button>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="font-medium text-lg text-muted-foreground">SimpleFIN</span>
              <button className="text-sm border border-border px-4 py-1 rounded-full hover:bg-foreground hover:text-background transition-colors">Connect</button>
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="pt-8 border-t border-border">
          <button className="text-negative font-medium hover:italic transition-all">
            Sign Out
          </button>
        </motion.div>
      </section>
    </div>
  );
}
