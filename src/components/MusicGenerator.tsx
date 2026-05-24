import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Music, Sparkles, Loader2, Music2, AlertCircle } from 'lucide-react';
import { GENRES } from '../lib/constants';
import { cn } from '../lib/utils';

interface MusicGeneratorProps {
  onTrackGenerated: (videoData: { audioUrl: string, lyrics: string, prompt: string, genre: string }) => void;
}

export const MusicGenerator: React.FC<MusicGeneratorProps> = ({ onTrackGenerated }) => {
  const [prompt, setPrompt] = useState("");
  const [selectedGenre, setSelectedGenre] = useState(GENRES[0]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lyrics, setLyrics] = useState("");

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setError(null);
    setLyrics("");
    
    try {
      const res = await fetch("/api/generate-music", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          genre: selectedGenre,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate music");
      }

      setLyrics(data.lyrics || "");

      const binary = atob(data.audioBase64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: data.mimeType || "audio/wav" });
      const audioUrl = URL.createObjectURL(blob);

      onTrackGenerated({ 
        audioUrl, 
        lyrics: data.lyrics || "", 
        prompt, 
        genre: selectedGenre 
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to generate music. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-8 p-6 rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl">
      <div className="space-y-4">
        <label className="text-sm font-medium text-white/50 uppercase tracking-widest flex items-center gap-2">
          <Music className="w-4 h-4" /> Imagination to Sound
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe the mood, instruments, or scene... e.g., 'A rainy night in 2077 with soft neon jazz'"
          className="w-full min-h-[120px] bg-black/20 border border-white/10 rounded-2xl p-4 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all resize-none"
        />
      </div>

      <div className="space-y-4">
        <label className="text-sm font-medium text-white/50 uppercase tracking-widest flex items-center gap-2">
          <Sparkles className="w-4 h-4" /> Choose Genre
        </label>
        <div className="flex flex-wrap gap-2">
          {GENRES.map((genre) => (
            <button
              key={genre}
              onClick={() => setSelectedGenre(genre)}
              className={cn(
                "px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 border",
                selectedGenre === genre
                  ? "bg-orange-500 border-orange-400 text-white shadow-[0_0_15px_rgba(249,115,22,0.4)]"
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
            className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 flex items-center gap-2 text-sm"
          >
            <AlertCircle className="w-4 h-4" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={handleGenerate}
        disabled={isGenerating || !prompt.trim()}
        className={cn(
          "w-full py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all duration-500 transform active:scale-[0.98]",
          isGenerating
            ? "bg-orange-500/50 cursor-not-allowed"
            : "bg-orange-500 hover:bg-orange-600 text-white shadow-lg hover:shadow-orange-500/20"
        )}
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-6 h-6 animate-spin" />
            Architecting Sound Waves...
          </>
        ) : (
          <>
            <Music2 className="w-6 h-6" />
            Generate Track
          </>
        )}
      </button>
    </div>
  );
};
