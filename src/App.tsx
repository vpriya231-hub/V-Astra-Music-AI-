import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { Music2, LogIn, LogOut, Library, Sparkles, User as UserIcon, Share2 } from 'lucide-react';
import { auth, db } from './lib/firebase';
import { MusicGenerator } from './components/MusicGenerator';
import { AudioPlayer } from './components/AudioPlayer';
import { cn } from './lib/utils';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [currentTrack, setCurrentTrack] = useState<any>(null);
  const [savedTracks, setSavedTracks] = useState<any[]>([]);
  const [showLibrary, setShowLibrary] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
    });
    return () => unsubscribe();
  }, []);

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

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tracks = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSavedTracks(tracks);
    });

    return () => unsubscribe();
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

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-orange-500/30">
      {/* Background Atmosphere */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-orange-600/20 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[150px] rounded-full" />
      </div>

      {/* Navigation */}
      <header className="relative z-50 border-b border-white/5 bg-black/20 backdrop-blur-md px-6 py-4 flex items-center justify-between">
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
                  "flex items-center gap-2 px-4 py-2 rounded-full transition-all text-sm font-medium",
                  showLibrary ? "bg-orange-500 text-white" : "bg-white/5 hover:bg-white/10"
                )}
              >
                <Library className="w-4 h-4" />
                Library ({savedTracks.length})
              </button>
              <div className="flex items-center gap-2 pl-4 border-l border-white/10">
                <img src={user.photoURL || ""} className="w-8 h-8 rounded-full border border-white/20" alt="avatar" />
                <button onClick={handleSignOut} className="p-2 hover:bg-white/5 rounded-lg transition-all" title="Sign Out">
                  <LogOut className="w-4 h-4 text-white/40" />
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={handleSignIn}
              className="flex items-center gap-2 px-6 py-2.5 bg-white text-black rounded-full font-bold hover:bg-orange-500 hover:text-white transition-all transform active:scale-95"
            >
              <LogIn className="w-4 h-4" />
              Sign In
            </button>
          )}
        </nav>
      </header>

      <main className="relative z-10 container mx-auto px-6 py-12 flex flex-col items-center">
        {!showLibrary ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full space-y-12"
          >
            <div className="text-center space-y-4 mb-8">
              <h2 className="text-6xl font-black tracking-tighter uppercase sm:text-8xl">
                Dream in <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-red-600">Stereo</span>
              </h2>
              <p className="text-lg text-white/40 max-w-xl mx-auto">
                The world's most advanced AI music generation studio. Turn your wildest descriptions into 30-second studio-quality tracks instantly.
              </p>
            </div>

            <MusicGenerator onTrackGenerated={(track) => setCurrentTrack(track)} />

            <AnimatePresence>
              {currentTrack && (
                <AudioPlayer track={currentTrack} />
              )}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-4xl space-y-8"
          >
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
                            {track.createdAt?.toDate().toLocaleDateString()}
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
          </motion.div>
        )}
      </main>

      <footer className="relative z-10 py-12 border-t border-white/5 mt-20">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 opacity-30">
            <Music2 className="w-5 h-5" />
            <span className="text-xs font-mono tracking-widest uppercase">Powered by Lyria 3 Pro</span>
          </div>
          <div className="flex gap-8 text-[11px] text-white/20 uppercase tracking-[0.2em] font-medium">
             <span>Innovation</span>
             <span>Excellence</span>
             <span>Sonic Lab</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
