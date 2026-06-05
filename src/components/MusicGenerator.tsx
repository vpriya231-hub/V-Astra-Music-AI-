import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Music, Sparkles, Loader2, Music2, AlertCircle, Play, Eye, X, ShieldAlert } from 'lucide-react';
import { GENRES } from '../lib/constants';
import { cn } from '../lib/utils';
import { ADMOB_CONFIG, admobManager } from '../lib/admob';
import confetti from 'canvas-confetti';

interface MusicGeneratorProps {
  onTrackGenerated: (track: { audioUrl: string, lyrics: string, prompt: string, genre: string, apiUsed?: string }) => void;
  userProfile: any;
  onIncrementGenerations: () => Promise<boolean>;
}

export const MusicGenerator: React.FC<MusicGeneratorProps> = ({ 
  onTrackGenerated, 
  userProfile, 
  onIncrementGenerations 
}) => {
  const [prompt, setPrompt] = useState("");
  const [selectedGenre, setSelectedGenre] = useState(GENRES[0]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // AdMob Interstitial Ad Simulation States
  const [showInterstitial, setShowInterstitial] = useState(false);
  const [adSecondsLeft, setAdSecondsLeft] = useState(5);
  const [canCloseAd, setCanCloseAd] = useState(false);

  // Active limit settings based on profile tier
  const tier = userProfile?.tier || "free";
  const limits: Record<string, { daily: number, monthly: number }> = {
    free: { daily: 1, monthly: 30 },
    plus: { daily: 3, monthly: 90 },
    pro: { daily: 5, monthly: 150 },
    ultra: { daily: 10, monthly: 300 }
  };

  const activeLimits = limits[tier] || limits.free;
  const todayGenerations = userProfile?.dailyGenerations || 0;
  const remainingDaily = Math.max(0, activeLimits.daily - todayGenerations);

  const getAPIModelName = () => {
    switch (tier) {
      case "free": return "Hugging Face (MusicGen Small / Gemini Fallback)";
      case "plus": return "Hugging Face API Key Model (facebook/musicgen-small)";
      case "pro": return "Gemini Pay-as-you-go API (lyria-3-clip-preview)";
      case "ultra": return "Gemini Pay-as-you-go API (lyria-3-clip-preview)";
      default: return "Hugging Face API";
    }
  };

  // Timer countdown for Interstitial Ad
  useEffect(() => {
    let timer: any;
    if (showInterstitial && adSecondsLeft > 0) {
      timer = setTimeout(() => {
        setAdSecondsLeft(prev => prev - 1);
      }, 1000);
    } else if (showInterstitial && adSecondsLeft === 0) {
      setCanCloseAd(true);
    }
    return () => clearTimeout(timer);
  }, [showInterstitial, adSecondsLeft]);

  const handleGenerateClick = () => {
    if (!userProfile) {
      setError("Please sign in to start creating music.");
      return;
    }
    if (!prompt.trim()) return;
    setError(null);

    // 1. Pre-check daily quota
    if (todayGenerations >= activeLimits.daily) {
      setError(`Daily Quota Exceeded! Your [${tier.toUpperCase()}] plan allows a maximum of ${activeLimits.daily} generation per day. Please select a premium tier in the Plan Center below!`);
      return;
    }

    // 2. Trigger Interstitial Ad if on Free Tier
    if (tier === "free") {
      setAdSecondsLeft(5);
      setCanCloseAd(false);
      setShowInterstitial(true);
      
      // Trigger native SDK bridge
      admobManager.showInterstitial(() => {
        console.log("[AdMob SDK] Native Interstitial Ad event closed/completed.");
      });
    } else {
      // Premium skips ads
      proceedWithGeneration();
    }
  };

  const proceedWithGeneration = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      // Call standard increment hook
      const success = await onIncrementGenerations();
      if (!success) {
        setIsGenerating(false);
        return;
      }

      const res = await fetch("/api/generate-music", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          genre: selectedGenre,
          tier: tier
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate music");
      }

      const binary = atob(data.audioBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: data.mimeType || "audio/wav" });
      const audioUrl = URL.createObjectURL(blob);

      confetti({
        particleCount: 120,
        spread: 60,
        origin: { y: 0.8 }
      });

      onTrackGenerated({ 
        audioUrl, 
        lyrics: data.lyrics || "", 
        prompt, 
        genre: selectedGenre,
        apiUsed: data.apiUsed
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to generate music. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCloseAd = () => {
    if (!canCloseAd) return;
    setShowInterstitial(false);
    proceedWithGeneration();
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-8 p-8 rounded-3xl bg-neutral-900/60 backdrop-blur-xl border border-white/10 shadow-3xl">
      {/* active plan metadata status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white/[0.03] border border-white/5">
        <div>
          <span className="text-[10px] font-bold text-orange-400 uppercase tracking-widest block mb-0.5">Active Studio Profile</span>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold uppercase text-white bg-white/10 px-2.5 py-0.5 rounded-full border border-white/10 shadow-sm">
              {tier} Tier
            </span>
            <span className="text-xs text-white/40">
              {remainingDaily} of {activeLimits.daily} remaining today
            </span>
          </div>
        </div>
        <div className="text-left sm:text-right border-t sm:border-t-0 border-white/5 pt-2 sm:pt-0">
          <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest block mb-0.5">API Engine</span>
          <span className="text-[11px] font-mono font-medium text-white/60 truncate max-w-xs block">
            {getAPIModelName()}
          </span>
        </div>
      </div>

      <div className="space-y-4">
        <label className="text-xs font-semibold text-white/50 uppercase tracking-wider flex items-center gap-2">
          <Music className="w-4 h-4 text-orange-500" /> Convert Imagination to Music
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          disabled={!userProfile}
          placeholder={userProfile ? "Describe the mood, orchestration, tempo, or instruments... e.g., 'A rainy night in New Delhi with synthpop and electronic violin, high fidelity'" : "Please sign in to start creating music..."}
          className="w-full min-h-[120px] bg-black/35 border border-white/10 rounded-2xl p-4 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all resize-none font-sans disabled:opacity-50 disabled:cursor-not-allowed"
        />
      </div>

      <div className="space-y-4">
        <label className="text-xs font-semibold text-white/50 uppercase tracking-wider flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-orange-500" /> Select Genre Mode
        </label>
        <div className="flex flex-wrap gap-2">
          {GENRES.map((genre) => (
            <button
              key={genre}
              disabled={!userProfile}
              onClick={() => setSelectedGenre(genre)}
              className={cn(
                "px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-300 border disabled:opacity-50 disabled:cursor-not-allowed",
                selectedGenre === genre
                  ? "bg-orange-500 border-orange-400 text-white shadow-lg shadow-orange-500/30"
                  : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
              )}
            >
              {genre}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 flex items-start gap-3 text-sm"
          >
            <ShieldAlert className="w-5 h-5 flex-shrink-0 text-red-500 mt-0.5" />
            <div className="flex-1 space-y-1">
              <span className="font-semibold block">Generation Blocked</span>
              <span className="text-white/60 text-xs">{error}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={handleGenerateClick}
        disabled={isGenerating || !prompt.trim() || !userProfile}
        className={cn(
          "id-generate-button w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all duration-500 transform active:scale-[0.98]",
          isGenerating || !userProfile
            ? "bg-orange-500/40 cursor-not-allowed text-white/50"
            : "bg-orange-500 hover:bg-orange-600 text-white shadow-lg hover:shadow-orange-500/20"
        )}
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-6 h-6 animate-spin" />
            Synthesizing Sonic Layers...
          </>
        ) : (
          <>
            <Music2 className="w-6 h-6" />
            {userProfile ? "Generate Track" : "Sign In to Unlock Generator"}
          </>
        )}
      </button>

      {/* Interactive AdMob Interstitial Ad Simulation */}
      <AnimatePresence>
        {showInterstitial && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 p-4 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-md bg-zinc-900 border border-white/15 rounded-3xl p-8 overflow-hidden shadows-2xl"
            >
              {/* Ad Header Info */}
              <div className="flex items-center justify-between mb-4">
                <span className="px-2.5 py-0.5 bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 font-mono text-[9px] font-bold tracking-widest uppercase rounded">
                  Sponsored AdMob Ad
                </span>
                {canCloseAd ? (
                  <button 
                    onClick={handleCloseAd}
                    className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"
                  >
                    <X className="w-5 h-5" />
                  </button>
                ) : (
                  <span className="text-xs font-mono text-white/50 bg-white/5 px-2.5 py-1 rounded-full">
                    Ad Closes in {adSecondsLeft}s
                  </span>
                )}
              </div>

              <div className="bg-black/35 border border-white/5 p-3 rounded-xl mb-6 text-[10px] font-mono text-white/50 text-center">
                Ad Unit ID: <code className="text-[#FFCC00] font-bold">{ADMOB_CONFIG.INTERSTITIAL_AD_UNIT_ID}</code>
              </div>

              {/* Ad Visual Body */}
              <div className="space-y-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-tr from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg mx-auto">
                  <Sparkles className="w-10 h-10 text-white animate-bounce" />
                </div>
                
                <div className="space-y-2">
                  <h4 className="text-xl font-bold text-white tracking-tight">Upgrade to V-Astra Plus</h4>
                  <p className="text-xs text-white/60 leading-relaxed">
                    Tired of sponsored interruptions? Upgrade to V-Astra Premium slots! Get up to 10 high-fidelity generations every day, zero ads, and instant WAV downloads.
                  </p>
                </div>

                <div className="p-4 bg-white/5 rounded-2xl text-left border border-white/5 space-y-1">
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider block">Exclusive Premium Perks</span>
                  <p className="text-xs text-white/80">• Dynamic high fidelity Lyria v3 models</p>
                  <p className="text-xs text-white/80">• Fully unlimited download permissions</p>
                  <p className="text-xs text-white/80">• Immediate priority synthesis</p>
                </div>

                {/* Progress Bar of countdown */}
                <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: "100%" }}
                    animate={{ width: "0%" }}
                    transition={{ duration: 5, ease: "linear" }}
                    className="bg-orange-500 h-full"
                  />
                </div>

                {/* Ad Conversion Hook Button */}
                <button
                  onClick={() => {
                    alert("Mock Upgrade Clicked! Select 'Plus', 'Pro' or 'Ultra' in the plan dashboard below to permanently unlock ad-free generations.");
                    setShowInterstitial(false);
                    proceedWithGeneration();
                  }}
                  className="w-full py-3.5 bg-white text-black font-bold text-sm rounded-xl hover:bg-orange-500 hover:text-white transition-all transform active:scale-95"
                >
                  UPGRADE FOR ₹299/MO ONLY
                </button>

                {canCloseAd && (
                  <button
                    onClick={handleCloseAd}
                    className="text-xs text-white/40 hover:text-white underline transition-all mt-4"
                  >
                    Skip & Continue to Track
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
