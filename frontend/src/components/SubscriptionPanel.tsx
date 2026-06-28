import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import {
  Shield,
  Zap,
  Brain,
  Download,
  Eye,
  Bell,
  Lock,
  Check,
  CheckCircle,
  Crown,
  Clock,
  TrendingUp,
  BarChart3,
  Kanban,
  Mail,
  Database,
  Headphones,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { SubscriptionStatus } from '../hooks/useSubscription';
import { UpgradeModal } from './UpgradeModal';

interface SubscriptionPanelProps {
  subscription: SubscriptionStatus | null;
  loading: boolean;
  isPro: boolean;
  upgradePlan: (plan: 'free' | 'pro') => Promise<void>;
  userId?: string;
}

// Stagger container
const container: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07 } },
};
const item: Variants = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
};

function ProgressBar({ value, max, isLocked = false }: { value: number; max: number | null; isLocked?: boolean }) {
  const pct = max === null ? 0 : Math.min((value / max) * 100, 100);
  const warn = pct >= 80;
  return (
    <div className="w-full h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: isLocked ? '100%' : `${pct}%` }}
        transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
        className={cn(
          'h-full rounded-full',
          isLocked
            ? 'bg-white/10'
            : max === null
            ? 'bg-lime'
            : warn
            ? 'bg-amber-400'
            : 'bg-lime'
        )}
      />
    </div>
  );
}

function UsageCard({
  icon,
  label,
  used,
  limit,
  unit,
  isLocked = false,
  badge,
  isPro,
}: {
  icon: React.ReactNode;
  label: string;
  used: number;
  limit: number | null;
  unit?: string;
  isLocked?: boolean;
  badge?: string;
  isPro: boolean;
}) {
  const displayLimit = isPro ? '∞' : limit !== null ? String(limit) : '∞';
  const remaining = limit !== null && !isPro ? Math.max(limit - used, 0) : null;

  return (
    <motion.div
      variants={item}
      className="relative bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5 overflow-hidden group hover:border-white/10 transition-all duration-300"
    >
      {/* Top shimmer */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

      <div className="flex items-start justify-between mb-4">
        <div className={cn('p-2 rounded-xl border', isLocked ? 'bg-white/[0.02] border-white/5 text-gray-600' : 'bg-lime/10 border-lime/20 text-lime')}>
          {icon}
        </div>
        {badge && (
          <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/20 text-amber-400 uppercase tracking-wider">
            {badge}
          </span>
        )}
        {!badge && remaining !== null && remaining === 0 && (
          <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 uppercase tracking-wider">
            Limit Reached
          </span>
        )}
        {!badge && remaining !== null && remaining > 0 && (
          <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/[0.06] text-gray-400">
            {remaining} left
          </span>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <span className="text-[10px] font-mono uppercase tracking-widest text-gray-500 font-bold">{label}</span>
          <span className={cn('text-sm font-mono font-bold', isLocked ? 'text-gray-600' : isPro ? 'text-lime' : 'text-white')}>
            {isLocked ? '—' : `${used} / ${displayLimit}`}
            {unit && !isLocked && <span className="text-[10px] text-gray-500 ml-1">{unit}</span>}
          </span>
        </div>
        <ProgressBar value={used} max={isPro ? null : limit} isLocked={isLocked} />
      </div>
    </motion.div>
  );
}

const FEATURES = [
  { id: 'reddit', icon: <Database className="w-3.5 h-3.5" />, label: 'Reddit Monitoring', free: '1 subreddit', pro: '10 subreddits', locked: false },
  { id: 'ai_score', icon: <Brain className="w-3.5 h-3.5" />, label: 'AI Intent Scoring', free: '5/day', pro: 'Unlimited', locked: false },
  { id: 'dashboard', icon: <TrendingUp className="w-3.5 h-3.5" />, label: 'Lead Dashboard', free: 'Basic (100 leads)', pro: 'Full access', locked: false },
  { id: 'csv', icon: <Download className="w-3.5 h-3.5" />, label: 'CSV Export', free: '2/day', pro: 'Unlimited', locked: false },
  { id: 'email', icon: <Mail className="w-3.5 h-3.5" />, label: 'Email / Browser Alerts', free: 'Disabled', pro: 'Enabled', locked: true },
  { id: 'pipeline', icon: <Kanban className="w-3.5 h-3.5" />, label: 'Pipeline Board', free: 'Read-only', pro: 'Full editing', locked: false },
  { id: 'analytics', icon: <BarChart3 className="w-3.5 h-3.5" />, label: 'Analytics Dashboard', free: 'Basic only', pro: 'Advanced', locked: false },
  { id: 'drafts', icon: <Zap className="w-3.5 h-3.5" />, label: 'AI Draft Replies', free: '5/day', pro: 'Unlimited', locked: false },
  { id: 'api', icon: <Database className="w-3.5 h-3.5" />, label: 'REST API Access', free: 'Not included', pro: 'Full access', locked: true },
  { id: 'support', icon: <Headphones className="w-3.5 h-3.5" />, label: 'Priority Support', free: 'Community only', pro: 'Priority access', locked: true },
];

export function SubscriptionPanel({ subscription, loading, isPro, upgradePlan, userId }: SubscriptionPanelProps) {
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  // Time until midnight reset
  const [resetIn, setResetIn] = useState('');
  useEffect(() => {
    const compute = () => {
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);
      const diff = midnight.getTime() - now.getTime();
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      setResetIn(`${h}h ${m}m`);
    };
    compute();
    const id = setInterval(compute, 60_000);
    return () => clearInterval(id);
  }, []);

  // Days remaining for pro
  const daysRemaining = (() => {
    if (!subscription?.expires_at) return null;
    const diff = new Date(subscription.expires_at).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / 86_400_000));
  })();

  const startsAt = subscription?.starts_at ? new Date(subscription.starts_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
  const expiresAt = subscription?.expires_at ? new Date(subscription.expires_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'No expiry';

  const usage = subscription?.usage ?? {
    ai_generations: 0,
    csv_exports: 0,
    leads_viewed: 0,
    notifications_sent: 0,
    ai_generations_today: 0,
    csv_exports_today: 0,
    month: '',
  };

  const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
  const dayOfMonth = new Date().getDate();
  const daysLeft = daysInMonth - dayOfMonth;

  if (loading && !subscription) {
    return (
      <div className="space-y-6 animate-pulse">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-40 bg-white/[0.03] border border-white/[0.06] rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <>
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="space-y-8"
      >
        {/* ─── SECTION 1: HERO CARD ─────────────────────────────────────────── */}
        <motion.div
          variants={item}
          className="relative bg-white/[0.035] border border-white/[0.08] backdrop-blur-2xl rounded-3xl p-8 overflow-hidden"
        >
          {/* Top gradient line */}
          <div className={cn('absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent to-transparent', isPro ? 'via-lime' : 'via-white/20')} />
          {/* Subtle inner glow */}
          {isPro && <div className="absolute top-0 left-1/4 w-1/2 h-32 bg-lime/5 blur-3xl pointer-events-none rounded-full" />}

          <div className="flex flex-col lg:flex-row items-start gap-8">
            {/* LEFT: Plan Icon + Identity */}
            <div className="flex flex-col items-center gap-4 lg:w-56 shrink-0">
              <div className={cn(
                'relative w-24 h-24 rounded-full flex items-center justify-center border-2',
                isPro ? 'border-lime/30 bg-lime/10' : 'border-white/10 bg-white/[0.04]'
              )}>
                {isPro ? (
                  <>
                    <motion.div
                      animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.15, 0.4] }}
                      transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                      className="absolute inset-0 rounded-full bg-lime/20"
                    />
                    <Zap className="w-10 h-10 text-lime" />
                  </>
                ) : (
                  <Shield className="w-10 h-10 text-white/40" />
                )}
              </div>

              <div className="text-center space-y-1">
                <div className="font-display text-xl font-bold text-white tracking-tight">
                  {isPro ? 'PRO PLAN' : 'FREE PLAN'}
                </div>
                <div className="text-xs font-mono text-gray-500">
                  {isPro ? '₹699/month' : 'Free Forever'}
                </div>
                <div className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider border',
                  isPro ? 'bg-lime/10 border-lime/30 text-lime' : 'bg-white/[0.03] border-white/10 text-gray-400'
                )}>
                  <div className={cn('w-1.5 h-1.5 rounded-full', isPro ? 'bg-lime animate-pulse' : 'bg-gray-500')} />
                  {isPro ? 'Pro Active' : 'Active Free'}
                </div>
              </div>
            </div>

            {/* RIGHT: Plan Details */}
            <div className="flex-1 min-w-0">
              {isPro ? (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: 'Plan Type', value: 'Pro Monthly' },
                      { label: 'Started', value: startsAt },
                      { label: 'Renews', value: expiresAt },
                      { label: 'Status', value: 'Active' },
                    ].map(row => (
                      <div key={row.label} className="space-y-1">
                        <div className="text-[9px] font-mono uppercase tracking-widest text-gray-600">{row.label}</div>
                        <div className="text-sm font-mono text-white">{row.value}</div>
                      </div>
                    ))}
                    {daysRemaining !== null && (
                      <div className="space-y-1">
                        <div className="text-[9px] font-mono uppercase tracking-widest text-gray-600">Days Remaining</div>
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-lime/10 border border-lime/20 text-lime font-mono text-sm font-bold">
                          <Clock className="w-3 h-3" /> {daysRemaining}d
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 p-4 rounded-2xl border border-lime/20 bg-lime/[0.04]">
                    <CheckCircle className="w-5 h-5 text-lime shrink-0" />
                    <p className="text-xs text-gray-300 leading-relaxed">
                      You currently have access to <span className="text-lime font-semibold">all SignalRadar Pro features</span>.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { label: 'Plan Type', value: 'Free Forever' },
                      { label: 'Renewal', value: 'No renewal required' },
                      { label: 'Features', value: 'Basic monitoring' },
                    ].map(row => (
                      <div key={row.label} className="space-y-1">
                        <div className="text-[9px] font-mono uppercase tracking-widest text-gray-600">{row.label}</div>
                        <div className="text-sm font-mono text-white/80">{row.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Upgrade CTA Card */}
                  <div className="relative rounded-2xl border border-lime/20 bg-lime/[0.03] p-5 overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-lime/30 to-transparent" />
                    <div className="flex items-start gap-3 mb-4">
                      <div className="p-1.5 rounded-lg bg-lime/10 border border-lime/20">
                        <Zap className="w-4 h-4 text-lime" />
                      </div>
                      <div>
                        <div className="font-display text-sm font-bold text-white">Upgrade to Pro</div>
                        <div className="text-[10px] text-gray-500 mt-0.5">Unlock the full SignalRadar experience</div>
                      </div>
                    </div>
                    <ul className="space-y-2 mb-5">
                      {[
                        'Unlimited AI generations',
                        'Unlimited lead history',
                        'Full analytics & insights',
                        'Browser notifications',
                        'Pipeline editing',
                        'Priority features',
                      ].map(f => (
                        <li key={f} className="flex items-center gap-2 text-xs text-gray-300">
                          <Check className="w-3 h-3 text-lime shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-2xl font-bold font-mono text-lime">₹699</span>
                        <span className="text-xs text-gray-500 ml-1">/month</span>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.03, boxShadow: '0 0 20px rgba(198,255,52,0.3)' }}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setUpgradeOpen(true)}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-lime text-black text-xs font-mono font-bold uppercase tracking-wider cursor-pointer outline-none"
                      >
                        <Zap className="w-3.5 h-3.5" />
                        Start Pro
                      </motion.button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* ─── SECTION 2: USAGE OVERVIEW ────────────────────────────────────── */}
        <motion.div variants={item} className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-px bg-white/5 w-6" />
              <span className="text-[10px] font-mono uppercase tracking-widest text-lime font-bold">Usage This Month</span>
              <div className="h-px bg-white/5 flex-1" />
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-gray-500">
              <RefreshCw className="w-3 h-3" />
              Resets in <span className="text-white/60">{daysLeft}d</span>
            </div>
          </div>

          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4"
          >
            <UsageCard
              icon={<Brain className="w-4 h-4" />}
              label="AI Generations"
              used={usage.ai_generations_today}
              limit={5}
              unit="/day"
              isPro={isPro}
            />
            <UsageCard
              icon={<Download className="w-4 h-4" />}
              label="CSV Exports"
              used={usage.csv_exports_today}
              limit={2}
              unit="/day"
              isPro={isPro}
            />
            <UsageCard
              icon={<Eye className="w-4 h-4" />}
              label="Leads Viewed"
              used={usage.leads_viewed}
              limit={100}
              isPro={isPro}
            />
            <UsageCard
              icon={<Bell className="w-4 h-4" />}
              label="Notifications"
              used={usage.notifications_sent}
              limit={null}
              isLocked={!isPro}
              badge={!isPro ? 'Pro Feature' : undefined}
              isPro={isPro}
            />
          </motion.div>
        </motion.div>

        {/* ─── SECTION 3: RESET CARD ────────────────────────────────────────── */}
        <motion.div
          variants={item}
          className="relative bg-white/[0.02] border border-white/[0.06] rounded-2xl p-6 overflow-hidden"
        >
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/8 to-transparent" />
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-3.5 h-3.5 text-gray-500" />
            <span className="text-[10px] font-mono uppercase tracking-widest text-gray-500 font-bold">Next Reset</span>
          </div>
          <div className="space-y-3">
            {[
              { label: 'AI Generations', icon: <Brain className="w-3.5 h-3.5 text-gray-500" /> },
              { label: 'CSV Exports', icon: <Download className="w-3.5 h-3.5 text-gray-500" /> },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                <div className="flex items-center gap-2">
                  {row.icon}
                  <span className="text-xs font-mono text-gray-400">{row.label}</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-mono">
                  <span className="text-gray-600">Resets in</span>
                  <span className="text-white/70 font-bold">{resetIn}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ─── SECTION 4: FEATURE ACCESS GRID ──────────────────────────────── */}
        <motion.div variants={item} className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-px bg-white/5 w-6" />
              <span className="text-[10px] font-mono uppercase tracking-widest text-lime font-bold">Feature Access</span>
              <div className="h-px bg-white/5 flex-1" />
            </div>
            <span className={cn(
              'text-[9px] font-mono font-bold px-2.5 py-1 rounded-full border uppercase tracking-wider',
              isPro ? 'bg-lime/10 border-lime/30 text-lime' : 'bg-white/5 border-white/10 text-gray-400'
            )}>
              {isPro ? 'Pro Plan' : 'Free Plan'}
            </span>
          </div>

          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 gap-3"
          >
            {FEATURES.map((f, idx) => {
              const isAccessible = isPro || !f.locked;
              return (
                <motion.div
                  key={f.id}
                  variants={item}
                  onClick={!isAccessible && !isPro ? () => setUpgradeOpen(true) : undefined}
                  className={cn(
                    'flex items-center justify-between px-4 py-3.5 rounded-xl border transition-all duration-200',
                    !isAccessible && !isPro
                      ? 'bg-white/[0.01] border-white/[0.04] cursor-pointer hover:border-white/10 hover:bg-white/[0.03]'
                      : 'bg-white/[0.02] border-white/[0.06]'
                  )}
                >
                  <div className="flex items-center gap-2.5">
                    <div className={cn('text-gray-500', isAccessible ? 'text-gray-400' : '')}>
                      {f.icon}
                    </div>
                    <span className={cn('text-xs font-mono', isAccessible ? 'text-white/80' : 'text-gray-600')}>
                      {f.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {!isPro && (
                      <span className="text-[9px] font-mono text-gray-600 hidden sm:block">
                        {f.free}
                      </span>
                    )}
                    {isPro ? (
                      <span className="text-[9px] font-mono text-lime font-bold">{f.pro}</span>
                    ) : f.locked ? (
                      <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/[0.03] border border-white/[0.06] text-gray-600">
                        <Lock className="w-2.5 h-2.5" />
                        <span className="text-[9px] font-mono">Upgrade to unlock</span>
                        <ChevronRight className="w-2.5 h-2.5" />
                      </div>
                    ) : (
                      <Check className="w-3.5 h-3.5 text-lime" />
                    )}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </motion.div>

        {/* ─── SECTION 5: WHY UPGRADE ───────────────────────────────────────── */}
        {!isPro && (
          <motion.div
            variants={item}
            className="relative bg-white/[0.025] border border-white/[0.07] rounded-3xl p-7 overflow-hidden"
          >
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-lime/20 to-transparent" />
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-lime/5 blur-3xl rounded-full pointer-events-none" />

            <div className="relative space-y-5">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-widest text-lime font-bold mb-3">Why Upgrade?</div>
                <div className="text-xs font-mono text-gray-500 mb-4">Last 30 Days — You reached:</div>
                <ul className="space-y-2.5">
                  {[
                    'AI generation limit 6 times',
                    'CSV export limit 3 times',
                    'Lead history limit 2 times',
                  ].map(s => (
                    <li key={s} className="flex items-center gap-2.5 text-xs text-gray-300">
                      <div className="w-4 h-4 rounded-full bg-lime/10 border border-lime/20 flex items-center justify-center shrink-0">
                        <Check className="w-2.5 h-2.5 text-lime" />
                      </div>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>

              <p className="text-xs text-gray-500 leading-relaxed">
                Upgrade to remove all limits and receive real-time business signals the moment they happen.
              </p>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div>
                  <span className="text-2xl font-bold font-mono text-lime">₹699</span>
                  <span className="text-xs text-gray-500 ml-1">/month</span>
                </div>
                <motion.button
                  whileHover={{ scale: 1.03, boxShadow: '0 0 24px rgba(198,255,52,0.35)' }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => setUpgradeOpen(true)}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl bg-lime text-black text-xs font-mono font-bold uppercase tracking-wider cursor-pointer outline-none shadow-[0_0_12px_rgba(198,255,52,0.2)]"
                >
                  <Crown className="w-3.5 h-3.5" />
                  Upgrade to Pro
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        targetPlan="pro"
        currentPlan={isPro ? 'pro' : 'free'}
        onConfirm={async () => {
          await upgradePlan('pro');
        }}
      />
    </>
  );
}
