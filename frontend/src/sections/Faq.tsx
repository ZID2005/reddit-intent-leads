import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiDatabase, FiShield, FiLayers, FiChevronDown } from 'react-icons/fi';

export interface FAQItem {
  question: string;
  answer: string;
}

export interface FAQCategory {
  id: string;
  label: string;
  icon: React.ReactNode;
  items: FAQItem[];
}

export interface FAQ2Props {
  badge?: string;
  title?: string;
  subtitle?: string;
  categories?: FAQCategory[];
}

const defaultCategories: FAQCategory[] = [
  {
    id: 'radar-leads',
    label: 'Radar & Leads',
    icon: <FiDatabase className="w-4 h-4 md:w-5 h-5" />,
    items: [
      {
        question: 'What Reddit data is used?',
        answer:
          'SignalRadar monitors public subreddits, scanning posts and titles in real time. We do not track private user profiles, and all API interactions strictly adhere to Reddit\'s data access policies.',
      },
      {
        question: 'How does intent scoring work?',
        answer:
          'Every post is analyzed by our AI model. It assesses context, semantics, budget statements, timelines, and comparisons to assign an intent score (0-100) and priority level.',
      },
      {
        question: 'Does it work for any niche?',
        answer:
          'Yes! Because the AI understands natural language context, it can detect signals for B2B SaaS, freelancers, marketing agencies, consumer products, mobile app developers, and custom software development houses.',
      },
    ],
  },
  {
    id: 'security-privacy',
    label: 'Security & Privacy',
    icon: <FiShield className="w-4 h-4 md:w-5 h-5" />,
    items: [
      {
        question: 'What about data privacy?',
        answer:
          'We only parse public discussions. Leads are securely stored in your dedicated Supabase instance. We never share your monitored keywords or ideal customer profile details with third parties.',
      },
    ],
  },
  {
    id: 'plans-api',
    label: 'Plans & API',
    icon: <FiLayers className="w-4 h-4 md:w-5 h-5" />,
    items: [
      {
        question: 'What is the cancellation policy?',
        answer:
          'You can cancel your subscription at any time with a single click. There are no lock-in contracts. You will retain access to your dashboard features until the end of your billing cycle.',
      },
      {
        question: 'Do you provide API access?',
        answer:
          'Yes! Pro users get access to our Webhooks and REST API, allowing you to feed qualified intent leads directly into HubSpot, Salesforce, Zapier, or your own internal CRM.',
      },
    ],
  },
];

export function FAQ2({
  badge = "Need help?",
  title = "Frequently asked questions",
  subtitle = "Find answers to common questions about monitoring subreddits, intent scoring, and API integrations.",
  categories = defaultCategories,
}: FAQ2Props) {
  const [activeTab, setActiveTab] = useState(categories[0]?.id || '');
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  // When active category changes, collapse any open accordion
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    setOpenIdx(null);
  };

  const toggleAccordion = (idx: number) => {
    setOpenIdx(openIdx === idx ? null : idx);
  };

  const activeCategory = categories.find((c) => c.id === activeTab) || categories[0];

  return (
    <section id="faq" className="py-24 md:py-32 px-6 md:px-12 max-w-6xl mx-auto space-y-16 select-none relative z-10">
      {/* Title block */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="text-center space-y-4 max-w-2xl mx-auto"
      >
        {badge && (
          <span className="font-mono text-[10px] text-[#C6FF34] font-bold tracking-widest block uppercase">
            {badge}
          </span>
        )}
        <h2 className="text-3xl md:text-5xl font-display font-bold tracking-tight text-white">
          {title}
        </h2>
        {subtitle && (
          <p className="text-sm md:text-base text-gray-400 leading-relaxed font-sans">
            {subtitle}
          </p>
        )}
      </motion.div>

      {/* Grid container */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-12 items-start">
        {/* Left Column: Categories Selector */}
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="md:col-span-4 space-y-3"
        >
          {/* Scrollable list on mobile, stack on desktop */}
          <div className="flex md:flex-col overflow-x-auto md:overflow-x-visible pb-3 md:pb-0 gap-2 md:gap-3 scrollbar-none snap-x snap-mandatory">
            {categories.map((cat) => {
              const isActive = cat.id === activeTab;
              return (
                <button
                  key={cat.id}
                  onClick={() => handleTabChange(cat.id)}
                  className={`relative flex items-center gap-3 px-5 py-4 rounded-xl text-left text-xs md:text-sm font-semibold tracking-wide font-sans cursor-pointer transition-all duration-200 snap-start shrink-0 md:shrink ${
                    isActive 
                      ? 'text-white font-bold' 
                      : 'text-gray-400 hover:text-gray-200 hover:bg-white/[0.02]'
                  }`}
                  style={{ minWidth: '150px' }}
                >
                  {/* Sliding pill indicator */}
                  {isActive && (
                    <motion.div
                      layoutId="faq-active-tab"
                      className="absolute inset-0 bg-white/[0.06] border border-white/[0.08] rounded-xl z-0"
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}

                  <span className="relative z-10 flex-shrink-0 text-current">{cat.icon}</span>
                  <span className="relative z-10 truncate">{cat.label}</span>
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Right Column: Accordion of Items */}
        <motion.div
          layout
          initial={{ opacity: 0, x: 30 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.6, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="md:col-span-8 w-full"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -15, filter: "blur(4px)" }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="space-y-4"
            >
              {activeCategory?.items.map((item, idx) => {
                const isOpen = openIdx === idx;
                return (
                  <div
                    key={idx}
                    className="glass-panel rounded-2xl bg-white/[0.02] border border-white/[0.06] overflow-hidden transition-colors duration-300 hover:bg-white/[0.04] hover:border-white/[0.1]"
                  >
                    {/* Question Button */}
                    <button
                      onClick={() => toggleAccordion(idx)}
                      className="w-full flex items-center justify-between p-6 text-left text-xs md:text-sm font-bold tracking-wide text-white hover:text-[#C6FF34] transition-colors duration-200 cursor-pointer group"
                      aria-expanded={isOpen}
                    >
                      <span className="pr-6 font-sans select-none">{item.question}</span>
                      {/* Rotating Chevron */}
                      <div className="flex-shrink-0">
                        <motion.div
                          animate={{ rotate: isOpen ? 180 : 0 }}
                          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                          className={`p-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] transition-colors duration-200 ${
                            isOpen ? 'text-[#C6FF34] border-[#C6FF34]/20' : 'text-gray-400 group-hover:text-white'
                          }`}
                        >
                          <FiChevronDown className="w-4 h-4 md:w-5 h-5" />
                        </motion.div>
                      </div>
                    </button>

                    {/* Answer content with smooth height toggle */}
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: "easeInOut" }}
                          className="border-t border-white/[0.04]"
                        >
                          <div className="p-6 text-xs md:text-sm text-gray-400 leading-relaxed font-sans select-none">
                            {item.answer}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}

export { FAQ2 as Faq };
export default FAQ2;
