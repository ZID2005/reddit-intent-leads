import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Webhook, Code, Terminal, Check, Copy } from 'lucide-react';
import { usePrefersReducedMotion } from '../hooks/usePrefersReducedMotion';

const SlackIcon = ({ className, color }: { className?: string; color?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="currentColor"
    style={{ color }}
  >
    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52-2.523 2.528 2.528 0 0 1-2.522-2.523 2.528 2.528 0 0 1 2.522-2.52h2.52v2.52zm1.261 0a2.528 2.528 0 0 1 2.52-2.52h5.043a2.528 2.528 0 0 1 2.522 2.52v5.042a2.528 2.528 0 0 1-2.522 2.52H8.824a2.528 2.528 0 0 1-2.52-2.52v-5.042zM8.824 5.043a2.528 2.528 0 0 1-2.52-2.52A2.528 2.528 0 0 1 8.824 0a2.528 2.528 0 0 1 2.52 2.522v2.52h-2.52zm0 1.261a2.528 2.528 0 0 1 2.52 2.52v5.043a2.528 2.528 0 0 1-2.52 2.522H3.782a2.528 2.528 0 0 1-2.522-2.522V8.824a2.528 2.528 0 0 1 2.522-2.52h5.042zm10.134 3.778a2.528 2.528 0 0 1 2.52-2.522 2.528 2.528 0 0 1 2.522 2.522 2.528 2.528 0 0 1-2.522 2.52h-2.52v-2.52zm-1.262 0a2.528 2.528 0 0 1-2.52 2.52h-5.043a2.528 2.528 0 0 1-2.522-2.52V3.782a2.528 2.528 0 0 1 2.522-2.522h5.043a2.528 2.528 0 0 1 2.52 2.522v5.043zm-3.778 10.134a2.528 2.528 0 0 1 2.52 2.52 2.528 2.528 0 0 1-2.52-2.522 2.528 2.528 0 0 1-2.522-2.522v-2.52h2.522zm0-1.262a2.528 2.528 0 0 1-2.52-2.52v-5.043a2.528 2.528 0 0 1 2.52-2.522h5.043a2.528 2.528 0 0 1 2.522 2.522v5.043a2.528 2.528 0 0 1-2.522 2.52h-5.043z" />
  </svg>
);

interface IntegrationChannel {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string; color?: string }>;
  description: string;
  color: string;
  glowColor: string;
  setupText: string;
}

export function Integrations() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const [activeTab, setActiveTab] = useState<'payload' | 'curl'>('payload');
  const [copied, setCopied] = useState(false);

  const channels: IntegrationChannel[] = [
    {
      id: "slack",
      name: "Slack Webhooks",
      icon: SlackIcon,
      description: "Deliver high-intent buyer alerts directly to your sales channels in real-time with one-click draft outreach replies.",
      color: "#C6FF34",
      glowColor: "rgba(198, 255, 52, 0.15)",
      setupText: "Route to #leads"
    },
    {
      id: "webhook",
      name: "Custom Webhooks",
      icon: Webhook,
      description: "Receive full semantic payloads at your custom endpoints as soon as a buyer expresses purchase intent.",
      color: "#E8A838",
      glowColor: "rgba(232, 168, 56, 0.15)",
      setupText: "Configure URL"
    },
    {
      id: "email",
      name: "Email Digests",
      icon: Mail,
      description: "Get daily or real-time structured reports of matching buying signals straight to your inbox.",
      color: "#8E9196",
      glowColor: "rgba(142, 145, 150, 0.1)",
      setupText: "Enable alerts"
    },
    {
      id: "api",
      name: "Developer API",
      icon: Code,
      description: "Query and extract posts, scores, and draft replies programmatically to power internal custom workflows.",
      color: "#C6FF34",
      glowColor: "rgba(198, 255, 52, 0.15)",
      setupText: "Get API Keys"
    }
  ];

  const payloadCode = `{
  "event": "intent.signal",
  "id": "sig_09f82d1",
  "timestamp": "2026-06-24T20:22:00Z",
  "data": {
    "subreddit": "r/smallbusiness",
    "intent_score": 95,
    "classification": "HIGH_INTENT",
    "post_title": "Looking to buy a CRM tool, recommendations?",
    "excerpt": "Hey everyone, our agency is growing and spreadsheets aren't cutting it anymore. We need a CRM under $100/mo that integrates with Slack...",
    "reddit_url": "https://reddit.com/r/smallbusiness/comments/...",
    "suggested_reply": "Hello! I saw you are looking for a CRM under $100/mo. Our product fits this budget and offers the exact Slack integrations you mentioned. Here is..."
  }
}`;

  const curlCode = `curl -X GET "https://api.signalradar.com/v1/leads?min_score=80" \\
  -H "Authorization: Bearer sr_live_58c281df6f80a4" \\
  -H "Content-Type: application/json"`;

  const copyToClipboard = () => {
    const textToCopy = activeTab === 'payload' ? payloadCode : curlCode;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section 
      id="integrations" 
      className="py-32 bg-[#070708] border-y border-white/5 relative z-10 select-none overflow-hidden"
    >
      {/* Background radial glow */}
      <div 
        className="absolute bottom-0 right-1/4 w-[600px] h-[600px] rounded-full pointer-events-none z-0 opacity-15 blur-[120px]" 
        style={{
          background: 'radial-gradient(circle, rgba(198,255,52,0.08) 0%, transparent 70%)',
        }}
      />

      <div className="max-w-6xl mx-auto px-6 md:px-12 space-y-16">
        
        {/* Header */}
        <div className="text-center space-y-4">
          <span className="font-spacemono text-[10px] text-[#C6FF34] font-bold tracking-[0.15em] block uppercase">
            DELIVERY CHANNELS
          </span>
          <h2 className="text-3xl md:text-5xl font-bold font-syne tracking-tight text-white max-w-2xl mx-auto leading-tight">
            Sync Leads to Your Workflow
          </h2>
          <div className="divider-scanline max-w-sm mx-auto my-4" />
          <p className="text-sm md:text-base text-gray-500 max-w-md mx-auto font-sans leading-relaxed">
            Instantly route signals to Slack, query our developer API, or listen to real-time webhook broadcasts.
          </p>
        </div>

        {/* Layout Grid: Cards on left, Webhook Terminal on right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Channels Grid (lg:col-span-7) */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-6">
            {channels.map((ch, idx) => (
              <motion.div
                key={ch.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.08, ease: 'easeOut' }}
                whileHover={prefersReducedMotion ? {} : { 
                  y: -4, 
                  boxShadow: `0 0 24px ${ch.glowColor}`
                }}
                className="glass-border-gradient p-6 rounded-2xl border border-white/[0.04] bg-[#0A0A0A]/40 flex flex-col justify-between space-y-6 group transition-all duration-300"
              >
                <div className="space-y-4">
                  {/* Channel icon container */}
                  <div 
                    className="w-10 h-10 rounded-xl flex items-center justify-center border transition-colors duration-300"
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.01)',
                      borderColor: 'rgba(255,255,255,0.06)',
                    }}
                  >
                    <ch.icon 
                      className="w-5 h-5 transition-transform duration-300 group-hover:scale-110" 
                      color={ch.color}
                    />
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-syne text-base font-bold text-white tracking-wide">
                      {ch.name}
                    </h3>
                    <p className="font-sans text-xs text-gray-400 leading-relaxed">
                      {ch.description}
                    </p>
                  </div>
                </div>

                {/* Setup Button: Liquid Glass Styled */}
                <button className="btn-liquid-glass-lime w-full py-2.5 rounded-xl font-spacemono text-[9px] font-bold uppercase tracking-wider transition-all duration-200 cursor-pointer">
                  {ch.setupText}
                </button>
              </motion.div>
            ))}
          </div>

          {/* Webhook Terminal on Right (lg:col-span-5) */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="lg:col-span-5 flex flex-col glass-panel rounded-2xl border border-white/[0.08] bg-black/45 overflow-hidden shadow-2xl relative"
          >
            {/* Top Bar / Navigation tabs */}
            <div className="bg-[#070708]/80 border-b border-white/5 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-gray-500" />
                <span className="font-spacemono text-[10px] text-gray-400 uppercase tracking-wider font-bold">API EXPLORER</span>
              </div>

              {/* Tabs */}
              <div className="flex gap-2.5">
                <button
                  onClick={() => setActiveTab('payload')}
                  className={`px-2.5 py-1 rounded font-spacemono text-[9px] font-bold tracking-wider uppercase transition-colors ${
                    activeTab === 'payload' 
                      ? 'bg-[#C6FF34]/10 border border-[#C6FF34]/20 text-[#C6FF34]' 
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  Webhook
                </button>
                <button
                  onClick={() => setActiveTab('curl')}
                  className={`px-2.5 py-1 rounded font-spacemono text-[9px] font-bold tracking-wider uppercase transition-colors ${
                    activeTab === 'curl' 
                      ? 'bg-[#C6FF34]/10 border border-[#C6FF34]/20 text-[#C6FF34]' 
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  cURL
                </button>
              </div>
            </div>

            {/* Code Content Box */}
            <div className="flex-1 p-5 relative overflow-auto max-h-[360px] lg:max-h-none">
              <pre className="font-jetbrains text-[10px] text-gray-300 leading-relaxed text-left whitespace-pre select-text">
                <code>
                  {activeTab === 'payload' ? payloadCode : curlCode}
                </code>
              </pre>

              {/* Copy Button */}
              <button
                onClick={copyToClipboard}
                className="absolute top-4 right-4 p-2 rounded-lg border border-white/5 bg-[#070708]/85 hover:border-white/20 transition-all cursor-pointer text-gray-400 hover:text-white"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#C6FF34]" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Terminal status bar */}
            <div className="bg-[#070708]/50 border-t border-white/5 px-5 py-2.5 flex items-center justify-between text-[9px] font-spacemono text-gray-500">
              <span>STATUS: 200 OK</span>
              <span>SIZE: 652B</span>
            </div>

          </motion.div>

        </div>

      </div>
    </section>
  );
}

export default Integrations;
