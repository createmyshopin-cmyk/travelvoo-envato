import { Camera, MessageCircle, Globe, CheckCircle2, Star, Quote, MessageSquare, FileText, CreditCard, Zap, Calendar, AtSign } from "lucide-react";

const PlatformLanding = () => {
  return (
    <div className="bg-[#fef9f1] text-[#1d1b17] font-sans selection:bg-[#ffdad6] selection:text-[#410002] overflow-x-hidden min-h-screen">
      {/* Top Navigation Bar */}
      <nav className="fixed top-0 w-full z-50 bg-[#F3EEE7]/80 dark:bg-stone-900/80 backdrop-blur-xl shadow-[0_20px_40px_rgba(29,27,23,0.06)]">
        <div className="flex justify-between items-center px-8 py-4 max-w-7xl mx-auto">
          <div className="text-2xl font-bold tracking-tighter text-stone-900 dark:text-stone-50">TravelVoo</div>
          <div className="hidden md:flex items-center gap-8">
            <a className="text-sm font-medium tracking-tight text-[#DC2626] dark:text-[#EF4444] border-b-2 border-[#DC2626] pb-1" href="#features">Features</a>
            <a className="text-sm font-medium tracking-tight text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors" href="#">Solutions</a>
            <a className="text-sm font-medium tracking-tight text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors" href="#">Pricing</a>
            <a className="text-sm font-medium tracking-tight text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors" href="#">Integrations</a>
            <a className="text-sm font-medium tracking-tight text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors" href="#">Blog</a>
          </div>
          <button className="bg-[#dc2626] text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:scale-105 transition-transform active:scale-95">
            Schedule a Demo
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <span className="inline-block px-4 py-1.5 rounded-full bg-[#ece7e1] text-[#5c403c] text-xs font-bold tracking-widest uppercase mb-8">
            Hospitality Automation Platform
          </span>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter text-[#1d1b17] mb-8 leading-[0.95]">
            Your Properties.<br />
            <span className="text-[#dc2626]">Your Rules.</span> Your Prices.
          </h1>
          <p className="text-lg md:text-xl text-[#5c403c] max-w-2xl mx-auto mb-12 font-medium">
            The modern operating system for luxury rentals and boutique hotels. Direct bookings, unified management, and seamless guest experiences.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button className="bg-gradient-to-br from-[#b70011] to-[#dc2626] text-white px-8 py-4 rounded-xl text-lg font-bold shadow-lg hover:shadow-red-500/20 transition-all active:scale-95">
              Start Free Trial
            </button>
            <button className="bg-[#ece7e1] text-[#1d1b17] px-8 py-4 rounded-xl text-lg font-bold hover:bg-[#e7e2db] transition-all">
              View Showcase
            </button>
          </div>
        </div>

        {/* Abstract Background Elements */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full pointer-events-none opacity-40">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#ffb4ab] blur-[120px] rounded-full"></div>
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-[#c0c6db] blur-[140px] rounded-full"></div>
        </div>
      </section>

      {/* Feature Intro */}
      <section id="features" className="px-6 py-24">
        <div className="max-w-7xl mx-auto bg-white rounded-[48px] p-8 md:p-20 shadow-[0_40px_80px_rgba(29,27,23,0.04)]">
          <div className="max-w-3xl mb-16">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-[#1d1b17] mb-6">
              Bookable Anywhere. <br />Managed Everywhere.
            </h2>
            <p className="text-[#5c403c] text-lg leading-relaxed">
              Stop juggling tabs. TravelVoo centralizes your distribution while giving you the freedom to sell where your guests are.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Card 1 */}
            <div className="group p-8 rounded-[32px] bg-[#f2ede6] hover:bg-[#ece7e1] transition-all duration-500">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Camera className="text-[#dc2626] w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-4">Instagram Booking</h3>
              <p className="text-[#5c403c]">Turn your aesthetic feed into a direct sales channel. Link stories and posts directly to checkout.</p>
            </div>
            {/* Card 2 */}
            <div className="group p-8 rounded-[32px] bg-[#f2ede6] hover:bg-[#ece7e1] transition-all duration-500">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <MessageCircle className="text-[#dc2626] w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-4">WhatsApp Reservations</h3>
              <p className="text-[#5c403c]">Automated booking bots for WhatsApp. Close luxury leads in seconds without human intervention.</p>
            </div>
            {/* Card 3 */}
            <div className="group p-8 rounded-[32px] bg-[#f2ede6] hover:bg-[#ece7e1] transition-all duration-500">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Globe className="text-[#dc2626] w-8 h-8" />
              </div>
              <h3 className="text-xl font-bold mb-4">Website Booking Engine</h3>
              <p className="text-[#5c403c]">A lightning-fast, conversion-optimized checkout for your existing brand website.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Product Story: Unified Access */}
      <section className="py-24 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div className="relative group">
            <div className="absolute -inset-4 bg-[#dc2626]/5 rounded-[40px] blur-3xl transition-opacity group-hover:opacity-100 opacity-0"></div>
            <div className="relative bg-[#e7e2db] rounded-[40px] p-4 overflow-hidden shadow-2xl">
              <img
                className="w-full h-[500px] object-cover rounded-[32px] shadow-inner"
                alt="Luxury hotel room interior with modern dashboard mockup overlay"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuBPiVq3LOtlPjzmGDNxfHu9XVpOESftsu8jNoRVKU71XRslnifojB-iB0SuG45St6lrRU1KSoXTIbHBAJnec45uppfd8H5LOj_oQX7uxiRdU-OG5xlOVcs0YdT17tyVAABYRPxuHr0g7SXXywGbIb5V6jG8uvc7HBzh7QLW_5NHvzvrXn0odGFIIIoWsRRmyZTl-2L8cdMN38u-95_cst9MZi65Ay_FcRRxa6FZuI-GxyVXUJet06Ic1s26OBf552t7c5GqPSkORBpA"
              />
              {/* Floating UI elements */}
              <div className="absolute top-10 right-10 bg-white/70 backdrop-blur-xl p-6 rounded-2xl shadow-xl w-64 border border-white/20">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-[#dc2626] flex items-center justify-center text-white">
                    <CheckCircle2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-[#5c403c] uppercase tracking-tighter">New Booking</p>
                    <p className="text-sm font-bold">$2,450.00</p>
                  </div>
                </div>
                <div className="h-1.5 w-full bg-[#f2ede6] rounded-full overflow-hidden">
                  <div className="h-full bg-[#dc2626] w-3/4"></div>
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-8">
            <span className="text-[#dc2626] font-bold tracking-widest uppercase text-xs">Unified Access</span>
            <h2 className="text-5xl font-bold tracking-tighter leading-tight">One Link = <br />All Your Properties</h2>
            <p className="text-[#5c403c] text-xl leading-relaxed">
              Create a bespoke digital concierge for your entire portfolio. Guests can browse, compare, and book any of your luxury listings through a single, white-labeled interface.
            </p>
            <ul className="space-y-4">
              <li className="flex items-center gap-4 text-[#1d1b17] font-semibold">
                <Star className="text-[#dc2626] w-6 h-6 fill-[#dc2626]" />
                Unified Inventory Sync
              </li>
              <li className="flex items-center gap-4 text-[#1d1b17] font-semibold">
                <Star className="text-[#dc2626] w-6 h-6 fill-[#dc2626]" />
                Dynamic Pricing Control
              </li>
              <li className="flex items-center gap-4 text-[#1d1b17] font-semibold">
                <Star className="text-[#dc2626] w-6 h-6 fill-[#dc2626]" />
                Multi-language Support
              </li>
            </ul>
            <div className="pt-8">
              <button className="bg-[#1d1b17] text-[#fef9f1] px-8 py-4 rounded-xl font-bold hover:scale-105 transition-all">
                Explore The Dashboard
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-6 bg-[#f8f3ec]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold tracking-tight mb-4 text-[#1d1b17]">Loved by Premium Hosts</h2>
            <p className="text-[#5c403c]">Managing over 12,000 keys across 45 countries.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-10 rounded-[32px] shadow-sm relative">
              <Quote className="text-[#ffb4ab] w-16 h-16 absolute top-6 right-8 opacity-40" />
              <p className="text-[#1d1b17] italic text-lg mb-8 relative z-10">"TravelVoo increased our direct bookings by 40% in the first three months. The Instagram integration is a game-changer for luxury villa marketing."</p>
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-12 h-12 rounded-full bg-[#f2ede6] overflow-hidden">
                  <img className="w-full h-full object-cover" alt="Portrait of a female host smiling" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD6iXWFzOhksyBr7i6SyU_Mk70xwFjdTsWCVqco3Lrq-mmgDIaNdKo9C07rYdphwcNiSpDmZW5QnfUvT7gS0JIVvjV3q-eQgcDm2p8t-2fACENInYZJ07vbs1ybXTQLiHbSk2Z_yr5GloY2zjE9QPboTslgp7VVk7Qb5rT5ehaA2YH0HCktf2WHCvhVSqYKe1JrOjb24M0MRP8guGrXInvIrlaR7zFlU-E7vh1IgHrq6VisSrIfgDPLDeUaaRag6mkXhtHQ55yPhr_Q" />
                </div>
                <div>
                  <p className="font-bold text-[#1d1b17]">Elena Rodriguez</p>
                  <p className="text-xs text-[#5c403c] uppercase tracking-widest">Villa Bloom Bali</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-10 rounded-[32px] shadow-sm relative border-2 border-[#dc2626]/10">
              <Quote className="text-[#ffb4ab] w-16 h-16 absolute top-6 right-8 opacity-40" />
              <p className="text-[#1d1b17] italic text-lg mb-8 relative z-10">"The hospitality OS we've been waiting for. It feels like an editorial experience, not a database. Our guests love the checkout flow."</p>
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-12 h-12 rounded-full bg-[#f2ede6] overflow-hidden">
                  <img className="w-full h-full object-cover" alt="Portrait of a male business owner" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDULqOlzwfhGOkzVJJeIBrO58LyE9UIrBYxV18GVAwESrbvHQ1eVTzcZMult227NvVOQWjkyv3Y9fqIP8TGyXu9UsBSRCfjLI00fYIglbpbwr9zQqWhpYWU0PzDL5rKfFtZKDQEFUxNXc_IlZV8Hmjr4QjTHZhV0RqDDHLrWkhQhzoM0pBJqkPflOm1HyqCns1tHaSiCXG-tzn3gP06adljsuEDxDSGDqe5yb-BXBf6MpyZ5HtBcZu0QUVVQEVBoQrvJtaiRcBQlVDJ" />
                </div>
                <div>
                  <p className="font-bold text-[#1d1b17]">Marcus Thorne</p>
                  <p className="text-xs text-[#5c403c] uppercase tracking-widest">Thorne Boutique Hotels</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-10 rounded-[32px] shadow-sm relative">
              <Quote className="text-[#ffb4ab] w-16 h-16 absolute top-6 right-8 opacity-40" />
              <p className="text-[#1d1b17] italic text-lg mb-8 relative z-10">"We moved away from legacy PMS systems and haven't looked back. TravelVoo is sleek, fast, and remarkably intuitive."</p>
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-12 h-12 rounded-full bg-[#f2ede6] overflow-hidden">
                  <img className="w-full h-full object-cover" alt="Portrait of a female executive" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAXPKYyi9j82rojRcBbW4YYFQyhBw9QwnHuOYr9BobY5X34zm2iqZhFCCfnoNYy-YxQQslXHda02VANelK-3eEevCkvvMgjRYzmutE47SoiJttEJikTZxjp0rIE91flX0T2ZCBQotft33wmJ8fgYRNB-aaz3CliGII3ygEf7RTuvqvzpagWvWTZYYzNTMrbixPQhPtrVq3fCxKPubl2rZ7lcShm1t98-tamb82UB-fGqGnPjKiCXn2K5Py6B2Mh2LFCyM98Qy1yx8tO" />
                </div>
                <div>
                  <p className="font-bold text-[#1d1b17]">Sarah Jenkins</p>
                  <p className="text-xs text-[#5c403c] uppercase tracking-widest">Urban Lofts Group</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Integrations Orbit */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="max-w-7xl mx-auto text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-bold tracking-tighter mb-6 text-[#1d1b17]">Works with Everything</h2>
          <p className="text-[#5c403c] max-w-xl mx-auto">TravelVoo connects to the tools you already use. No migration headaches, just pure connectivity.</p>
        </div>
        <div className="relative flex justify-center items-center h-[500px]">
          {/* Orbit Circles */}
          <div className="absolute w-[300px] h-[300px] border border-[#e6bdb8]/30 rounded-full"></div>
          <div className="absolute w-[500px] h-[500px] border border-[#e6bdb8]/20 rounded-full"></div>
          
          {/* Central Node */}
          <div className="z-20 w-32 h-32 bg-[#dc2626] rounded-[32px] flex items-center justify-center shadow-2xl shadow-red-600/20">
            <span className="text-white font-bold text-2xl tracking-tighter">TV</span>
          </div>
          
          {/* Floating Icons */}
          <div className="absolute top-[10%] left-[30%] bg-white p-4 rounded-2xl shadow-lg flex items-center justify-center w-16 h-16">
            <MessageSquare className="text-[#25D366] w-8 h-8" />
          </div>
          <div className="absolute top-[20%] right-[25%] bg-white p-4 rounded-2xl shadow-lg flex items-center justify-center w-16 h-16">
            <Camera className="text-[#E4405F] w-8 h-8" />
          </div>
          <div className="absolute bottom-[20%] left-[25%] bg-white p-4 rounded-2xl shadow-lg flex items-center justify-center w-16 h-16">
            <FileText className="text-[#21759B] w-8 h-8" />
          </div>
          <div className="absolute bottom-[10%] right-[30%] bg-white p-4 rounded-2xl shadow-lg flex items-center justify-center w-16 h-16">
            <CreditCard className="text-[#6772E5] w-8 h-8" />
          </div>
          <div className="absolute top-[50%] left-[10%] bg-white p-4 rounded-2xl shadow-lg flex items-center justify-center w-16 h-16">
            <Zap className="text-[#FF4F00] w-8 h-8 fill-[#FF4F00]" />
          </div>
          <div className="absolute top-[50%] right-[10%] bg-white p-4 rounded-2xl shadow-lg flex items-center justify-center w-16 h-16">
            <Calendar className="text-[#4285F4] w-8 h-8" />
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Starter */}
            <div className="bg-[#f2ede6] p-10 rounded-[40px] flex flex-col hover:translate-y-[-8px] transition-transform duration-300">
              <h3 className="text-xl font-bold mb-2 text-[#1d1b17]">Starter</h3>
              <p className="text-[#5c403c] mb-8">For individual hosts</p>
              <div className="mb-8">
                <span className="text-5xl font-bold text-[#1d1b17]">$49</span>
                <span className="text-[#5c403c]">/mo</span>
              </div>
              <ul className="space-y-4 mb-10 flex-grow">
                <li className="flex items-center gap-3 text-sm font-medium text-[#1d1b17]">
                  <CheckCircle2 className="text-[#b70011] w-5 h-5" />
                  Up to 3 properties
                </li>
                <li className="flex items-center gap-3 text-sm font-medium text-[#1d1b17]">
                  <CheckCircle2 className="text-[#b70011] w-5 h-5" />
                  Direct booking engine
                </li>
                <li className="flex items-center gap-3 text-sm font-medium text-[#1d1b17]">
                  <CheckCircle2 className="text-[#b70011] w-5 h-5" />
                  Instagram integration
                </li>
              </ul>
              <button className="w-full py-4 rounded-xl border-2 border-[#1d1b17] text-[#1d1b17] font-bold hover:bg-[#1d1b17] hover:text-[#fef9f1] transition-colors">
                Get Started
              </button>
            </div>
            
            {/* Professional */}
            <div className="bg-[#1d1b17] text-[#fef9f1] p-10 rounded-[40px] flex flex-col relative overflow-hidden hover:translate-y-[-8px] transition-transform duration-300">
              <div className="absolute top-0 right-0 px-6 py-2 bg-[#dc2626] text-white text-xs font-bold uppercase rounded-bl-2xl">Popular</div>
              <h3 className="text-xl font-bold mb-2">Professional</h3>
              <p className="text-[#fef9f1]/60 mb-8">For boutique agencies</p>
              <div className="mb-8">
                <span className="text-5xl font-bold">$129</span>
                <span className="text-[#fef9f1]/60">/mo</span>
              </div>
              <ul className="space-y-4 mb-10 flex-grow">
                <li className="flex items-center gap-3 text-sm font-medium">
                  <CheckCircle2 className="text-[#ffb4ab] w-5 h-5" />
                  Up to 20 properties
                </li>
                <li className="flex items-center gap-3 text-sm font-medium">
                  <CheckCircle2 className="text-[#ffb4ab] w-5 h-5" />
                  WhatsApp Automation
                </li>
                <li className="flex items-center gap-3 text-sm font-medium">
                  <CheckCircle2 className="text-[#ffb4ab] w-5 h-5" />
                  Custom domain branding
                </li>
                <li className="flex items-center gap-3 text-sm font-medium">
                  <CheckCircle2 className="text-[#ffb4ab] w-5 h-5" />
                  Advanced Analytics
                </li>
              </ul>
              <button className="w-full py-4 rounded-xl bg-gradient-to-br from-[#b70011] to-[#dc2626] text-white font-bold hover:scale-105 transition-all">
                Upgrade Now
              </button>
            </div>
            
            {/* Enterprise */}
            <div className="bg-[#f2ede6] p-10 rounded-[40px] flex flex-col hover:translate-y-[-8px] transition-transform duration-300">
              <h3 className="text-xl font-bold mb-2 text-[#1d1b17]">Enterprise</h3>
              <p className="text-[#5c403c] mb-8">For global operators</p>
              <div className="mb-8 text-[#1d1b17]">
                <span className="text-5xl font-bold">Custom</span>
              </div>
              <ul className="space-y-4 mb-10 flex-grow">
                <li className="flex items-center gap-3 text-sm font-medium text-[#1d1b17]">
                  <CheckCircle2 className="text-[#b70011] w-5 h-5" />
                  Unlimited properties
                </li>
                <li className="flex items-center gap-3 text-sm font-medium text-[#1d1b17]">
                  <CheckCircle2 className="text-[#b70011] w-5 h-5" />
                  API Access
                </li>
                <li className="flex items-center gap-3 text-sm font-medium text-[#1d1b17]">
                  <CheckCircle2 className="text-[#b70011] w-5 h-5" />
                  Dedicated Manager
                </li>
              </ul>
              <button className="w-full py-4 rounded-xl border-2 border-[#1d1b17] font-bold text-[#1d1b17] hover:bg-[#1d1b17] hover:text-[#fef9f1] transition-colors">
                Contact Sales
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="relative bg-[#1d1b17] rounded-[48px] p-12 md:p-24 overflow-hidden text-center">
            {/* Red Glow Background */}
            <div className="absolute bottom-[-100px] left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-[#dc2626]/30 blur-[120px] rounded-full"></div>
            <div className="relative z-10">
              <h2 className="text-4xl md:text-6xl font-bold tracking-tighter text-[#fef9f1] mb-8">Ready to navigate the <br />future of hospitality?</h2>
              <p className="text-[#fef9f1]/60 text-lg mb-12 max-w-xl mx-auto">Join the premium hosts who are taking back control of their properties and their profits.</p>
              <button className="bg-[#dc2626] text-white px-12 py-5 rounded-2xl text-xl font-bold hover:scale-110 transition-transform active:scale-95 shadow-[0_0_40px_rgba(220,38,38,0.4)]">
                Start Your Free Trial
              </button>
              <p className="text-[#fef9f1]/40 mt-6 text-sm">No credit card required. Cancel anytime.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-stone-100 dark:bg-stone-950 rounded-[24px] m-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 p-12 max-w-7xl mx-auto">
          <div className="space-y-6">
            <div className="text-xl font-bold text-stone-900 dark:text-stone-50">TravelVoo</div>
            <p className="font-sans text-stone-500 dark:text-stone-400 max-w-xs">
              The Modern Navigator. Redefining property management for the luxury market.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-4">
              <h4 className="font-bold text-stone-900 dark:text-stone-50">Product</h4>
              <div className="flex flex-col gap-2">
                <a className="font-sans text-stone-500 hover:text-[#DC2626] hover:underline decoration-2 underline-offset-4 transition-all" href="#">Features</a>
                <a className="font-sans text-stone-500 hover:text-[#DC2626] hover:underline decoration-2 underline-offset-4 transition-all" href="#">Solutions</a>
                <a className="font-sans text-stone-500 hover:text-[#DC2626] hover:underline decoration-2 underline-offset-4 transition-all" href="#">API</a>
              </div>
            </div>
            <div className="space-y-4">
              <h4 className="font-bold text-stone-900 dark:text-stone-50">Company</h4>
              <div className="flex flex-col gap-2">
                <a className="font-sans text-stone-500 hover:text-[#DC2626] hover:underline decoration-2 underline-offset-4 transition-all" href="#">About</a>
                <a className="font-sans text-stone-500 hover:text-[#DC2626] hover:underline decoration-2 underline-offset-4 transition-all" href="#">Integrations</a>
                <a className="font-sans text-stone-500 hover:text-[#DC2626] hover:underline decoration-2 underline-offset-4 transition-all" href="#">Contact</a>
              </div>
            </div>
          </div>
          <div className="space-y-6 md:text-right">
            <p className="font-sans text-stone-500 dark:text-stone-400">© {new Date().getFullYear()} TravelVoo. The Modern Navigator.</p>
            <div className="flex gap-4 md:justify-end">
              <a className="w-10 h-10 rounded-full bg-stone-200 dark:bg-stone-800 flex items-center justify-center hover:bg-[#dc2626] hover:text-white transition-all" href="#">
                <Globe className="w-5 h-5" />
              </a>
              <a className="w-10 h-10 rounded-full bg-stone-200 dark:bg-stone-800 flex items-center justify-center hover:bg-[#dc2626] hover:text-white transition-all" href="#">
                <AtSign className="w-5 h-5" />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PlatformLanding;
