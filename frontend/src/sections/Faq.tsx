import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

interface FAQItem {
  q: string;
  a: string;
}

export function Faq() {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  const faqs: FAQItem[] = [
    {
      q: "What Reddit data is used?",
      a: "SignalRadar monitors public subreddits, scanning posts and titles in real time. We do not track private user profiles, and all API interactions strictly adhere to Reddit's data access policies."
    },
    {
      q: "How does intent scoring work?",
      a: "Every post is analyzed by our AI model. It assesses context, semantics, budget statements, timelines, and comparisons to assign an intent score (0-100) and priority level."
    },
    {
      q: "Does it work for any niche?",
      a: "Yes! Because the AI understands natural language context, it can detect signals for B2B SaaS, freelancers, marketing agencies, consumer products, mobile app developers, and custom software development houses."
    },
    {
      q: "What about data privacy?",
      a: "We only parse public discussions. Leads are securely stored in your dedicated Supabase instance. We never share your monitored keywords or ideal customer profile details with third parties."
    },
    {
      q: "What is the cancellation policy?",
      a: "You can cancel your subscription at any time with a single click. There are no lock-in contracts. You will retain access to your dashboard features until the end of your billing cycle."
    },
    {
      q: "Do you provide API access?",
      a: "Yes! Pro users get access to our Webhooks and REST API, allowing you to feed qualified intent leads directly into HubSpot, Salesforce, Zapier, or your own internal CRM."
    }
  ];

  const toggleAccordion = (idx: number) => {
    setActiveIdx(activeIdx === idx ? null : idx);
  };

  return (
    <section id="faq" className="py-32 px-6 md:px-12 max-w-3xl mx-auto space-y-16 select-none relative z-10">
      {/* Scroll triggered entrance */}
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="space-y-16 w-full"
      >
        {/* Section Heading */}
        <div className="text-center space-y-4">
          <span className="font-mono text-[9px] md:text-[10px] text-[#C6FF34] font-bold tracking-widest block uppercase">
            COMMON QUESTIONS
          </span>
          <h2 className="text-3xl md:text-5xl font-display font-bold tracking-tight text-white select-none">
            Frequently Asked Questions
          </h2>
        </div>

        {/* Accordion List */}
        <div className="space-y-4">
          {faqs.map((faq, idx) => {
            const isOpen = activeIdx === idx;
            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-80px" }}
                transition={{ duration: 0.5, delay: prefersReducedMotion ? 0 : idx * 0.05 }}
                className="glass-panel rounded-2xl bg-white/[0.04] border border-white/[0.08] overflow-hidden transition-all duration-350"
              >
                {/* Question Trigger Button */}
                <button
                  onClick={() => toggleAccordion(idx)}
                  className="w-full flex items-center justify-between p-6 text-left text-sm md:text-base font-bold tracking-wide text-white hover:text-[#C6FF34] transition-colors duration-150 cursor-pointer group"
                  style={{ minHeight: '52px' }}
                >
                  <span className="pr-6 font-sans select-none">{faq.q}</span>
                  {/* Rotating Plus Icon */}
                  <motion.div
                    animate={prefersReducedMotion ? {} : { rotate: isOpen ? 45 : 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className={`flex-shrink-0 transition-colors duration-250 ${isOpen ? 'text-[#C6FF34]' : 'text-gray-500'}`}
                  >
                    <Plus className="w-5 h-5" />
                  </motion.div>
                </button>

                {/* Answer Content */}
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="border-t border-white/5"
                    >
                      <div className="p-6 text-xs md:text-sm text-gray-400 leading-relaxed font-sans select-none">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </section>
  );
}

export default Faq;
