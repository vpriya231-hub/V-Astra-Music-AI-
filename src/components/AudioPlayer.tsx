import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Download, Share2, Save, Trash2, Heart } from 'lucide-react';
import { motion } from 'motion/react';
import { Visualizer } from './Visualizer';
import { cn } from '../lib/utils';
import { auth, db } from '../lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/utils';
import confetti from 'canvas-confetti';

interface AudioPlayerProps {
  track: {
    audioUrl: string;
    lyrics?: string;
    prompt: string;
    genre: string;
  } | null;
  onSave?: (track: any) => void;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({ track, onSave }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    setIsPlaying(false);
    setIsSaved(false);
  }, [track]);

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

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = track.audioUrl;
    link.download = `lyria-${track.genre.toLowerCase()}-${Date.now()}.wav`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSave = async () => {
    if (!auth.currentUser) {
      alert("Please sign in to save tracks.");
      return;
    }
    
    setIsSaving(true);
    try {
      // NOTE: We can't store the raw Blob in Firestore easily if it's > 1MB.
      // For this demo, we'll store metadata and prompt.
      // In a real app, we'd upload to Firebase Storage first.
      const trackData = {
        userId: auth.currentUser.uid,
        prompt: track.prompt,
        genre: track.genre,
        lyrics: track.lyrics || "",
        createdAt: serverTimestamp(),
        audioUrl: track.audioUrl // This is temporary, but for the session it works.
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
      className="w-full max-w-2xl mx-auto mt-8 p-8 rounded-3xl bg-black/40 backdrop-blur-2xl border border-white/10 shadow-3xl"
    >
      <div className="flex items-center justify-between mb-8">
        <div>
          <h3 className="text-2xl font-bold text-white mb-2">{track.genre} Masterpiece</h3>
          <p className="text-white/40 text-sm italic">"{track.prompt}"</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleDownload}
            className="p-3 rounded-full bg-white/5 hover:bg-white/10 text-white transition-all"
            title="Download"
          >
            <Download className="w-5 h-5" />
          </button>
          <button
            onClick={handleShare}
            className="p-3 rounded-full bg-white/5 hover:bg-white/10 text-white transition-all"
            title="Share"
          >
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="bg-black/20 rounded-2xl p-6 mb-8">
        <Visualizer audioElement={audioRef.current} isPlaying={isPlaying} />
      </div>

      <div className="flex flex-col items-center gap-6">
        <audio
          ref={audioRef}
          src={track.audioUrl}
          onEnded={() => setIsPlaying(false)}
          className="hidden"
        />

        <button
          onClick={togglePlay}
          className="w-20 h-20 rounded-full bg-orange-500 flex items-center justify-center text-white shadow-xl shadow-orange-500/20 active:scale-95 transition-all"
        >
          {isPlaying ? <Pause className="w-10 h-10" /> : <Play className="w-10 h-10 ml-1" />}
        </button>

        <div className="w-full flex justify-between items-center px-4">
           <button
            onClick={handleSave}
            disabled={isSaving || isSaved}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-full font-medium transition-all",
              isSaved 
                ? "bg-green-500/20 text-green-400 border border-green-500/40"
                : "bg-white/5 hover:bg-white/10 text-white border border-white/10"
            )}
          >
            {isSaved ? <Heart className="w-5 h-5 fill-current" /> : <Save className="w-5 h-5" />}
            {isSaving ? "Saving..." : isSaved ? "Saved" : "Save to Studio"}
          </button>

          {track.lyrics && (
            <div className="text-sm text-white/60 flex items-center gap-2 max-w-xs overflow-hidden">
               <span className="truncate opacity-50">{track.lyrics.substring(0, 50)}...</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
