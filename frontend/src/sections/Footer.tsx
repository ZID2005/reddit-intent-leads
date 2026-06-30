import React from 'react';
import { FiMail, FiMapPin, FiArrowUpRight, FiGithub, FiTwitter, FiLinkedin } from 'react-icons/fi';
import { Aurora } from '../components/Aurora';


export interface LinkItem {
  label: string;
  href: string;
}

export interface LinkColumn {
  links: LinkItem[];
}

export interface PersonInfo {
  name: string;
  role: string;
  location: string;
}

export interface Footer8Props {
  tagline?: string;
  email?: string;
  emailHref?: string;
  backgroundImage?: string;
  personInfo?: PersonInfo;
  linkColumns?: LinkColumn[];
  copyright?: string;
}

const defaultLinkColumns: LinkColumn[] = [
  {
    links: [
      { label: 'Features', href: '#preview' },
      { label: 'Pricing', href: '#pricing' },
      { label: 'FAQ', href: '#faq' },
      { label: 'Lead Dashboard', href: '#' },
    ],
  },
  {
    links: [
      { label: 'Privacy Policy', href: '#' },
      { label: 'Terms of Service', href: '#' },
      { label: 'Developer API', href: '#' },
      { label: 'System Status', href: '#' },
    ],
  },
];

const defaultPersonInfo: PersonInfo = {
  name: 'Sanal Kumar',
  role: 'Founder & Lead Builder',
  location: 'San Francisco, CA',
};

const AURORA_COLORS = ['#C6FF34', '#070708', '#5227FF'];

export function Footer8({
  tagline = "Turn Reddit discussions into active pipeline.",
  email = "hello@signalradar.co",
  emailHref = "mailto:hello@signalradar.co",
  backgroundImage,
  personInfo = defaultPersonInfo,
  linkColumns = defaultLinkColumns,
  copyright,
}: Footer8Props) {
  const currentYear = new Date().getFullYear();
  const displayCopyright = copyright || `© ${currentYear} SignalRadar. All rights reserved.`;

  return (
    <footer className="relative bg-[#070708] pt-24 pb-12 overflow-hidden z-10 w-full">
      {/* 1. Background Grid and Glows */}
      <div className="absolute inset-0 grid-dots pointer-events-none opacity-30" />
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-lime-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Aurora WebGL Background Wave - Restricted to bottom half to avoid bleeding into CTA */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-[280px] pointer-events-none z-0 opacity-45"
        style={{
          maskImage: 'linear-gradient(to top, black 40%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to top, black 40%, transparent 100%)'
        }}
      >
        <Aurora 
          colorStops={AURORA_COLORS}
          amplitude={1.2}
          blend={0.6}
          speed={0.5}
        />
      </div>

      {backgroundImage && (
        <img
          src={backgroundImage}
          alt="Footer background decoration"
          className="absolute inset-0 w-full h-full object-cover opacity-5 mix-blend-overlay pointer-events-none"
        />
      )}

      {/* 2. Content Container */}
      <div className="max-w-6xl mx-auto px-6 md:px-12 relative z-10 space-y-16">
        
        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start">
          
          {/* Left Block - Tagline, Email, Person Card */}
          <div className="lg:col-span-7 space-y-8">
            {/* Tagline */}
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-display font-bold tracking-tight text-white leading-[1.15] sm:leading-[1.1] max-w-2xl">
              {tagline}
            </h2>

            {/* Email Address */}
            <div className="pt-2">
              <a 
                href={emailHref} 
                className="inline-flex items-center gap-2.5 text-base sm:text-lg md:text-xl lg:text-2xl font-mono text-[#C6FF34] hover:text-white transition-colors duration-200 group max-w-full break-all"
                style={{ minHeight: '44px' }}
              >
                <FiMail className="w-5 h-5 md:w-6 h-6 text-gray-500 group-hover:text-[#C6FF34] transition-colors shrink-0" />
                <span className="truncate">{email}</span>
                <FiArrowUpRight className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 shrink-0" />
              </a>
            </div>

            {/* Person Card */}
            {personInfo && (
              <div className="pt-2 sm:pt-4">
                <div className="glass-panel flex sm:inline-flex items-center gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.1] hover:bg-white/[0.04] transition-all duration-300 w-full sm:w-auto max-w-sm">
                  {/* Avatar Container with glowing status dot */}
                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-lime-400 to-[#C6FF34] flex items-center justify-center font-mono font-bold text-black text-sm">
                      {personInfo.name.split(' ').map(n => n[0]).join('')}
                    </div>
                    {/* Active Status Dot */}
                    <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#070708] pulse-dot shadow-[0_0_8px_#10b981]" />
                  </div>
                  {/* Bio Info */}
                  <div className="space-y-1 font-sans text-xs text-left">
                    <h4 className="font-bold text-white leading-none">{personInfo.name}</h4>
                    <p className="text-gray-400 leading-none">{personInfo.role}</p>
                    <div className="flex items-center gap-1 text-[10px] text-gray-500 leading-none pt-0.5">
                      <FiMapPin className="w-3 h-3 flex-shrink-0" />
                      <span>{personInfo.location}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Block - Navigation Columns */}
          <div className="lg:col-span-5 grid grid-cols-2 gap-x-6 gap-y-8 sm:gap-8 pt-4">
            {linkColumns.map((col, cIdx) => (
              <div key={cIdx} className="space-y-4 text-left">
                <h3 className="font-mono text-[10px] text-gray-500 uppercase tracking-widest font-bold">
                  {cIdx === 0 ? "Navigation" : "Legal & Social"}
                </h3>
                <ul className="space-y-3">
                  {col.links.map((link, lIdx) => (
                    <li key={lIdx}>
                      <a 
                        href={link.href}
                        className="text-sm font-sans text-gray-400 hover:text-white transition-colors duration-200 py-1.5 block hover:translate-x-0.5 transition-transform"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

        </div>

        {/* Bottom copyright segment */}
        <div className="border-t border-white/[0.06] pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="font-mono text-[10px] text-gray-600 uppercase tracking-widest text-center md:text-left">
            {displayCopyright}
          </p>
          <div className="flex items-center gap-4">
            <a href="#" className="text-gray-500 hover:text-white transition-colors p-2 flex items-center justify-center" aria-label="X / Twitter" style={{ minWidth: '44px', minHeight: '44px' }}>
              <FiTwitter className="w-4 h-4" />
            </a>
            <a href="#" className="text-gray-500 hover:text-white transition-colors p-2 flex items-center justify-center" aria-label="GitHub" style={{ minWidth: '44px', minHeight: '44px' }}>
              <FiGithub className="w-4 h-4" />
            </a>
            <a href="#" className="text-gray-500 hover:text-white transition-colors p-2 flex items-center justify-center" aria-label="LinkedIn" style={{ minWidth: '44px', minHeight: '44px' }}>
              <FiLinkedin className="w-4 h-4" />
            </a>
          </div>
        </div>

      </div>
    </footer>
  );
}

export { Footer8 as Footer };
export default Footer8;
