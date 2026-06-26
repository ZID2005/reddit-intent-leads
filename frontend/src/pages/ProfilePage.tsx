import React, { useState, useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate, useScroll } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import { Navbar } from '../sections/Navbar';
import { PreferencesForm } from '../components/PreferencesForm';
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

// First name cleaner logic
const getFirstName = (email: string, fullName?: string): string => {
  if (fullName && fullName.trim().length > 0) {
    return fullName.trim().split(' ')[0];
  }
  const prefix = email.split('@')[0];
  const cleaned = prefix
    .replace(/[0-9]/g, '')
    .replace(/[._-]/g, ' ')
    .trim()
    .split(' ')[0];
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
};

// Relative time helper
const getRelativeTime = (dateString: string) => {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) {
      return `${Math.max(1, diffMins)}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      return `${diffDays}d ago`;
    }
  } catch {
    return 'just now';
  }
};

// CountUp Component for stat numbers
const CountUp = ({ to }: { to: number }) => {
  const count = useMotionValue(0);
  const rounded = useTransform(count, v => Math.round(v).toLocaleString());

  useEffect(() => {
    const controls = animate(count, to, { duration: 1.2, ease: 'easeOut' });
    return controls.stop;
  }, [to]);

  return <motion.span>{rounded}</motion.span>;
};

// StatCard Component with mouse cursor radial hover sheen
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  subtitle: string;
  delay: number;
  loading: boolean;
}

const StatCard = ({ icon, label, value, subtitle, delay, loading }: StatCardProps) => {
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);
  
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseMove={handleMouseMove}
      className="relative bg-white/[0.03] border border-white/[0.07] backdrop-blur-xl rounded-2xl p-6 overflow-hidden group hover:border-white/15 hover:bg-white/[0.05] transition-all duration-300 select-none cursor-default"
    >
      {hovered && (
        <div 
          className="absolute inset-0 pointer-events-none z-0 transition-opacity duration-300"
          style={{
            background: `radial-gradient(150px circle at ${pos.x}px ${pos.y}px, rgba(198,255,52,0.06), transparent 80%)`
          }}
        />
      )}
      
      <div className="relative z-10 flex flex-col justify-between h-full">
        <div>
          <div className="flex items-center font-mono text-xs text-white/35 tracking-widest uppercase">
            <span className="text-lime/70 w-4 h-4 flex items-center justify-center">
              {icon}
            </span>
            <span className="ml-2">{label}</span>
          </div>
          {loading ? (
            <div className="w-16 h-8 bg-white/10 animate-pulse rounded-lg mt-4" />
          ) : (
            <div className="font-display text-5xl font-bold text-white mt-4 leading-none">
              <CountUp to={value} />
            </div>
          )}
        </div>
        <div className="font-mono text-xs text-white/25 mt-2">{subtitle}</div>
      </div>

      {/* Decorative bottom border line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none z-10" />
    </motion.div>
  );
};

export function ProfilePage({ user, onLogout }: ProfilePageProps) {
  const [stats, setStats] = useState<{ signals: number; leads: number; communities: number } | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [recentLeads, setRecentLeads] = useState<any[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const navigate = useNavigate();

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: true,
    slidesToScroll: 1,
  });
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', () => {
      setCurrent(emblaApi.selectedScrollSnap());
    });
  }, [emblaApi]);

  // Set document title
  useEffect(() => {
    document.title = 'My Profile — SignalRadar';
  }, []);

  // Fetch stats and recent activity on mount
  useEffect(() => {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const startOfMonthIso = startOfMonth.toISOString();

    const fetchAllData = async () => {
      setLoadingStats(true);
      setLoadingLeads(true);
      
      // 1. Fetch Stats
      try {
        // Attempt 1: Fetch filtered by user_id
        const [signalsRes, savedRes, communitiesRes] = await Promise.all([
          supabase.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', startOfMonthIso),
          supabase.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', user.id).eq('status', 'saved'),
          supabase.from('posts').select('subreddit').eq('user_id', user.id)
        ]);

        if (signalsRes.error || savedRes.error || communitiesRes.error) {
          throw new Error('user_id query failed');
        }

        const subreddits = communitiesRes.data ? communitiesRes.data.map((item: any) => item.subreddit) : [];
        const distinctSubreddits = new Set(subreddits).size;

        setStats({
          signals: signalsRes.count ?? 0,
          leads: savedRes.count ?? 0,
          communities: distinctSubreddits,
        });
      } catch (err) {
        // Fallback: Fetch globally without user_id filter
        try {
          const [signalsRes, savedRes, communitiesRes] = await Promise.all([
            supabase.from('posts').select('*', { count: 'exact', head: true }).gte('created_at', startOfMonthIso),
            supabase.from('posts').select('*', { count: 'exact', head: true }).eq('status', 'saved'),
            supabase.from('posts').select('subreddit')
          ]);

          const subreddits = communitiesRes.data ? communitiesRes.data.map((item: any) => item.subreddit) : [];
          const distinctSubreddits = new Set(subreddits).size;

          setStats({
            signals: signalsRes.count ?? 0,
            leads: savedRes.count ?? 0,
            communities: distinctSubreddits,
          });
        } catch (fallbackErr) {
          console.error('Failed to fetch fallback profile stats:', fallbackErr);
          setStats({ signals: 0, leads: 0, communities: 0 });
        }
      } finally {
        setLoadingStats(false);
      }

      // 2. Fetch Recent Leads (last 5)
      try {
        // Attempt 1: Fetch for this user
        const { data, error } = await supabase
          .from('posts')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);

        if (error) throw error;
        setRecentLeads(data || []);
      } catch (err) {
        // Fallback: Fetch globally
        try {
          const { data } = await supabase
            .from('posts')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);
          setRecentLeads(data || []);
        } catch (fallbackErr) {
          console.error('Failed to fetch fallback recent activity:', fallbackErr);
          setRecentLeads([]);
        }
      } finally {
        setLoadingLeads(false);
      }
    };

    fetchAllData();
  }, [user.id]);

  const firstName = getFirstName(user.email || '', user.user_metadata?.full_name);
  const firstInitial = firstName.charAt(0).toUpperCase() || 'U';
  const isProPlan = user.user_metadata?.plan?.toLowerCase() === 'pro';

  // Format created_at date
  const getMemberSinceDate = () => {
    if (!user.created_at) return 'Jun 2026';
    try {
      const date = new Date(user.created_at);
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    } catch {
      return 'Jun 2026';
    }
  };

  // Next billing date helper (1 month from now)
  const getNextBillingDate = () => {
    const nextMonth = new Date();
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    return nextMonth.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  // Framer Motion Animation Variants
  const { scrollYProgress } = useScroll();
  const scaleX = useTransform(scrollYProgress, [0, 1], [0, 1]);

  const staggerContainer = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const fadeUp = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as const } },
  };

  const listVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.04,
      },
    },
  };

  const rowVariants = {
    hidden: { opacity: 0, x: -6 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.2 } },
  };

  const scaleInVariants = {
    hidden: { opacity: 0, scale: 0.98 },
    visible: { opacity: 1, scale: 1, transition: { duration: 0.25, ease: 'easeOut' as const } },
  };

  return (
    <div className="min-h-screen bg-[#070708] text-white flex flex-col font-sans select-none relative overflow-x-hidden">
      
      {/* Page Background */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <motion.div
          animate={{ x: [0, 80, -50, 0], y: [0, -60, 40, 0], scale: [1, 1.3, 0.85, 1] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-[15%] left-[10%] w-[300px] md:w-[500px] h-[300px] md:h-[500px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(198,255,52,0.07) 0%, transparent 70%)', filter: 'blur(80px)' }}
        />
        <motion.div
          animate={{ x: [0, -60, 40, 0], y: [0, 50, -70, 0], scale: [1, 0.8, 1.2, 1] }}
          transition={{ duration: 25, repeat: Infinity, ease: 'easeInOut', delay: 5 }}
          className="absolute bottom-[20%] right-[5%] w-[240px] md:w-[400px] h-[240px] md:h-[400px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(198,255,52,0.05) 0%, transparent 70%)', filter: 'blur(100px)' }}
        />
        <motion.div
          animate={{ x: [0, 40, -30, 0], y: [0, -30, 60, 0], scale: [1, 1.1, 0.9, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 10 }}
          className="absolute top-[50%] left-[50%] w-[360px] md:w-[600px] h-[180px] md:h-[300px] rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(198,255,52,0.03) 0%, transparent 70%)', filter: 'blur(120px)' }}
        />
        <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(rgba(255,255,255,0.015) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
      </div>

      {/* 2. Top Navbar */}
      <Navbar 
        user={user}
        onOpenAuth={() => {}}
        onNavigateToDashboard={() => navigate('/dashboard')}
        onLogout={onLogout}
        authLoading={false}
      />

      {/* 3. Page Content */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="relative z-10 pt-28 pb-20 px-6 max-w-5xl mx-auto w-full flex-1 flex flex-col"
      >
        
        {/* Back Navigation & Logout Row */}
        <div className="flex justify-between items-center mb-8">
          <motion.button
            onClick={() => navigate('/')}
            whileHover={{ x: -4 }}
            whileTap={{ scale: 0.97 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-2 font-mono text-xs text-white/30 hover:text-white/60 transition-colors duration-200 group w-fit outline-none cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:text-lime transition-colors" />
            Back to Home
          </motion.button>

          <motion.button
            onClick={onLogout}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="btn-liquid-glass-danger flex items-center gap-2 px-5 py-2.5 rounded-full text-red-400/80 font-mono text-xs uppercase tracking-wider outline-none cursor-pointer"
          >
            {/* Specular glass reflection crescent */}
            <div className="absolute top-0.5 left-2.5 right-2.5 h-[35%] bg-gradient-to-b from-white/20 to-transparent rounded-t-full pointer-events-none z-10" />
            <LogOut className="w-3.5 h-3.5 relative z-10" />
            <span className="relative z-10">Log Out</span>
          </motion.button>
        </div>

        {/* SECTION A — HERO IDENTITY CARD */}
        <motion.div
          variants={fadeUp}
          className="relative w-full bg-white/[0.03] border border-white/[0.07] backdrop-blur-2xl rounded-3xl p-8 overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
        >
          {/* Decorative top lime line */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-lime/40 to-transparent pointer-events-none" />
          
          <div className="flex flex-col md:flex-row gap-8 items-center md:items-start text-center md:text-left">
            {/* Avatar Circle */}
            <div className="relative flex-shrink-0">
              <div className="w-24 h-24 rounded-full p-[2px] bg-gradient-to-br from-lime/60 via-lime/20 to-transparent">
                <div className="w-full h-full rounded-full bg-[#0D0D0F] flex items-center justify-center font-mono font-bold text-lime text-4xl">
                  {firstInitial}
                </div>
              </div>
            </div>

            {/* Details Column */}
            <div className="flex flex-col items-center md:items-start min-w-0 flex-1">
              <h2 className="font-display text-4xl font-bold text-white tracking-tight leading-none">
                {user.user_metadata?.full_name || firstName}
              </h2>
              
              <div className="flex items-center justify-center md:justify-start gap-2 mt-2">
                <Mail className="w-3.5 h-3.5 text-white/25" />
                <span className="font-mono text-sm text-white/35 truncate max-w-xs sm:max-w-md">
                  {user.email}
                </span>
              </div>

              {/* Plan Badge */}
              <div className="mt-3 flex justify-center md:justify-start">
                {!isProPlan ? (
                  <div className="inline-flex items-center gap-1.5 bg-white/5 border border-white/10 rounded-full px-3 py-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-white/30" />
                    <span className="font-mono text-xs text-white/40">FREE PLAN</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 bg-lime/10 border border-lime/25 rounded-full px-3 py-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-lime" />
                    <span className="font-mono text-xs text-lime">PRO PLAN</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-center md:justify-start gap-1.5 mt-4">
                <Calendar className="w-3.5 h-3.5 text-white/20" />
                <span className="font-mono text-xs text-white/25">
                  Member since {getMemberSinceDate()}
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* SECTION B — STATS GRID */}
        <motion.div 
          variants={fadeUp}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 w-full"
        >
          <StatCard
            icon={<Activity className="w-full h-full" />}
            label="Signals This Month"
            value={stats?.signals ?? 0}
            subtitle="this calendar month"
            delay={0}
            loading={loadingStats}
          />
          <StatCard
            icon={<Bookmark className="w-full h-full" />}
            label="Leads Saved"
            value={stats?.leads ?? 0}
            subtitle="total bookmarked"
            delay={0.1}
            loading={loadingStats}
          />
          <StatCard
            icon={<Radio className="w-full h-full" />}
            label="Communities Tracked"
            value={stats?.communities ?? 0}
            subtitle="active subreddits"
            delay={0.2}
            loading={loadingStats}
          />
        </motion.div>

        {/* SECTION C — RECENT ACTIVITY */}
        <motion.div
          variants={fadeUp}
          className="bg-white/[0.03] border border-white/[0.07] backdrop-blur-xl rounded-2xl overflow-hidden mt-6 shadow-[0_8px_32px_rgba(0,0,0,0.5)] w-full p-6"
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-display text-xl font-semibold text-white">
              Recent Activity
            </h3>
            <span className="font-mono text-xs bg-white/5 border border-white/8 rounded-full px-3 py-1 text-white/35">
              Last 5 leads
            </span>
          </div>

          {loadingLeads ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, idx) => (
                <div key={idx} className="h-28 bg-white/5 rounded-2xl animate-pulse w-full" />
              ))}
            </div>
          ) : recentLeads.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center">
              <Radio className="w-10 h-10 text-white/8" />
              <h4 className="font-display text-base text-white/25 mt-4">No activity yet</h4>
              <p className="font-body text-xs text-white/20 mt-1">Start monitoring to see your leads here.</p>
            </div>
          ) : (
            <div className="relative w-full">
              {/* Embla Viewport */}
              <div className="overflow-hidden w-full cursor-grab active:cursor-grabbing" ref={emblaRef}>
                {/* Embla Container */}
                <div className="flex gap-4">
                  {recentLeads.map((lead, index) => {
                    // Determine priority color
                    let priorityBg = 'bg-white/20 shadow-none';
                    if (String(lead.priority).toLowerCase() === 'high') {
                      priorityBg = 'bg-lime shadow-[0_0_6px_rgba(198,255,52,0.6)]';
                    } else if (String(lead.priority).toLowerCase() === 'medium') {
                      priorityBg = 'bg-amber-400';
                    }

                    return (
                      <div
                        key={lead.id}
                        className="relative flex-shrink-0 flex-[0_0_100%] sm:flex-[0_0_50%] md:flex-[0_0_33.33%] h-[240px] flex items-center justify-center"
                      >
                        <motion.div
                          initial={false}
                          animate={{
                            clipPath:
                              current !== index
                                ? "inset(8% 0 8% 0 round 1.5rem)"
                                : "inset(0 0 0 0 round 1.5rem)",
                          }}
                          transition={{ duration: 0.4, ease: "easeInOut" }}
                          className="h-full w-full overflow-hidden rounded-3xl"
                        >
                          <div className="relative h-full w-full bg-white/[0.02] border border-white/[0.06] backdrop-blur-xl p-5 rounded-3xl flex flex-col justify-between">
                            {/* Header */}
                            <div className="flex justify-between items-center w-full">
                              <span className="font-mono text-xs text-lime/80 font-semibold truncate max-w-[120px]">
                                r/{lead.subreddit}
                              </span>
                              <span className="font-mono text-[10px] text-white/35 flex-shrink-0">
                                {getRelativeTime(lead.processed_at || lead.created_at)}
                              </span>
                            </div>

                            {/* Title content */}
                            <h4 className="font-body text-xs sm:text-sm text-white/80 line-clamp-3 leading-relaxed mt-3 flex-1 select-text">
                              {lead.title}
                            </h4>

                            {/* Footer */}
                            <div className="flex justify-between items-center w-full mt-4 flex-shrink-0">
                              <div className="flex items-center gap-1.5">
                                <div className={cn("w-2 h-2 rounded-full", priorityBg)} />
                                <span className="font-mono text-[9px] text-white/40 uppercase tracking-wider">
                                  {lead.priority}
                                </span>
                              </div>
                              <span className="font-mono text-[10px] bg-white/5 border border-white/10 rounded-full px-2.5 py-0.5 text-white/55">
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

              {/* Navigation controls */}
              <div className="flex justify-between items-center mt-6 w-full gap-4">
                {/* Left/Right Buttons */}
                <div className="flex items-center gap-2">
                  <button
                    aria-label="Previous slide"
                    onClick={() => emblaApi?.scrollPrev()}
                    className="rounded-full bg-white/5 border border-white/10 p-2 text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    aria-label="Next slide"
                    onClick={() => emblaApi?.scrollNext()}
                    className="rounded-full bg-white/5 border border-white/10 p-2 text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Pagination Dots */}
                <div className="flex items-center gap-1.5">
                  {recentLeads.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => emblaApi?.scrollTo(index)}
                      className={cn(
                        "h-1.5 cursor-pointer rounded-full transition-all duration-300",
                        current === index ? "bg-lime w-4" : "bg-white/20 w-1.5",
                      )}
                      aria-label={`Go to slide ${index + 1}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* SECTION D — SUBSCRIPTION CARD */}
        <motion.div
          variants={scaleInVariants}
          className="w-full mt-6"
        >
          {!isProPlan ? (
            // FREE Plan Upgrade Offer
            <div className="relative bg-white/[0.03] border border-lime/[0.15] backdrop-blur-xl rounded-2xl p-8 overflow-hidden">
              {/* Decorative top accent line */}
              <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-lime/50 to-transparent pointer-events-none" />
              {/* Background glow */}
              <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-lime/[0.04] blur-3xl pointer-events-none" />
              
              <div className="flex flex-col md:flex-row gap-8 items-start md:items-center relative z-10 w-full">
                {/* Left Column */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-lime">
                    <Zap className="w-6 h-6 fill-lime" />
                    <h3 className="font-display text-2xl font-bold text-white">Upgrade to Pro</h3>
                  </div>
                  <p className="font-body text-sm text-white/45 mt-1 max-w-xs">
                    Unlock 10 subreddits, real-time alerts, unlimited leads.
                  </p>
                  <ul className="grid grid-cols-2 gap-x-6 gap-y-2 mt-5 text-sm font-body text-white/55">
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-lime/70 flex-shrink-0" />
                      <span>10 Subreddits</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-lime/70 flex-shrink-0" />
                      <span>Real-time signals</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-lime/70 flex-shrink-0" />
                      <span>Unlimited leads</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 text-lime/70 flex-shrink-0" />
                      <span>AI draft replies</span>
                    </li>
                  </ul>
                </div>

                {/* Right Column */}
                <div className="flex flex-col items-start md:items-end justify-center w-full md:w-auto flex-shrink-0 md:ml-auto">
                  <div className="flex items-baseline gap-1">
                    <span className="font-display text-5xl font-bold text-lime">$29</span>
                    <span className="font-body text-sm text-white/35">/month</span>
                  </div>
                  <button
                    onClick={() => window.open('https://polar.sh', '_blank')}
                    className="bg-lime text-black font-body font-semibold rounded-xl px-8 py-3.5 hover:brightness-110 active:scale-95 transition-all shadow-[0_0_30px_rgba(198,255,52,0.2)] hover:shadow-[0_0_40px_rgba(198,255,52,0.35)] w-full md:w-auto text-center cursor-pointer mt-4"
                  >
                    Start Pro Trial
                  </button>
                </div>
              </div>
            </div>
          ) : (
            // PRO Plan Active details
            <div className="bg-lime/[0.05] border border-lime/20 rounded-2xl p-8 relative overflow-hidden">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10 w-full">
                <div>
                  <div className="flex items-center gap-2 text-lime">
                    <CheckCircle className="w-6 h-6 text-lime" />
                    <h4 className="font-display text-xl font-bold text-white uppercase tracking-wider">
                      PRO PLAN ACTIVE
                    </h4>
                  </div>
                  <p className="font-mono text-xs text-white/35 mt-1">
                    Next billing date: <span className="text-white font-medium">{getNextBillingDate()}</span>
                  </p>
                </div>
                <button
                  onClick={() => window.open('https://polar.sh', '_blank')}
                  className="py-2.5 px-5 rounded-xl border border-white/10 font-body text-xs font-semibold text-white/70 hover:border-white/25 hover:text-white transition-all cursor-pointer w-full md:w-auto text-center"
                >
                  Manage Subscription
                </button>
              </div>
            </div>
          )}
        </motion.div>

        {/* SECTION E — ACCOUNT PREFERENCES */}
        <motion.div
          variants={scaleInVariants}
          className="w-full mt-6 bg-white/[0.03] border border-white/[0.07] backdrop-blur-xl rounded-3xl p-8 overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.5)]"
        >
          {/* Decorative top lime line */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-lime/30 to-transparent pointer-events-none" />
          
          <div className="flex items-center gap-3 mb-6">
            <h3 className="font-display text-xl font-semibold text-white">
              Application Preferences
            </h3>
            <span className="font-mono text-xs bg-white/5 border border-white/8 rounded-full px-3 py-1 text-white/35">
              Global Settings
            </span>
          </div>

          <div className="max-w-xl">
            <PreferencesForm />
          </div>
        </motion.div>

      </motion.div>
    </div>
  );
}
