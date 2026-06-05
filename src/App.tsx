import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import { collection, query, where, orderBy, onSnapshot, doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Music2, LogIn, LogOut, Library, Sparkles, AlertCircle, Info, Zap, Shield, Crown, RefreshCw, X } from 'lucide-react';
import { auth, db } from './lib/firebase';
import { MusicGenerator } from './components/MusicGenerator';
import { AudioPlayer } from './components/AudioPlayer';
import { LoginScreen } from './components/LoginScreen';
import { GooglePlayBillingSheet } from './components/GooglePlayBillingSheet';
import { BannerAd } from './components/BannerAd';
import { billingService } from './lib/revenuecat';
import { admobManager } from './lib/admob';
import { cn, handleFirestoreError, OperationType } from './lib/utils';
import confetti from 'canvas-confetti';

interface UserProfile {
  userId: string;
  tier: 'free' | 'plus' | 'pro' | 'ultra';
  dailyGenerations: number;
  monthlyGenerations: number;
  lastGenerationDate: string;
  lastGenerationMonth: string;
  updatedAt: any;
}

export const STUDIO_LIMITS = {
  free: { daily: 1, monthly: 30 },
  plus: { daily: 3, monthly: 90 },
  pro: { daily: 5, monthly: 150 },
  ultra: { daily: 10, monthly: 300 }
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [currentTrack, setCurrentTrack] = useState<any>(null);
  const [savedTracks, setSavedTracks] = useState<any[]>([]);
  const [showLibrary, setShowLibrary] = useState(false);
  
  // Subscription state
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isUpgrading, setIsUpgrading] = useState(false);

  // GPlay & RevenueCat Billing State variables
  const [activeBillingTier, setActiveBillingTier] = useState<'plus' | 'pro' | 'ultra' | null>(null);
  const [activeBillingPrice, setActiveBillingPrice] = useState<string>('');
  const [billingStatusMessage, setBillingStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Auth Tracker & AdMob Initialization
  useEffect(() => {
    admobManager.initialize();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  // Google Play Billing / RevenueCat Auto-Restore purchases listener on launch/update
  useEffect(() => {
    if (!user) return;
    
    const verifyAndRestoreUserPurchasesOnLaunch = async () => {
      console.log(`[V-Astra Billing] Initiating secure startup Google Play purchases check for user: ${user.uid}`);
      try {
        const restoredTier = await billingService.autoRestoreActivePlan(user.uid);
        if (restoredTier) {
          console.log(`[V-Astra Billing] Auto-restored active entitlement: ${restoredTier}`);
        }
      } catch (err) {
        console.warn(`[V-Astra Billing] Background auto-restore check bypassed:`, err);
      }
    };

    verifyAndRestoreUserPurchasesOnLaunch();
  }, [user]);

  // Reactive Firestore tracks sync
  useEffect(() => {
    if (!user) {
      setSavedTracks([]);
      return;
    }

    const q = query(
      collection(db, 'tracks'),
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const tracks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setSavedTracks(tracks);
      },
      (error) => {
        handleFirestoreError(auth, error, OperationType.GET, 'tracks');
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Reactive Firestore plan profile sync
  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }

    // Set up snapshot listener to load or bootstrap profile
    const profileRef = doc(db, 'userProfiles', user.uid);
    const unsubscribeProfile = onSnapshot(
      profileRef,
      async (docSnap) => {
        if (docSnap.exists()) {
          setProfile(docSnap.data() as UserProfile);
        } else {
          // Bootstrap new user to free plan
          const todayStr = new Date().toISOString().split('T')[0];
          const monthStr = todayStr.substring(0, 7);
          const defaultProfile: UserProfile = {
            userId: user.uid,
            tier: 'free',
            dailyGenerations: 0,
            monthlyGenerations: 0,
            lastGenerationDate: todayStr,
            lastGenerationMonth: monthStr,
            updatedAt: serverTimestamp()
          };
          try {
            await setDoc(profileRef, defaultProfile);
            setProfile(defaultProfile);
          } catch (err) {
            console.error("Critical error building profile: ", err);
          }
        }
      },
      (error) => {
        handleFirestoreError(auth, error, OperationType.GET, `userProfiles/${user.uid}`);
      }
    );

    return () => unsubscribeProfile();
  }, [user]);

  const handleSignIn = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error(error);
    }
  };

  const handleSignOut = () => signOut(auth);

  // Checks and performs atomic increments of generations while complying with limits
  const handleIncrementGenerations = async (): Promise<boolean> => {
    if (!profile) return false;

    const todayStr = new Date().toISOString().split('T')[0];
    const monthStr = todayStr.substring(0, 7);

    const tier = profile.tier as 'free' | 'plus' | 'pro' | 'ultra';
    const activeLimits = STUDIO_LIMITS[tier] || STUDIO_LIMITS.free;

    let dailyCount = profile.dailyGenerations || 0;
    let monthlyCount = profile.monthlyGenerations || 0;

    // Daily timezone reset triggers
    if (profile.lastGenerationDate !== todayStr) {
      dailyCount = 0;
    }
    // Monthly rollover triggers
    if (profile.lastGenerationMonth !== monthStr) {
      monthlyCount = 0;
    }

    if (dailyCount >= activeLimits.daily) {
      alert(`Limit Blocked: Your active [${profile.tier.toUpperCase()}] plan allows max ${activeLimits.daily} generation per day. Please select a premium tier below!`);
      return false;
    }

    if (monthlyCount >= activeLimits.monthly) {
      alert(`Limit Blocked: Your active [${profile.tier.toUpperCase()}] plan allows max ${activeLimits.monthly} generations per month. Please select a premium tier below!`);
      return false;
    }

    const updatedProfile = {
      dailyGenerations: dailyCount + 1,
      monthlyGenerations: monthlyCount + 1,
      lastGenerationDate: todayStr,
      lastGenerationMonth: monthStr,
    };

    if (user && profile.userId !== 'guest') {
      try {
        const profileRef = doc(db, 'userProfiles', user.uid);
        await updateDoc(profileRef, {
          ...updatedProfile,
          updatedAt: serverTimestamp()
        });
      } catch (err) {
        console.error("Firestore status record issue: ", err);
        return false;
      }
    } else {
      // In-memory update for offline guests
      setProfile(prev => prev ? {
        ...prev,
        ...updatedProfile,
        updatedAt: new Date()
      } : null);
    }

    return true;
  };

  // Triggers the Google Play Billing prompt or directly downgrades to Free
  const handleSwitchPlan = async (newTier: 'free' | 'plus' | 'pro' | 'ultra', priceText: string = '₹0') => {
    if (!profile) return;
    setBillingStatusMessage(null);

    if (newTier === 'free') {
      // Downgrading to Free plan can be applied directly
      setIsUpgrading(true);
      try {
        const todayStr = new Date().toISOString().split('T')[0];
        const monthStr = todayStr.substring(0, 7);

        const updatedPayload = {
          tier: 'free' as const,
          dailyGenerations: 0,
          monthlyGenerations: 0,
          lastGenerationDate: todayStr,
          lastGenerationMonth: monthStr,
          updatedAt: serverTimestamp()
        };

        if (user && profile.userId !== 'guest') {
          const profileRef = doc(db, 'userProfiles', user.uid);
          await updateDoc(profileRef, {
            ...updatedPayload,
            updatedAt: serverTimestamp()
          });
        }
        
        setBillingStatusMessage({
          text: 'Downgraded to Free tier. Your daily limits have been reset.',
          type: 'success'
        });
      } catch (err) {
        console.error("Failed to downgrade plan: ", err);
        setBillingStatusMessage({
          text: 'Failed to complete downgrade operation.',
          type: 'error'
        });
      } finally {
        setIsUpgrading(false);
      }
    } else {
      // Show Google Play Billing / RevenueCat payment modal prompt
      setActiveBillingTier(newTier);
      setActiveBillingPrice(priceText);
    }
  };

  const handleBillingSuccess = (purchasedTier: 'plus' | 'pro' | 'ultra') => {
    setActiveBillingTier(null);
    setBillingStatusMessage({
      text: `Subscription Upgrade Successful! Welcome to V-Astra Sonic ${purchasedTier.toUpperCase()}. Enjoy your expanded quotas.`,
      type: 'success'
    });
    
    // Confetti celebration!
    confetti({
      particleCount: 200,
      spread: 100,
      origin: { y: 0.3 }
    });
  };

  const handleBillingCancel = (errorMsg?: string) => {
    setActiveBillingTier(null);
    setBillingStatusMessage({
      text: errorMsg || 'Subscription upgrade was cancelled or failed. You remain on the Free plan.',
      type: 'error'
    });
  };

  // Perform manual safe restore check of previously completed payments
  const handleRestorePurchases = async () => {
    if (!user) {
      setBillingStatusMessage({
        text: 'Please sign in to run security restoration procedures.',
        type: 'error'
      });
      return;
    }

    setIsUpgrading(true);
    setBillingStatusMessage(null);

    try {
      const result = await billingService.restorePurchases(user.uid);
      if (result.success && result.restoredTier) {
        setBillingStatusMessage({
          text: result.message,
          type: 'success'
        });

        // Trigger premium user celebration confetti
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.35 }
        });
      } else {
        setBillingStatusMessage({
          text: result.message || 'No active subscription purchases matched this Google Play account.',
          type: 'error'
        });
      }
    } catch (err: any) {
      console.error(err);
      setBillingStatusMessage({
        text: `Play billing restoration failed: ${err.message || err}`,
        type: 'error'
      });
    } finally {
      setIsUpgrading(false);
    }
  };

  // Plans config map for rendering the billing grids
  const PLAN_OPTIONS = [
    {
      id: "free" as const,
      name: "Free",
      price: "₹0",
      period: "forever",
      limitText: "1 Track / Day",
      monthlyLimit: "30 / Month",
      icon: Shield,
      color: "border-neutral-800 text-neutral-400 bg-black/40",
      glowColor: "rgba(115, 115, 115, 0.1)",
      apiName: "Hugging Face API",
      features: ["Slow queue synthesis", "Google AdMob Sponsored ads enabled", "Simulated WAV Downloads"]
    },
    {
      id: "plus" as const,
      name: "Plus",
      price: "₹299",
      period: "mo",
      limitText: "3 Tracks / Day",
      monthlyLimit: "90 / Month",
      icon: Zap,
      color: "border-orange-500/30 text-orange-400 bg-orange-950/10",
      glowColor: "rgba(249, 115, 22, 0.15)",
      apiName: "Hugging Face Custom API Key",
      features: ["Zero sponsored ads", "Speedy generation queues", "Unlimited direct downloads", "WAV digital outputs"]
    },
    {
      id: "pro" as const,
      name: "Pro",
      price: "₹699",
      period: "mo",
      limitText: "5 Tracks / Day",
      monthlyLimit: "150 / Month",
      icon: Crown,
      color: "border-indigo-500/30 text-indigo-400 bg-indigo-950/10",
      glowColor: "rgba(99, 102, 241, 0.15)",
      apiName: "Gemini Pay-As-You-Go API",
      features: ["Google Lyria v3 sound model", "Dynamic orchestral range", "Superfast processing", "Commercial rights"]
    },
    {
      id: "ultra" as const,
      name: "Ultra",
      price: "₹1299",
      period: "mo",
      limitText: "10 Tracks / Day",
      monthlyLimit: "300 / Month",
      icon: Sparkles,
      color: "border-amber-500/40 text-amber-400 bg-amber-950/10",
      glowColor: "rgba(245, 158, 11, 0.2)",
      apiName: "Gemini Pro Audio API",
      features: ["Highest dimensional Lyria v3", "Max daily bandwidth (300/mo)", "VIP immediate assistance", "Dedicated masterings"]
    }
  ];

  if (loadingAuth) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center font-sans">
        <div className="text-center space-y-4">
          <RefreshCw className="w-8 h-8 animate-spin text-orange-500 mx-auto" />
          <p className="text-sm font-mono tracking-widest text-white/40 uppercase">Restoring Sonic Studio Session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-orange-500/30">
        {/* Background Ambience */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[40%] bg-orange-600/15 blur-[120px] rounded-full animate-pulse" />
          <div className="absolute top-[30%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[150px] rounded-full" />
        </div>

        {/* Navigation Rail */}
        <header className="relative z-50 border-b border-white/5 bg-black/25 backdrop-blur-md px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Music2 className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">V-Astra Music AI</h1>
          </div>

          <nav className="flex items-center gap-4">
            <button
              onClick={handleSignIn}
              className="flex items-center gap-2 px-6 py-2.5 bg-white text-black rounded-full text-xs font-bold uppercase tracking-widest hover:bg-orange-500 hover:text-white transition-all transform active:scale-95 duration-300"
            >
              <LogIn className="w-4 h-4" />
              Sign In
            </button>
          </nav>
        </header>

        {/* User Status Prompt Bar */}
        <div className="relative z-50 bg-orange-500/10 border-b border-orange-500/20 py-2.5 px-6 text-center text-xs font-medium text-orange-300 flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4" />
          <span>Please sign in to start creating music</span>
        </div>

        <main className="relative z-10 container mx-auto px-6 py-12">
          <LoginScreen onSignIn={handleSignIn} />
        </main>

        <footer className="relative z-10 py-12 border-t border-white/5 mt-20">
          <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2 opacity-30">
              <Music2 className="w-5 h-5" />
              <span className="text-xs font-mono tracking-widest uppercase">Powered by Lyria 3 Pro</span>
            </div>
            <div className="flex flex-wrap items-center gap-6 text-[11px] font-semibold uppercase tracking-wider">
               <a 
                 href="https://sites.google.com/view/v-astra-music-ai-privacy/home" 
                 target="_blank" 
                 rel="noopener noreferrer"
                 className="text-white/40 hover:text-orange-400 hover:underline transition-all duration-300"
               >
                 Privacy Policy
               </a>
               <a 
                 href="https://sites.google.com/view/vastramusicaitermsconditions/home" 
                 target="_blank" 
                 rel="noopener noreferrer"
                 className="text-white/40 hover:text-orange-400 hover:underline transition-all duration-300"
               >
                 Terms & Conditions
               </a>
               <span className="text-white/10 hidden md:inline">|</span>
               <span className="text-white/30 font-medium tracking-normal lowercase">v-astra studio</span>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-orange-500/30">
      {/* Background Ambience */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[40%] bg-orange-600/15 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute top-[30%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 blur-[150px] rounded-full" />
      </div>

      {/* Navigation Rail */}
      <header className="relative z-50 border-b border-white/5 bg-black/25 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
            <Music2 className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">V-Astra Music AI</h1>
        </div>

        <nav className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowLibrary(!showLibrary)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-full transition-all text-xs font-bold uppercase tracking-wider",
                  showLibrary ? "bg-orange-500 text-white" : "bg-white/5 hover:bg-white/10"
                )}
              >
                <Library className="w-4 h-4" />
                Library ({savedTracks.length})
              </button>
              <div className="flex items-center gap-2 pl-4 border-l border-white/10">
                <img src={user.photoURL || ""} className="w-8 h-8 rounded-full border border-white/20" alt="avatar" />
                <button 
                  onClick={handleSignOut} 
                  className="p-2 hover:bg-white/5 rounded-lg transition-all" 
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4 text-white/40" />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={handleSignIn}
              className="flex items-center gap-2 px-6 py-2.5 bg-white text-black rounded-full text-xs font-bold uppercase tracking-widest hover:bg-orange-500 hover:text-white transition-all transform active:scale-95 duration-300"
            >
              <LogIn className="w-4 h-4" />
              Sign In
            </button>
          )}
        </nav>
      </header>

      {/* User Status Prompt Bar */}
      {!user && (
        <div className="relative z-50 bg-orange-500/10 border-b border-orange-500/20 py-2.5 px-6 text-center text-xs font-medium text-orange-300 flex items-center justify-center gap-2">
          <Info className="w-4 h-4" />
          <span>You are exploring as a Guest. Sign in to save tracks permanently to your private audio cloud.</span>
        </div>
      )}

      <main className="relative z-10 container mx-auto px-6 py-12 flex flex-col items-center">
        {!showLibrary ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full space-y-12"
          >
            {/* Banner Display Heading */}
            <div className="text-center space-y-4 mb-8">
              <h2 className="text-5xl font-black tracking-tighter uppercase sm:text-7xl lg:text-8xl select-none leading-none">
                Dream in <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-600">Stereo</span>
              </h2>
              <p className="text-base text-white/50 max-w-xl mx-auto font-sans">
                A professional generative studio powered by Google Lyria and Hugging Face. Upgrade active plans reactively to modify API routing paths, remove ads, and expand daily slots.
              </p>
            </div>

            {/* Core Music Generator Module */}
            <MusicGenerator 
              onTrackGenerated={(track) => setCurrentTrack(track)} 
              userProfile={profile}
              onIncrementGenerations={handleIncrementGenerations}
            />

            {/* Waveform Player */}
            <AnimatePresence>
              {currentTrack && (
                <AudioPlayer 
                  key={currentTrack.audioUrl} 
                  track={currentTrack} 
                  userProfile={profile}
                />
              )}
            </AnimatePresence>

            {/* Google AdMob Banner Ad (Shown for Free Users only) */}
            <BannerAd userProfile={profile} />

            {/* Dynamic Interactive Subscription Plan Center Panel */}
            <section className="pt-12 border-t border-white/5">
              <div className="text-center space-y-3 mb-10">
                <span className="text-[10px] bg-orange-500/10 text-orange-400 px-3.5 py-1.5 rounded-full border border-orange-500/20 font-bold uppercase tracking-widest inline-block">
                  Studio Plan Center
                </span>
                <h3 className="text-3xl font-black uppercase tracking-tight">Expand Creative Capacities</h3>
                <p className="text-sm text-white/40 max-w-lg mx-auto">
                  Click a subscription slot below to dynamically upgrade / manage your studio profile. Test limits, dynamic routing, and ad workflows in real-time.
                </p>
              </div>

              {/* Billing Status Message Banner Alert */}
              {billingStatusMessage && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "max-w-2xl mx-auto mb-8 p-4 rounded-2xl border text-sm flex items-center gap-3",
                    billingStatusMessage.type === 'success'
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                      : "bg-red-500/10 border-red-500/20 text-red-300"
                  )}
                >
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span className="font-medium">{billingStatusMessage.text}</span>
                  <button 
                    onClick={() => setBillingStatusMessage(null)}
                    className="ml-auto text-white/40 hover:text-white p-1 hover:bg-white/5 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </motion.div>
              )}

              {/* Reactive Usage Indicators */}
              {profile && (
                <div className="max-w-2xl mx-auto mb-8 bg-neutral-900/40 border border-white/5 rounded-3xl p-6 flex flex-col md:flex-row items-center gap-6">
                  <div className="flex-1 space-y-3 w-full">
                    <div className="flex justify-between text-xs font-bold uppercase tracking-wider text-white/60">
                      <span>Daily Usage Meter ({profile.tier.toUpperCase()})</span>
                      <span>
                        {(profile.dailyGenerations || 0)} / {(STUDIO_LIMITS[profile.tier]?.daily || 1)} Tracks
                      </span>
                    </div>
                    {/* Progress slider scale */}
                    <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden">
                      <div 
                        style={{ width: `${Math.min(100, ((profile.dailyGenerations || 0) / (STUDIO_LIMITS[profile.tier]?.daily || 1)) * 100)}%` }} 
                        className="bg-gradient-to-r from-orange-500 to-red-500 h-full rounded-full transition-all duration-500"
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 font-mono text-xs text-white/40 bg-white/[0.02] border border-white/5 py-3 px-4 rounded-2xl">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-orange-400" />
                    <span>Resets every midnight (UTC)</span>
                  </div>
                </div>
              )}

              {/* Plans Grid layout */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-7xl mx-auto">
                {PLAN_OPTIONS.map((opt) => {
                  const isActive = profile?.tier === opt.id;
                  const IconComponent = opt.icon;
                  return (
                    <div 
                      key={opt.id}
                      style={{ boxShadow: isActive ? `0 10px 40px ${opt.glowColor}` : 'none' }}
                      className={cn(
                        "rounded-3xl p-6 border-2 flex flex-col justify-between transition-all duration-500 relative overflow-hidden",
                        isActive 
                          ? `${opt.color} scale-102 border-current shadow-lg z-10` 
                          : "border-white/5 bg-neutral-950/20 hover:border-white/10"
                      )}
                    >
                      {/* Active Label Badge */}
                      {isActive && (
                        <div className="absolute top-0 right-0 bg-gradient-to-l from-orange-400 to-orange-600 text-black text-[9px] font-extrabold uppercase py-1 px-3.5 rounded-bl-xl tracking-wider shadow">
                          Active Profile
                        </div>
                      )}

                      <div className="space-y-6">
                        <div className="flex items-center gap-3">
                          <div className={cn("p-3 rounded-2xl", isActive ? "bg-white/15" : "bg-white/5")}>
                            <IconComponent className="w-6 h-6" />
                          </div>
                          <div>
                            <span className="text-xs uppercase font-bold tracking-wider text-white/30 block">Studio Slot</span>
                            <h4 className="text-xl font-bold text-white tracking-tight">{opt.name}</h4>
                          </div>
                        </div>

                        <div className="flex items-baseline gap-1 pt-2 border-t border-white/5">
                          <span className="text-4xl font-extrabold text-white tracking-tighter">{opt.price}</span>
                          <span className="text-xs text-white/40 font-mono">/{opt.period}</span>
                        </div>

                        <div className="space-y-2">
                          <span className="text-[10px] font-bold text-orange-400/80 uppercase block tracking-widest font-mono">Limits & Allocation</span>
                          <p className="text-sm font-bold text-white">{opt.limitText}</p>
                          <p className="text-xs text-white/40">{opt.monthlyLimit}</p>
                        </div>

                        <div className="space-y-3 pt-4 border-t border-white/5">
                          <span className="text-[10px] font-bold text-white/30 uppercase block tracking-widest font-mono">Routing Engine</span>
                          <span className="text-[11px] font-semibold text-white/80">{opt.apiName}</span>
                          <div className="space-y-1.5 pt-1">
                            {opt.features.map((feat, i) => (
                              <p key={i} className="text-xs text-white/50 flex items-start gap-1.5 leading-snug">
                                <span className="text-orange-500 font-bold">•</span>
                                {feat}
                              </p>
                            ))}
                          </div>
                        </div>
                      </div>

                      <div className="pt-6 mt-6">
                        <button
                          onClick={() => handleSwitchPlan(opt.id, opt.price)}
                          disabled={isActive || isUpgrading}
                          className={cn(
                            "w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all duration-300",
                            isActive
                              ? "bg-white/10 text-white cursor-default"
                              : "bg-white/5 hover:bg-orange-500 hover:text-white text-white/70 hover:shadow-lg active:scale-[0.98]"
                          )}
                        >
                          {isActive ? "Active Plan" : `Upgrade to ${opt.name}`}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Restore Purchases / Recovery Actions Center */}
              <div className="mt-12 text-center space-y-4 max-w-md mx-auto relative z-20">
                <p className="text-xs text-white/40 font-medium leading-relaxed">
                  Have you already upgraded to a premium plan? If you are updating the app or re-signed in, you can restore your purchases immediately.
                </p>
                <button
                  type="button"
                  onClick={handleRestorePurchases}
                  disabled={isUpgrading}
                  className="inline-flex items-center gap-2.5 px-6 py-3.5 bg-neutral-900 hover:bg-neutral-850 active:bg-neutral-800 text-white border border-white/10 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 shadow-md hover:shadow-orange-500/5 hover:border-orange-500/25 disabled:opacity-50"
                  id="restore-purchases-btn"
                >
                  <RefreshCw className={cn("w-3.5 h-3.5 text-orange-400", isUpgrading && "animate-spin")} />
                  <span>Restore Google Play Purchases</span>
                </button>
                <div className="flex justify-center items-center gap-4 text-[10px] text-white/30 font-mono">
                  <span>Merchant: V-Astra Sound Lab</span>
                  <span>•</span>
                  <span>Direct Play SKUs Enabled</span>
                </div>
              </div>
            </section>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-4xl space-y-8"
          >
            {/* Header info library */}
            <div className="flex items-center justify-between">
              <h2 className="text-4xl font-bold flex items-center gap-4">
                <Library className="w-8 h-8 text-orange-500" />
                Your Sonic Studio
              </h2>
              <button 
                onClick={() => setShowLibrary(false)}
                className="px-6 py-2 bg-white/5 hover:bg-white/10 rounded-full text-sm font-medium transition-all"
              >
                Back to Lab
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savedTracks.length === 0 ? (
                <div className="col-span-full py-20 text-center space-y-4 bg-white/5 rounded-3xl border border-white/5">
                  <Sparkles className="w-12 h-12 text-white/10 mx-auto" />
                  <p className="text-white/40">You haven't generated any masterpieces yet.</p>
                  <button 
                    onClick={() => setShowLibrary(false)}
                    className="px-8 py-3 bg-orange-500 text-white rounded-full font-bold"
                  >
                    Start Creating
                  </button>
                </div>
              ) : (
                savedTracks.map((track) => (
                  <motion.div
                    key={track.id}
                    layoutId={track.id}
                    className="p-6 rounded-2xl bg-white/5 border border-white/5 hover:border-orange-500/50 hover:bg-white/10 transition-all group cursor-pointer"
                    onClick={() => {
                        setCurrentTrack(track);
                        setShowLibrary(false);
                    }}
                  >
                    <div className="flex items-center justify-between mb-4">
                        <span className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded-full text-xs font-bold uppercase tracking-wider">
                            {track.genre}
                        </span>
                        <span className="text-[10px] text-white/30 uppercase tracking-widest font-mono">
                            {track.createdAt?.toDate?.() ? track.createdAt.toDate().toLocaleDateString() : new Date().toLocaleDateString()}
                        </span>
                    </div>
                    <p className="text-lg font-medium text-white mb-2 line-clamp-2 leading-snug">
                        "{track.prompt}"
                    </p>
                    <div className="flex items-center gap-2 text-orange-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Sparkles className="w-4 h-4" />
                        <span className="text-xs font-bold uppercase">Load in Player</span>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* Google AdMob Banner Ad (Shown for Free Users only inside Library view) */}
            <div className="pt-8">
              <BannerAd userProfile={profile} />
            </div>
          </motion.div>
        )}
      </main>

      <footer className="relative z-10 py-12 border-t border-white/5 mt-20">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 opacity-30">
            <Music2 className="w-5 h-5" />
            <span className="text-xs font-mono tracking-widest uppercase">Powered by Lyria 3 Pro</span>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-[11px] font-semibold uppercase tracking-wider">
             <a 
               href="https://sites.google.com/view/v-astra-music-ai-privacy/home" 
               target="_blank" 
               rel="noopener noreferrer"
               className="text-white/40 hover:text-orange-400 hover:underline transition-all duration-300"
             >
               Privacy Policy
             </a>
             <a 
               href="https://sites.google.com/view/vastramusicaitermsconditions/home" 
               target="_blank" 
               rel="noopener noreferrer"
               className="text-white/40 hover:text-orange-400 hover:underline transition-all duration-300"
             >
               Terms & Conditions
             </a>
             <span className="text-white/10 hidden md:inline">|</span>
             <span className="text-white/30 font-medium tracking-normal lowercase">v-astra studio</span>
          </div>
        </div>
      </footer>

      {/* Google Play Billing / RevenueCat Payment Sheet Prompt Modal */}
      <AnimatePresence>
        {activeBillingTier && user && (
          <GooglePlayBillingSheet
            userId={user.uid}
            tier={activeBillingTier}
            priceText={activeBillingPrice}
            onSuccess={handleBillingSuccess}
            onCancel={handleBillingCancel}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
