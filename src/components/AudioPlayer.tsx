import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Download, Share2, Save, Trash2, Heart, Sparkles, X, Gift, ThumbsUp, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Visualizer } from './Visualizer';
import { cn } from '../lib/utils';
import { auth, db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/utils';
import { ADMOB_CONFIG, admobManager } from '../lib/admob';
import confetti from 'canvas-confetti';

interface AudioPlayerProps {
  track: {
    audioUrl: string;
    lyrics?: string;
    prompt: string;
    genre: string;
    apiUsed?: string;
  } | null;
  userProfile: any;
  onSave?: (track: any) => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ track, userProfile, onSave }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // AdMob Rewarded Ad Simulation States
  const [showRewardedAd, setShowRewardedAd] = useState(false);
  const [rewardSecondsLeft, setRewardSecondsLeft] = useState(5);
  const [isRewardAchieved, setIsRewardAchieved] = useState(false);
  const [rewardAction, setRewardAction] = useState<'download' | 'save' | null>(null);

  useEffect(() => {
    setIsPlaying(false);
    setIsSaved(false);
    setIsRewardAchieved(false);
    setRewardAction(null);
  }, [track]);

  // Timer countdown for Rewarded Ad
  useEffect(() => {
    let timer: any;
    if (showRewardedAd && rewardSecondsLeft > 0) {
      timer = setTimeout(() => {
        setRewardSecondsLeft(prev => prev - 1);
      }, 1000);
    } else if (showRewardedAd && rewardSecondsLeft === 0) {
      setIsRewardAchieved(true);
    }
    return () => clearTimeout(timer);
  }, [showRewardedAd, rewardSecondsLeft]);

  if (!track) return null;

  const togglePlay = () => {
    if (audioRef.current?.paused) {
      audioRef.current.play();
      setIsPlaying(true);
    } else {
      audioRef.current?.pause();
      setIsPlaying(false);
    }
  };

  const executeDownload = () => {
    const link = document.createElement('a');
    link.href = track.audioUrl;
    link.download = `lyria-${track.genre.toLowerCase()}-${Date.now()}.wav`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadClick = () => {
    const tier = userProfile?.tier || "free";
    if (tier === "free") {
      setRewardSecondsLeft(5);
      setIsRewardAchieved(false);
      setRewardAction('download');
      setShowRewardedAd(true);

      // Trigger native Google Play AdMob SDK
      admobManager.showRewarded(
        () => {
          setIsRewardAchieved(true);
        },
        () => {
          console.log("[AdMob SDK] Rewarded video ad session complete.");
        }
      );
    } else {
      executeDownload();
    }
  };

  const executeSave = async () => {
    if (!auth.currentUser) return;
    setIsSaving(true);
    try {
      const trackData = {
        userId: auth.currentUser.uid,
        prompt: track.prompt,
        genre: track.genre,
        lyrics: track.lyrics || "",
        createdAt: serverTimestamp(),
        audioUrl: track.audioUrl 
      };
      
      await addDoc(collection(db, 'tracks'), trackData);
      setIsSaved(true);
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      onSave?.(trackData);
    } catch (err) {
      handleFirestoreError(auth, err, OperationType.CREATE, 'tracks');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    if (!auth.currentUser) {
      alert("Please sign in to save tracks.");
      return;
    }
    
    const tier = userProfile?.tier || "free";
    if (tier === "free") {
      setRewardSecondsLeft(5);
      setIsRewardAchieved(false);
      setRewardAction('save');
      setShowRewardedAd(true);

      // Trigger native Google Play AdMob SDK
      admobManager.showRewarded(
        () => {
          setIsRewardAchieved(true);
        },
        () => {
          console.log("[AdMob SDK] Rewarded video ad session complete.");
        }
      );
    } else {
      await executeSave();
    }
  };

  const claimRewardAndProcess = () => {
    setShowRewardedAd(false);
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.6 }
    });
    
    if (rewardAction === 'save') {
      executeSave();
    } else {
      executeDownload();
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Check out this AI track from Lyria Sonic Lab!',
        text: `Genre: ${track.genre}\nPrompt: ${track.prompt}`,
        url: window.location.href,
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Link copied to clipboard!");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-2xl mx-auto mt-8 p-8 rounded-3xl bg-black/40 backdrop-blur-2xl border border-white/10 shadow-3xl space-y-6"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded-full text-xs font-bold uppercase tracking-wider inline-block mb-2">
            {track.genre} Masterpiece
          </span>
          <h3 className="text-2xl font-bold text-white tracking-tight leading-snug">V-Astra Synthesis</h3>
          <p className="text-white/50 text-sm italic mt-1 font-sans">"{track.prompt}"</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleDownloadClick}
            className="p-3.5 rounded-2xl bg-white/5 hover:bg-orange-500 hover:text-white text-white transition-all duration-300"
            title="Download WAV Track"
          >
            <Download className="w-5 h-5" />
          </button>
          <button
            onClick={handleShare}
            className="p-3.5 rounded-2xl bg-white/5 hover:bg-neutral-800 text-white transition-all duration-300"
            title="Share"
          >
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="bg-black/35 rounded-2xl p-6 border border-white/5">
        <Visualizer audioElement={audioRef.current} isPlaying={isPlaying} />
      </div>

      <div className="flex flex-col items-center gap-4">
        <audio
          ref={audioRef}
          src={track.audioUrl}
          onEnded={() => setIsPlaying(false)}
          className="hidden"
        />

        <button
          onClick={togglePlay}
          className="w-20 h-20 rounded-full bg-orange-500 flex items-center justify-center text-white shadow-xl shadow-orange-500/35 hover:scale-105 active:scale-95 transition-all duration-300 pointer"
        >
          {isPlaying ? <Pause className="w-10 h-10" /> : <Play className="w-10 h-10 ml-1" />}
        </button>

        <div className="w-full flex flex-col sm:flex-row gap-4 items-center justify-between border-t border-white/5 pt-4">
          <button
            onClick={handleSave}
            disabled={isSaving || isSaved}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all text-xs uppercase tracking-wider",
              isSaved 
                ? "bg-green-500/10 text-green-400 border border-green-500/40"
                : "bg-white/5 hover:bg-white/10 text-white border border-white/10"
            )}
          >
            {isSaved ? <ThumbsUp className="w-4 h-4 fill-current" /> : <Heart className="w-4 h-4" />}
            {isSaving ? "Saving..." : isSaved ? "Saved to Studio" : "Save to Studio"}
          </button>

          {track.apiUsed && (
            <div className="text-[10px] bg-white/[0.03] border border-white/5 px-3.5 py-1.5 rounded-full font-mono text-white/50">
              Generated via: <span className="text-orange-400">{track.apiUsed}</span>
            </div>
          )}
        </div>
      </div>

      {track.lyrics && (
        <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 text-center">
          <span className="text-[9px] font-mono tracking-widest text-white/30 uppercase block mb-3">AI Poetry / Lyrics Context</span>
          <p className="text-sm text-white/70 whitespace-pre-line leading-relaxed max-h-40 overflow-y-auto font-sans italic">
            {track.lyrics}
          </p>
        </div>
      )}

      {/* Interactive AdMob Rewarded Ad Simulation */}
      <AnimatePresence>
        {showRewardedAd && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/95 p-4 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-sm bg-neutral-900 border border-white/15 rounded-3xl p-8 overflow-hidden shadow-2xl"
              id="rewarded-admob-modal"
            >
              {/* Ad Unit ID Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono text-[9px] font-bold tracking-widest uppercase rounded">
                    Rewarded AdMob Spot
                  </span>
                </div>
                <button 
                  onClick={() => setShowRewardedAd(false)}
                  className="p-1 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all focus:outline-none"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-black/35 border border-white/5 p-3 rounded-xl mb-5 text-[10px] font-mono text-white/50 text-center">
                Ad Unit ID: <code className="text-[#FFCC00] font-bold">{ADMOB_CONFIG.REWARDED_AD_UNIT_ID}</code>
              </div>

              <div className="space-y-6 text-center">
                <div className="w-16 h-16 bg-gradient-to-tr from-green-400 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg mx-auto">
                  <Gift className="w-10 h-10 text-white animate-pulse" />
                </div>
                
                <div className="space-y-2">
                  <h4 className="text-lg font-bold text-white tracking-tight">
                    {rewardAction === 'save' ? 'Unlock Track Saving' : 'Unlock High-Quality WAV Download'}
                  </h4>
                  <p className="text-xs text-white/60 leading-relaxed font-sans">
                    {rewardAction === 'save' 
                      ? `Watch this professional test message for just ${rewardSecondsLeft} more seconds to authorize saving this masterwork back to your active studio profile!` 
                      : `Watch this short sponsor message for just ${rewardSecondsLeft} more seconds to obtain unrestricted WAV downloads of your track.`}
                  </p>
                </div>

                {isRewardAchieved ? (
                  <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-center space-y-3">
                    <span className="text-sm font-bold text-emerald-400 flex items-center justify-center gap-2">
                      🎉 Reward Authenticated!
                    </span>
                    <button
                      onClick={claimRewardAndProcess}
                      className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-extrabold text-xs rounded-xl transition-all uppercase tracking-widest"
                    >
                      {rewardAction === 'save' ? 'Save Masterpiece Now' : 'Download Track Now'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="text-4xl font-extrabold text-orange-400 font-mono">
                      {rewardSecondsLeft}s
                    </div>
                    {/* Countdown bar */}
                    <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: "100%" }}
                        animate={{ width: "0%" }}
                        transition={{ duration: 5, ease: "linear" }}
                        className="bg-green-500 h-full"
                      />
                    </div>
                    <p className="text-[10px] text-white/30 italic">Securing verified download keys...</p>
                  </div>
                )}

                <div className="pt-4 border-t border-white/5 mt-4 text-left">
                  <span className="text-[10px] text-white/40 block text-center">Want unlimited ad-free tracks instantly?</span>
                  <button
                    onClick={() => {
                      alert("Simply select V-Astra Premium Plus, Pro or Ultra in the dashboard to fully skip ads!");
                      setShowRewardedAd(false);
                      if (rewardAction === 'save') {
                        executeSave();
                      } else {
                        executeDownload();
                      }
                    }}
                    className="w-full text-center text-xs text-orange-400 hover:text-orange-300 font-bold underline transition-all mt-1"
                  >
                    Go Premium for ₹299/mo
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
