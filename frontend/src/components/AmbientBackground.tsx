import { motion } from 'framer-motion';

export default function AmbientBackground() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      <motion.div
        animate={{ x:[0,70,-50,0], y:[0,-50,40,0], scale:[1,1.25,0.88,1] }}
        transition={{ duration:22, repeat:Infinity, ease:'easeInOut' }}
        className="absolute top-[10%] left-[20%] w-[600px] h-[600px] rounded-full"
        style={{ background:'radial-gradient(circle, rgba(198,255,52,0.055) 0%, transparent 70%)', filter:'blur(100px)' }}
      />
      <motion.div
        animate={{ x:[0,-60,35,0], y:[0,45,-60,0], scale:[1,0.85,1.2,1] }}
        transition={{ duration:28, repeat:Infinity, ease:'easeInOut', delay:6 }}
        className="absolute bottom-[15%] right-[10%] w-[500px] h-[500px] rounded-full"
        style={{ background:'radial-gradient(circle, rgba(198,255,52,0.035) 0%, transparent 70%)', filter:'blur(120px)' }}
      />
      <motion.div
        animate={{ x:[0,40,-25,0], y:[0,-35,55,0], scale:[1,1.1,0.92,1] }}
        transition={{ duration:18, repeat:Infinity, ease:'easeInOut', delay:12 }}
        className="absolute top-[50%] left-[55%] w-[400px] h-[400px] rounded-full"
        style={{ background:'radial-gradient(circle, rgba(198,255,52,0.025) 0%, transparent 70%)', filter:'blur(140px)' }}
      />
      <div
        className="absolute inset-0"
        style={{ backgroundImage:'radial-gradient(rgba(255,255,255,0.012) 1px, transparent 1px)', backgroundSize:'28px 28px' }}
      />
    </div>
  );
}
