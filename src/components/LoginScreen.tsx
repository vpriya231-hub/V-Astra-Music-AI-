import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Music2, Sparkles, Shield, ChevronRight } from 'lucide-react';

interface LoginScreenProps {
  onSignIn: () => Promise<void>;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onSignIn }) => {
  const [isSigningIn, setIsSigningIn] = useState(false);

  const handleSignInClick = async () => {
    setIsSigningIn(true);
    try {
      await onSignIn();
    } catch (err) {
      console.error("Sign in failed:", err);
    } finally {
      setIsSigningIn(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center px-4 py-8 relative justify-around">
      {/* Visual glowing ornaments */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-orange-600/10 blur-[130px] rounded-full pointer-events-none" />
      
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="w-full max-w-lg bg-neutral-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-8 sm:p-10 shadow-3xl flex flex-col justify-between space-y-8 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 bg-orange-500/10 text-orange-400 font-mono text-[9px] font-bold tracking-widest uppercase px-3 py-1.5 rounded-bl-2xl border-l border-b border-white/5">
          V-Astra Auth Guard
        </div>

        {/* Brand visual header */}
        <div className="space-y-4 text-center">
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
            className="w-14 h-14 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20 mx-auto"
          >
            <Music2 className="w-8 h-8 text-white" />
          </motion.div>
          <div className="space-y-2">
            <h2 className="text-3xl font-black text-white tracking-tight uppercase">
              Sonic Studio Access
            </h2>
            <div className="flex items-center justify-center gap-1.5 text-xs text-orange-400 font-semibold uppercase tracking-wider bg-orange-500/10 px-3.5 py-1.5 rounded-full border border-orange-500/20 max-w-xs mx-auto">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Please sign in to start creating music</span>
            </div>
          </div>
        </div>

        {/* Feature Highlights Grid */}
        <div className="space-y-4 bg-white/[0.02] border border-white/5 p-5 rounded-2xl">
          <h4 className="text-[10px] font-bold text-white/40 uppercase tracking-widest block font-mono">
            Unleashed Studio Perks
          </h4>
          
          <div className="space-y-3.5">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mt-0.5 flex-shrink-0">
                <span className="text-[10px] font-bold text-orange-400">01</span>
              </div>
              <div>
                <p className="text-sm font-bold text-white">Dynamic Lyria & HF Engines</p>
                <p className="text-xs text-white/50 leading-relaxed font-sans">
                  Generate music pieces live using elite deep-learning models matched with premium routing.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mt-0.5 flex-shrink-0">
                <span className="text-[10px] font-bold text-orange-400">02</span>
              </div>
              <div>
                <p className="text-sm font-bold text-white">Private Cloud Library Storage</p>
                <p className="text-xs text-white/50 leading-relaxed font-sans">
                  Keep your synthesized audio layers cataloged safely under your authentic Google account in real-time.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mt-0.5 flex-shrink-0">
                <span className="text-[10px] font-bold text-orange-400">03</span>
              </div>
              <div>
                <p className="text-sm font-bold text-white">Interactive Plan Testing Center</p>
                <p className="text-xs text-white/50 leading-relaxed font-sans">
                  Upgrade plans directly to expand daily thresholds, bypass ads, and access custom API routings.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main CTA Google Button */}
        <div className="space-y-3">
          <button
            onClick={handleSignInClick}
            disabled={isSigningIn}
            className="w-full flex items-center justify-between px-6 py-4 bg-white text-black font-extrabold text-sm rounded-2xl hover:bg-orange-500 hover:text-white transition-all transform active:scale-[0.98] shadow-lg shadow-white/5 focus:outline-none focus:ring-2 focus:ring-orange-500/50 group"
          >
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span className="font-bold">
                {isSigningIn ? "Signing in to Studio..." : "Continue with Google Account"}
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-white transition-colors" />
          </button>

          <p className="text-[10px] text-center text-white/30 font-mono flex items-center justify-center gap-1.5">
            <Shield className="w-3 h-3 text-green-500/60" />
            <span>Secure Authentication powered by Firebase Auth</span>
          </p>
        </div>
      </motion.div>
    </div>
  );
};
