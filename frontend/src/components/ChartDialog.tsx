import { motion, AnimatePresence } from 'framer-motion';
import { X, Maximize2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface ChartDialogProps {
  title: string;
  children: React.ReactNode;
  expandedChildren?: React.ReactNode;
}

export function ChartDialog({ title, children, expandedChildren }: ChartDialogProps) {
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Delay mounting of Recharts components until the transition has finished
  // so that ResponsiveContainer receives the correct parent width/height.
  useEffect(() => {
    if (open) {
      const id = setTimeout(() => setActive(true), 150);
      return () => clearTimeout(id);
    } else {
      setActive(false);
    }
  }, [open]);

  const dialogVariants = {
    hidden: isMobile
      ? { y: '100%', opacity: 1, scale: 1 }
      : { opacity: 0, scale: 0.9, y: 15 },
    visible: {
      y: 0,
      opacity: 1,
      scale: 1,
      transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] as const }
    },
    exit: isMobile
      ? { y: '100%', opacity: 1, scale: 1, transition: { duration: 0.25, ease: 'easeInOut' as const } }
      : { opacity: 0, scale: 0.92, y: 10, transition: { duration: 0.2 } }
  };

  return (
    <>
      <div className="relative group w-full h-full">
        {children}
        <button
          onClick={() => setOpen(true)}
          className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200 w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <Maximize2 className="w-3.5 h-3.5 text-white/50" />
        </button>
      </div>

      {typeof document !== 'undefined' && createPortal(
        <AnimatePresence>
          {open && (
            <div className="fixed inset-0 z-[9999] overflow-hidden flex items-center justify-center">
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="absolute inset-0"
                style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}
                onClick={() => setOpen(false)}
              />

              {/* Centering wrapper */}
              <div className="absolute inset-0 flex items-center justify-center p-4 md:p-6 pointer-events-none">
                {/* Modal Container */}
                <motion.div
                  variants={dialogVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  className={`w-full flex flex-col pointer-events-auto ${
                    isMobile
                      ? 'fixed inset-0 rounded-t-3xl rounded-b-none'
                      : 'max-w-3xl h-[580px] rounded-[24px]'
                  }`}
                  style={{
                    background: 'rgba(10, 10, 12, 0.72)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    backdropFilter: 'blur(30px) saturate(190%)',
                    WebkitBackdropFilter: 'blur(30px) saturate(190%)',
                    boxShadow: '0 24px 80px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.06)',
                  }}
                >
                  <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] shrink-0">
                    <span className="font-display text-white font-semibold text-base">{title}</span>
                    <motion.button
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setOpen(false)}
                      className="w-8 h-8 rounded-full flex items-center justify-center cursor-pointer"
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)' }}
                    >
                      <X className="w-4 h-4 text-white/50" />
                    </motion.button>
                  </div>
                  <div className="flex-1 overflow-auto p-6">
                    {active && (expandedChildren || children)}
                  </div>
                </motion.div>
              </div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
