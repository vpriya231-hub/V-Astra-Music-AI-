import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Megaphone, ExternalLink } from 'lucide-react';
import { ADMOB_CONFIG } from '../lib/admob';

interface BannerAdProps {
  userProfile: any;
}

export const BannerAd: React.FC<BannerAdProps> = ({ userProfile }) => {
  const [isVisible, setIsVisible] = useState(true);
  const [adFlavor, setAdFlavor] = useState(0);

  // Free Tier users only see standard Banner and Interstitial ads
  const tier = userProfile?.tier || 'free';
  const shouldDisplay = tier === 'free' && isVisible;

  // Cycle through a few highly polished simulated sponsor ads to make the app feel alive and extremely realistic
  const ADS = [
    {
      title: "Design Premium UI Designs with AI Studio Builder",
      description: "Convert natural language directly into responsive, production-ready web interfaces instantly.",
      cta: "Build App Now",
      accent: "from-blue-600 to-indigo-600",
      link: "https://ai.studio/build"
    },
    {
      title: "Upgrade to Ad-Free Sonic Generations",
      description: "Unchain your creative threshold. Secure V-Astra Premium Plus, Pro, or Ultra for zero interruptions.",
      cta: "Upgrade Plan",
      accent: "from-orange-500 to-red-600",
      link: "#upgrade-section"
    },
    {
      title: "Harness Gemini Pro 1.5 Models",
      description: "Embed state-of-the-art vision, audio, text understanding and logic layers in seconds.",
      cta: "Learn More",
      accent: "from-purple-600 to-pink-600",
      link: "https://ai.google.dev"
    }
  ];

  useEffect(() => {
    // Select random ad creative on load
    setAdFlavor(Math.floor(Math.random() * ADS.length));
  }, []);

  if (!shouldDisplay) return null;

  const activeAd = ADS[adFlavor];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 30 }}
        className="w-full max-w-2xl mx-auto mt-6 bg-neutral-950/90 border border-white/5 rounded-2xl overflow-hidden shadow-lg relative z-30"
      >
        {/* AdMob Test Unit ID Badge Indicator */}
        <div className="bg-[#FFCC00]/10 border-b border-white/5 px-4 py-1.5 flex items-center justify-between text-[10px] font-mono select-none">
          <div className="flex items-center gap-1.5">
            <span className="bg-[#FFCC00] text-black font-extrabold px-1 rounded-sm text-[9px] uppercase tracking-wide">
              Ad
            </span>
            <span className="text-white/40">AdMob Test ID:</span>
            <code className="text-[#FFCC00] font-bold">{ADMOB_CONFIG.BANNER_AD_UNIT_ID}</code>
          </div>
          <button
            onClick={() => setIsVisible(false)}
            className="text-white/30 hover:text-white hover:bg-white/5 p-1 rounded-full transition-colors"
            title="Dismiss Ad"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Sponsor Content Layout */}
        <div className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 text-left">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${activeAd.accent} flex items-center justify-center shrink-0 shadow-md`}>
              <Megaphone className="w-5 h-5 text-white" />
            </div>
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-white tracking-tight flex items-center gap-1.5 leading-tight">
                {activeAd.title}
                <Sparkles className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
              </h4>
              <p className="text-[11px] text-white/50 leading-relaxed font-sans max-w-md">
                {activeAd.description}
              </p>
            </div>
          </div>

          <a
            href={activeAd.link}
            onClick={(e) => {
              if (activeAd.link.startsWith('#')) {
                e.preventDefault();
                const el = document.getElementById(activeAd.link.substring(1));
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }
            }}
            target={activeAd.link.startsWith('http') ? "_blank" : undefined}
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-4 py-2 bg-white/10 hover:bg-white/15 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all duration-300 text-center shrink-0 border border-white/5 flex items-center justify-center gap-2 group"
          >
            <span>{activeAd.cta}</span>
            <ExternalLink className="w-3.5 h-3.5 text-white/50 group-hover:text-white transition-colors" />
          </a>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
