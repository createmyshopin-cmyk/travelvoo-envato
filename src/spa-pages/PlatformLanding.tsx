import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";

const PlatformLanding = () => {
  return (
    <div className="min-h-screen bg-background flex flex-col pt-16">
      {/* Header stub - can be expanded later */}
      <header className="fixed top-0 inset-x-0 h-16 border-b bg-background/80 backdrop-blur-md z-50 flex items-center px-4 md:px-8 justify-between">
        <div className="font-bold text-xl tracking-tight text-primary">TravelVoo</div>
        <div className="flex gap-4 items-center">
          <a href="/login" className="text-sm font-medium hover:text-primary transition-colors">Log In</a>
          <Button size="sm" className="rounded-full shadow-soft" asChild>
            <a href="/create-account">Get Started</a>
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 md:px-6 pt-20">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="inline-flex items-center rounded-full border px-3 py-1 text-sm font-medium mb-6 bg-muted/50 text-muted-foreground"
        >
          <span className="flex h-2 w-2 rounded-full bg-primary mr-2 animate-pulse"></span>
          The Future of Hospitality Tech
        </motion.div>
        
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="text-4xl md:text-6xl lg:text-7xl font-bold max-w-4xl leading-[1.1] tracking-tighter"
        >
          Launch Your <span className="text-primary bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">Premium Booking</span> Platform Today
        </motion.h1>
        
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed"
        >
          TravelVoo empowers resorts and properties to create stunning, high-converting websites in minutes. Zero coding, full control.
        </motion.p>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mt-10 flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
        >
          <Button size="lg" className="rounded-full px-8 h-12 text-base shadow-lg shadow-primary/25" asChild>
            <a href="/create-account">Start Your Trial</a>
          </Button>
          <Button size="lg" variant="outline" className="rounded-full px-8 h-12 text-base hover:bg-muted/50">
            View Features
          </Button>
        </motion.div>
      </section>
      
      {/* Footer */}
      <footer className="py-8 text-center text-sm text-muted-foreground border-t bg-muted/20">
        © {new Date().getFullYear()} TravelVoo Platform. All rights reserved.
      </footer>
    </div>
  );
};

export default PlatformLanding;
