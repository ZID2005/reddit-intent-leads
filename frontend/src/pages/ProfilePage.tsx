import React, { useState, useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate, useScroll, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import { Navbar } from '../sections/Navbar';
import { PreferencesForm } from '../components/PreferencesForm';
import { useSubscription } from '../hooks/useSubscription';
import { UpgradeModal } from '../components/UpgradeModal';
import useEmblaCarousel from 'embla-carousel-react';
import { cn } from '../lib/utils';
import {
  Activity,
  Bookmark,
  Radio,
  Zap,
  Check,
  CheckCircle,
  ArrowLeft,
  Circle,
  Mail,
  Calendar,
  ChevronLeft,
  ChevronRight,
  LogOut
} from 'lucide-react';

interface ProfilePageProps {
  user: User;
  onLogout: () => void;
}

// ─── Helpers ───────────────────────────────────────────────────────────
const getFirstName = (email: string, fullName?: string): string => {
  if (fullName && fullName.trim().length > 0) return fullName.trim().split(' ')[0];
  const prefix = email.split('@')[0];
  const cleaned = prefix.replace(/[0-9]/g, '').replace(/[._-]/g, ' ').trim().split(' ')[0];
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
};

const getRelativeTime = (dateString: string) => {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 60) return `${Math.max(1, diffMins)}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  } catch { return 'just now'; }
};

// ─── Design tokens ─────────────────────────────────────────────────────
const MONR = "'Monr', 'DM Mono', monospace";
const SYNE = "'Syne', sans-serif";
const SANS = "'DM Sans', sans-serif";

const LIME   = '#C6FF34';
const AMBER  = '#E8A838';
const TEXT   = '#F0F0F0';   // primary — very readable
const MUTED  = '#8A8A8E';   // secondary — readable on dark
const DIM    = '#4A4A4E';   // tertiary

// glass card shared style
const glass: React.CSSProperties = {
  background:       'rgba(255,255,255,0.035)',
  border:           '1px solid rgba(255,255,255,0.09)',
  backdropFilter:   'blur(24px)',
  WebkitBackdropFilter: 'blur(24px)',
};

// top shimmer line
const TopLine = ({ opacity = 0.4 }: { opacity?: number }) => (
  <div className="absolute top-0 left-0 right-0 h-px pointer-events-none" style={{
    background: `linear-gradient(90deg, transparent, rgba(198,255,52,${opacity}), transparent)`
  }} />
);

// ─── CountUp number ────────────────────────────────────────────────────
const CountUp = ({ to }: { to: number }) => {
  const count = useMotionValue(0);
  const rounded = useTransform(count, v => Math.round(v).toLocaleString());
  useEffect(() => {
    const ctrl = animate(count, to, { duration: 1.2, ease: [0.22, 1, 0.36, 1] });
    return ctrl.stop;
  }, [to]);
  return <motion.span>{rounded}</motion.span>;
};

// ─── Section entrance ──────────────────────────────────────────────────
const enter = (delay = 0) => ({
  hidden:  { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const, delay } },
});

// ─── Stat card ─────────────────────────────────────────────────────────
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  subtitle: string;
  delay: number;
  loading: boolean;
}

const StatCard = ({ icon, label, value, subtitle, delay, loading }: StatCardProps) => {
  const [pos, setPos]     = useState({ x: 0, y: 0 });
  const [hovered, setHov] = useState(false);

  return (
    <motion.div
      variants={enter(delay)}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: '-40px' }}
      whileTap={{ scale: 0.97 }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onMouseMove={e => {
        const r = e.currentTarget.getBoundingClientRect();
        setPos({ x: e.clientX - r.left, y: e.clientY - r.top });
      }}
      style={{ ...glass, borderRadius: 18 }}
      className="relative p-6 overflow-hidden cursor-default select-none"
    >
      <TopLine opacity={0.25} />

      {/* Mouse sheen */}
      <AnimatePresence>
        {hovered && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 pointer-events-none"
            style={{ background: `radial-gradient(160px circle at ${pos.x}px ${pos.y}px, rgba(198,255,52,0.07), transparent 75%)` }}
          />
        )}
      </AnimatePresence>

      <div className="relative z-10 flex flex-col gap-3">
        {/* Label */}
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 flex-shrink-0" style={{ color: `${LIME}99` }}>{icon}</span>
          <span style={{ fontFamily: MONR, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: MUTED }}>
            {label}
          </span>
        </div>

        {/* Number */}
        {loading ? (
          <div className="w-20 h-10 rounded-xl animate-pulse" style={{ background: 'rgba(255,255,255,0.07)' }} />
        ) : (
          <div style={{ fontFamily: MONR, fontSize: 'clamp(2rem,4vw,2.75rem)', fontWeight: 700, color: TEXT, letterSpacing: '-0.02em', lineHeight: 1 }}>
            <CountUp to={value} />
          </div>
        )}

        {/* Subtitle */}
        <span style={{ fontFamily: MONR, fontSize: 10, letterSpacing: '0.06em', color: DIM }}>
          {subtitle}
        </span>
      </div>
    </motion.div>
  );
};

// ─── Section heading ───────────────────────────────────────────────────
const SectionHead = ({ title, badge }: { title: string; badge?: string }) => (
  <div className="flex items-center gap-3 mb-6">
    <h3 style={{ fontFamily: SYNE, fontWeight: 700, fontSize: '1.15rem', color: TEXT, letterSpacing: '-0.01em' }}>
      {title}
    </h3>
    {badge && (
      <span className="px-3 py-1 rounded-full" style={{
        fontFamily: MONR, fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase',
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.09)', color: MUTED
      }}>
        {badge}
      </span>
    )}
  </div>
);

// ─── MAIN EXPORT ────────────────────────────────────────────────────────
export function ProfilePage({ user, onLogout }: ProfilePageProps) {
  const navigate = useNavigate();
  const {
    subscription,
    isPro: isProPlan,
    upgradePlan,
    refresh
  } = useSubscription(user.id);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);

  const [stats, setStats]         = useState<{ signals: number; leads: number; communities: number } | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [recentLeads, setRecentLeads]   = useState<any[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(true);

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, slidesToScroll: 1 });
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', () => setCurrent(emblaApi.selectedScrollSnap()));
  }, [emblaApi]);

  useEffect(() => { document.title = 'My Profile — SignalRadar'; }, []);

  // ── Fetch stats & recent leads ────────────────────────────────────────
  useEffect(() => {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const startOfMonthIso = startOfMonth.toISOString();

    const fetchAllData = async () => {
      setLoadingStats(true);
      setLoadingLeads(true);

      // 1. Stats
      try {
        const [signalsRes, savedRes, communitiesRes] = await Promise.all([
          supabase.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', startOfMonthIso),
          supabase.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'saved'),
          supabase.from('posts').select('subreddit').eq('user_id', user.id)
        ]);
        if (signalsRes.error || savedRes.error || communitiesRes.error) throw new Error('user_id query failed');
        const subs = communitiesRes.data?.map((i: any) => i.subreddit) ?? [];
        setStats({ signals: signalsRes.count ?? 0, leads: savedRes.count ?? 0, communities: new Set(subs).size });
      } catch {
        try {
          const [signalsRes, savedRes, communitiesRes] = await Promise.all([
            supabase.from('posts').select('*', { count: 'exact', head: true }).gte('created_at', startOfMonthIso),
            supabase.from('posts').select('*', { count: 'exact', head: true }).eq('status', 'saved'),
            supabase.from('posts').select('subreddit')
          ]);
          const subs = communitiesRes.data?.map((i: any) => i.subreddit) ?? [];
          setStats({ signals: signalsRes.count ?? 0, leads: savedRes.count ?? 0, communities: new Set(subs).size });
        } catch (e) {
          console.error('Failed to fetch fallback profile stats:', e);
          setStats({ signals: 0, leads: 0, communities: 0 });
        }
      } finally { setLoadingStats(false); }

      // 2. Recent leads
      try {
        const { data, error } = await supabase.from('posts').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5);
        if (error) throw error;
        setRecentLeads(data || []);
      } catch {
        try {
          const { data } = await supabase.from('posts').select('*').order('created_at', { ascending: false }).limit(5);
          setRecentLeads(data || []);
        } catch (e) {
          console.error('Failed to fetch fallback recent activity:', e);
          setRecentLeads([]);
        }
      } finally { setLoadingLeads(false); }
    };

    fetchAllData();
  }, [user.id]);

  // ── Derived values ────────────────────────────────────────────────────
  const firstName     = getFirstName(user.email || '', user.user_metadata?.full_name);
  const firstInitial  = firstName.charAt(0).toUpperCase() || 'U';

  const getMemberSinceDate = () => {
    if (!user.created_at) return 'Jun 2026';
    try { return new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }); }
    catch { return 'Jun 2026'; }
  };

  const getNextBillingDate = () => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  // scroll progress bar
  const { scrollYProgress } = useScroll();
  const scaleX = useTransform(scrollYProgress, [0, 1], [0, 1]);

  // ── RENDER ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col relative overflow-x-hidden select-none"
      style={{ background: '#070708', color: TEXT }}>

      {/* ── Scroll progress ──────────────────────────── */}
      <motion.div
        style={{ scaleX, transformOrigin: 'left', position: 'fixed', top: 0, left: 0, right: 0,
          height: 2, background: `linear-gradient(90deg, ${LIME}, rgba(198,255,52,0.3))`, zIndex: 100 }}
      />

      {/* ── Ambient orbs ─────────────────────────────── */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ x: [0,80,-50,0], y: [0,-60,40,0], scale: [1,1.22,0.88,1] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }}
          style={{ position:'absolute', top:'10%', left:'6%', width:500, height:500, borderRadius:'50%',
            background:'radial-gradient(circle, rgba(198,255,52,0.09) 0%, transparent 70%)', filter:'blur(80px)' }}
        />
        <motion.div
          animate={{ x: [0,-60,40,0], y: [0,55,-75,0], scale: [1,0.84,1.16,1] }}
          transition={{ duration: 24, repeat: Infinity, ease: 'easeInOut', delay: 6 }}
          style={{ position:'absolute', bottom:'12%', right:'4%', width:380, height:380, borderRadius:'50%',
            background:'radial-gradient(circle, rgba(198,255,52,0.07) 0%, transparent 70%)', filter:'blur(100px)' }}
        />
        <motion.div
          animate={{ x: [0,44,-28,0], y: [0,-38,58,0], scale: [1,1.08,0.93,1] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut', delay: 11 }}
          style={{ position:'absolute', top:'48%', left:'42%', width:560, height:260, borderRadius:'50%',
            background:'radial-gradient(circle, rgba(198,255,52,0.04) 0%, transparent 70%)', filter:'blur(120px)' }}
        />
        {/* Dot grid */}
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.014) 1px, transparent 1px)',
          backgroundSize: '32px 32px'
        }} />
      </div>

      {/* ── Navbar ───────────────────────────────────── */}
      <Navbar user={user} onOpenAuth={() => {}} onNavigateToDashboard={() => navigate('/dashboard')} onLogout={onLogout} authLoading={false} />

      {/* ── Content ──────────────────────────────────── */}
      <div className="relative z-10 pt-28 pb-24 px-4 sm:px-6 max-w-5xl mx-auto w-full flex-1 flex flex-col">

        {/* Back / Logout row */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="flex justify-between items-center mb-10"
        >
          <motion.button
            onClick={() => navigate('/')}
            whileHover={{ x: -3 }}
            whileTap={{ scale: 0.96 }}
            className="flex items-center gap-2 outline-none cursor-pointer group"
            style={{ fontFamily: MONR, fontSize: 10, letterSpacing: '0.1em', color: MUTED, textTransform: 'uppercase' }}
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:text-lime/70 transition-colors duration-150" />
            <span className="group-hover:opacity-80 transition-opacity duration-150">Back to Home</span>
          </motion.button>

          <motion.button
            onClick={onLogout}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            className="btn-liquid-glass-danger relative flex items-center gap-2 px-5 py-2 rounded-full outline-none cursor-pointer text-[#ef4444] hover:text-[#ff6b6b] font-mono text-[10px] tracking-wider uppercase"
            style={{ minHeight: 40 }}
          >
            <LogOut className="w-3.5 h-3.5 relative z-10" />
            <span className="relative z-10">Log Out</span>
          </motion.button>
        </motion.div>

        {/* ════════════════════════════════════════════════
            A — IDENTITY CARD
        ════════════════════════════════════════════════ */}
        <motion.div
          variants={enter(0)}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          style={{ ...glass, borderRadius: 22 }}
          className="relative p-8 overflow-hidden shadow-[0_12px_48px_rgba(0,0,0,0.6)]"
        >
          <TopLine opacity={0.45} />
          {/* Corner glow */}
          <div className="absolute -top-16 -left-12 w-44 h-44 rounded-full pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(198,255,52,0.08) 0%, transparent 70%)', filter: 'blur(40px)' }} />

          <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center md:items-start text-center md:text-left">
            {/* Avatar */}
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1], delay: 0.1 }}
              className="relative flex-shrink-0"
            >
              <div className="absolute inset-0 rounded-full pointer-events-none"
                style={{ boxShadow: `0 0 0 1px rgba(198,255,52,0.25), 0 0 28px rgba(198,255,52,0.10)`, borderRadius: '50%' }} />
              <div className="w-24 h-24 rounded-full p-[2px]"
                style={{ background: 'linear-gradient(135deg, rgba(198,255,52,0.5), rgba(198,255,52,0.08), transparent)' }}>
                <div className="w-full h-full rounded-full flex items-center justify-center"
                  style={{ background: '#0D0D0F', fontFamily: MONR, fontWeight: 800, fontSize: '2rem', color: LIME }}>
                  {firstInitial}
                </div>
              </div>
            </motion.div>

            {/* Details */}
            <div className="flex flex-col items-center md:items-start min-w-0 flex-1 gap-3">
              {/* Name */}
              <h2 style={{ fontFamily: SYNE, fontWeight: 800, fontSize: 'clamp(1.8rem,4vw,2.4rem)',
                color: TEXT, letterSpacing: '-0.025em', lineHeight: 1 }}>
                {user.user_metadata?.full_name || firstName}
              </h2>

              {/* Email */}
              <div className="flex items-center justify-center md:justify-start gap-2">
                <Mail className="w-3.5 h-3.5 flex-shrink-0" style={{ color: DIM }} />
                <span className="truncate max-w-xs sm:max-w-sm"
                  style={{ fontFamily: MONR, fontSize: 11, color: MUTED }}>
                  {user.email}
                </span>
              </div>

              {/* Plan + member since row */}
              <div className="flex items-center gap-3 flex-wrap justify-center md:justify-start">
                {!isProPlan ? (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                      fontFamily: MONR, fontSize: 9, letterSpacing: '0.12em', color: MUTED, textTransform: 'uppercase' }}>
                    <Circle className="w-1.5 h-1.5 fill-current" style={{ color: DIM }} />
                    Free Plan
                  </div>
                ) : (
                  <motion.div
                    animate={{ boxShadow: ['0 0 10px rgba(198,255,52,0.12)','0 0 22px rgba(198,255,52,0.24)','0 0 10px rgba(198,255,52,0.12)'] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full"
                    style={{ background: 'rgba(198,255,52,0.1)', border: '1px solid rgba(198,255,52,0.28)',
                      fontFamily: MONR, fontSize: 9, letterSpacing: '0.12em', color: LIME, textTransform: 'uppercase' }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: LIME, boxShadow: `0 0 5px ${LIME}` }} />
                    Pro Plan
                  </motion.div>
                )}

                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" style={{ color: DIM }} />
                  <span style={{ fontFamily: MONR, fontSize: 9, letterSpacing: '0.08em', color: MUTED, textTransform: 'uppercase' }}>
                    Member since {getMemberSinceDate()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ════════════════════════════════════════════════
            B — STATS GRID
        ════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-5 w-full">
          <StatCard icon={<Activity className="w-full h-full" />} label="Signals This Month"   value={stats?.signals     ?? 0} subtitle="this calendar month" delay={0}    loading={loadingStats} />
          <StatCard icon={<Bookmark  className="w-full h-full" />} label="Leads Saved"          value={stats?.leads       ?? 0} subtitle="total bookmarked"    delay={0.07} loading={loadingStats} />
          <StatCard icon={<Radio     className="w-full h-full" />} label="Communities Tracked"  value={stats?.communities ?? 0} subtitle="active subreddits"   delay={0.14} loading={loadingStats} />
        </div>

        {/* ════════════════════════════════════════════════
            C — RECENT ACTIVITY
        ════════════════════════════════════════════════ */}
        <motion.div
          variants={enter(0.1)}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          style={{ ...glass, borderRadius: 20, position: 'relative' }}
          className="mt-5 p-7 overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.5)] w-full"
        >
          <TopLine opacity={0.2} />
          <SectionHead title="Recent Activity" badge="Last 5 leads" />

          {loadingLeads ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-28 rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.05)' }} />
              ))}
            </div>
          ) : recentLeads.length === 0 ? (
            <div className="py-14 flex flex-col items-center gap-3">
              <Radio className="w-9 h-9" style={{ color: DIM }} />
              <h4 style={{ fontFamily: SYNE, fontWeight: 600, fontSize: '1rem', color: MUTED }}>No activity yet</h4>
              <p style={{ fontFamily: SANS, fontSize: 12, color: DIM }}>Start monitoring to see your leads here.</p>
            </div>
          ) : (
            <div className="relative w-full">
              <div className="overflow-hidden w-full cursor-grab active:cursor-grabbing" ref={emblaRef}>
                <div className="flex gap-4">
                  {recentLeads.map((lead, index) => {
                    const prio = String(lead.priority).toLowerCase();
                    const dotColor = prio === 'high' ? LIME : prio === 'medium' ? AMBER : DIM;
                    const dotGlow  = prio === 'high' ? `0 0 7px rgba(198,255,52,0.6)` : 'none';

                    return (
                      <div key={lead.id}
                        className="relative flex-shrink-0 flex-[0_0_100%] sm:flex-[0_0_50%] md:flex-[0_0_33.33%] h-[240px] flex items-center justify-center">
                        <motion.div
                          initial={false}
                          animate={{ clipPath: current !== index ? 'inset(8% 0 8% 0 round 1.25rem)' : 'inset(0 0 0 0 round 1.25rem)' }}
                          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                          className="h-full w-full overflow-hidden rounded-[1.25rem]"
                        >
                          <div className="relative h-full w-full p-5 rounded-[1.25rem] flex flex-col justify-between"
                            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                            {/* Header */}
                            <div className="flex justify-between items-center w-full">
                              <span style={{ fontFamily: MONR, fontSize: 11, color: `${LIME}CC`, fontWeight: 600 }}
                                className="truncate max-w-[120px]">
                                r/{lead.subreddit}
                              </span>
                              <span style={{ fontFamily: MONR, fontSize: 10, color: MUTED, flexShrink: 0 }}>
                                {getRelativeTime(lead.processed_at || lead.created_at)}
                              </span>
                            </div>
                            {/* Title — bright enough to read */}
                            <h4 className="line-clamp-3 leading-relaxed mt-3 flex-1"
                              style={{ fontFamily: SANS, fontSize: 13, color: 'rgba(240,240,240,0.85)' }}>
                              {lead.title}
                            </h4>
                            {/* Footer */}
                            <div className="flex justify-between items-center w-full mt-4 flex-shrink-0">
                              <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full flex-shrink-0"
                                  style={{ background: dotColor, boxShadow: dotGlow }} />
                                <span style={{ fontFamily: MONR, fontSize: 9, color: MUTED, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                                  {lead.priority}
                                </span>
                              </div>
                              <span className="px-2.5 py-0.5 rounded-full"
                                style={{ fontFamily: MONR, fontSize: 10, background: 'rgba(255,255,255,0.05)',
                                  border: '1px solid rgba(255,255,255,0.09)', color: 'rgba(240,240,240,0.6)' }}>
                                Score: {lead.intent_score}
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Controls */}
              <div className="flex justify-between items-center mt-5 w-full">
                <div className="flex items-center gap-2">
                  {[emblaApi?.scrollPrev, emblaApi?.scrollNext].map((fn, i) => (
                    <motion.button key={i} whileTap={{ scale: 0.91 }}
                      onClick={() => fn?.()}
                      aria-label={i === 0 ? 'Previous slide' : 'Next slide'}
                      className="rounded-full cursor-pointer flex items-center justify-center"
                      style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                        color: MUTED, width: 36, height: 36, minWidth: 36 }}>
                      {i === 0 ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </motion.button>
                  ))}
                </div>
                <div className="flex items-center gap-1.5">
                  {recentLeads.map((_, i) => (
                    <motion.button key={i}
                      onClick={() => emblaApi?.scrollTo(i)}
                      animate={{ width: current === i ? 16 : 6, background: current === i ? LIME : 'rgba(255,255,255,0.2)' }}
                      transition={{ duration: 0.28, ease: [0.22,1,0.36,1] }}
                      className="h-1.5 rounded-full cursor-pointer outline-none"
                      aria-label={`Go to slide ${i + 1}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* ════════════════════════════════════════════════
            D — SUBSCRIPTION
        ════════════════════════════════════════════════ */}
        <motion.div
          variants={enter(0.15)}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          className="w-full mt-5"
        >
          {!isProPlan ? (
            <div className="relative p-8 overflow-hidden shadow-[0_12px_48px_rgba(0,0,0,0.5)]"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(198,255,52,0.15)', borderRadius: 20, backdropFilter: 'blur(24px)' }}>
              <TopLine opacity={0.5} />
              <div className="absolute -top-20 right-0 w-72 h-72 rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(198,255,52,0.05) 0%, transparent 70%)', filter: 'blur(60px)' }} />

              <div className="flex flex-col md:flex-row gap-8 items-start md:items-center relative z-10 w-full">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <Zap className="w-5 h-5" style={{ color: LIME, fill: LIME }} />
                    <h3 style={{ fontFamily: SYNE, fontWeight: 800, fontSize: '1.45rem', color: TEXT, letterSpacing: '-0.02em' }}>
                      Upgrade to Pro
                    </h3>
                  </div>
                  <p style={{ fontFamily: SANS, fontSize: 13, color: MUTED, maxWidth: 280, lineHeight: 1.65 }}>
                    Unlock 10 subreddits, real-time alerts, unlimited leads.
                  </p>
                  <ul className="grid grid-cols-2 gap-x-6 gap-y-2.5 mt-5">
                    {['10 Subreddits','Real-time signals','Unlimited leads','AI draft replies'].map(f => (
                      <li key={f} className="flex items-center gap-2">
                        <Check className="w-3.5 h-3.5 flex-shrink-0" style={{ color: `${LIME}88` }} />
                        <span style={{ fontFamily: SANS, fontSize: 13, color: MUTED }}>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-col items-start md:items-end w-full md:w-auto flex-shrink-0 gap-4">
                  <div className="flex items-baseline gap-1">
                    <span style={{ fontFamily: MONR, fontWeight: 800, fontSize: '3rem', color: LIME, letterSpacing: '-0.03em', lineHeight: 1 }}>$29</span>
                    <span style={{ fontFamily: SANS, fontSize: 13, color: MUTED }}>/month</span>
                  </div>
                  <motion.button
                    onClick={() => setUpgradeModalOpen(true)}
                    whileHover={{ scale: 1.03, filter: 'brightness(1.12)' }}
                    whileTap={{ scale: 0.96 }}
                    className="px-8 py-3.5 rounded-xl font-semibold text-black cursor-pointer w-full md:w-auto text-center"
                    style={{ background: LIME, fontFamily: SANS, fontSize: 14,
                      boxShadow: '0 0 28px rgba(198,255,52,0.22)', minHeight: 48 }}>
                    Start Pro Trial
                  </motion.button>
                </div>
              </div>

              {/* Usage tracking meters */}
              <div className="mt-8 border-t border-white/5 pt-6 space-y-4 relative z-10">
                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest block font-bold">
                  Today's Feature Usage
                </span>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Meter 1: AI Generations */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-gray-400">AI Outreach Drafts</span>
                      <span className="text-white font-bold">
                        {subscription ? subscription.usage.ai_generations_today : 0} / 5
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div 
                        className="h-full bg-lime transition-all duration-300"
                        style={{ width: `${Math.min(100, ((subscription ? subscription.usage.ai_generations_today : 0) / 5) * 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Meter 2: CSV Exports */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-gray-400">CSV Exports</span>
                      <span className="text-white font-bold">
                        {subscription ? subscription.usage.csv_exports_today : 0} / 2
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div 
                        className="h-full bg-lime transition-all duration-300"
                        style={{ width: `${Math.min(100, ((subscription ? subscription.usage.csv_exports_today : 0) / 2) * 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative p-8 overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
              style={{ background: 'rgba(198,255,52,0.04)', border: '1px solid rgba(198,255,52,0.18)', borderRadius: 20, backdropFilter: 'blur(24px)' }}>
              <TopLine opacity={0.35} />
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10 w-full">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle className="w-5 h-5" style={{ color: LIME }} />
                    <h4 style={{ fontFamily: SYNE, fontWeight: 800, fontSize: '1.1rem', color: TEXT, letterSpacing: '0.04em' }}>
                      PRO PLAN ACTIVE
                    </h4>
                  </div>
                  <p style={{ fontFamily: MONR, fontSize: 11, color: MUTED }}>
                    Next billing: <span style={{ color: TEXT }}>{getNextBillingDate()}</span>
                  </p>
                </div>
                <motion.button
                  onClick={() => setUpgradeModalOpen(true)}
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.96 }}
                  className="px-5 py-2.5 rounded-xl cursor-pointer w-full md:w-auto text-center"
                  style={{ border: '1px solid rgba(255,255,255,0.12)', fontFamily: SANS, fontWeight: 600,
                    fontSize: 12, color: MUTED, background: 'transparent', minHeight: 44 }}>
                  Change Plan
                </motion.button>
              </div>

              {/* Usage tracking meters for Pro */}
              <div className="mt-8 border-t border-white/5 pt-6 space-y-4 relative z-10">
                <span className="text-[10px] font-mono text-[#C6FF34] uppercase tracking-widest block font-bold">
                  Monthly Usage Summary (Pro)
                </span>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3.5 rounded-xl border border-white/5 bg-white/[0.015] text-center">
                    <div className="text-[10px] font-mono text-gray-500 uppercase">AI Drafts Today</div>
                    <div className="text-lg font-bold text-white mt-1">{subscription?.usage.ai_generations_today ?? 0}</div>
                  </div>
                  <div className="p-3.5 rounded-xl border border-white/5 bg-white/[0.015] text-center">
                    <div className="text-[10px] font-mono text-gray-500 uppercase">CSV Exports Today</div>
                    <div className="text-lg font-bold text-white mt-1">{subscription?.usage.csv_exports_today ?? 0}</div>
                  </div>
                  <div className="p-3.5 rounded-xl border border-white/5 bg-white/[0.015] text-center">
                    <div className="text-[10px] font-mono text-gray-500 uppercase">Leads Checked</div>
                    <div className="text-lg font-bold text-white mt-1">{subscription?.usage.leads_viewed ?? 0}</div>
                  </div>
                  <div className="p-3.5 rounded-xl border border-white/5 bg-white/[0.015] text-center">
                    <div className="text-[10px] font-mono text-gray-500 uppercase">Alerts Sent</div>
                    <div className="text-lg font-bold text-white mt-1">{subscription?.usage.notifications_sent ?? 0}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* ════════════════════════════════════════════════
            E — APPLICATION PREFERENCES
        ════════════════════════════════════════════════ */}
        <motion.div
          variants={enter(0.2)}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
          style={{ ...glass, borderRadius: 22, position: 'relative' }}
          className="w-full mt-5 p-8 overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
        >
          <TopLine opacity={0.18} />
          <SectionHead title="Application Preferences" badge="Global Settings" />
          <div className="max-w-xl">
            <PreferencesForm user={user} isPro={isProPlan} onUpgrade={() => setUpgradeModalOpen(true)} />
          </div>
        </motion.div>

      </div>

      <UpgradeModal
        isOpen={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        targetPlan={isProPlan ? 'free' : 'pro'}
        currentPlan={subscription?.plan || 'free'}
        onConfirm={async () => {
          await upgradePlan(isProPlan ? 'free' : 'pro');
          await refresh();
        }}
      />
    </div>
  );
}
