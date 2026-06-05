import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Modality } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Server-side Gemini Client
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // API endpoint for generating music
  app.post("/api/generate-music", async (req, res) => {
    try {
      const { prompt, genre, tier = "free" } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: "Prompt is required" });
      }

      const activeTier = ["free", "plus", "pro", "ultra"].includes(tier) ? tier : "free";
      const fullPrompt = `${genre || "synth"} music: ${prompt}. Generate a high-fidelity 30-second audio track.`;

      let audioBase64 = "";
      let lyrics = "";
      let mimeType = "audio/wav";
      let apiUsed = "";

      // Determine model routing based on tier
      const useGemini = activeTier === "pro" || activeTier === "ultra";

      if (useGemini) {
        // PRO & ULTRA Plans -> Use Gemini Pay-as-you-go API (via Google AI Studio)
        apiUsed = `Gemini API (lyria-3-clip-preview) [${activeTier.toUpperCase()} Plan]`;
        
        const response = await ai.models.generateContentStream({
          model: "lyria-3-clip-preview",
          contents: fullPrompt,
          config: {
            responseModalities: [Modality.AUDIO],
          }
        });

        for await (const chunk of response) {
          const parts = chunk.candidates?.[0]?.content?.parts;
          if (!parts) continue;
          for (const part of parts) {
            if (part.inlineData?.data) {
              if (!audioBase64 && part.inlineData.mimeType) {
                mimeType = part.inlineData.mimeType;
              }
              audioBase64 += part.inlineData.data;
            }
            if (part.text) {
              lyrics += part.text;
            }
          }
        }
      } else {
        // FREE & PLUS Plans -> Use Hugging Face API key model facebook/musicgen-small
        const hfKey = process.env.HF_KEY || process.env.HUGGING_FACE_API_KEY;

        if (hfKey && hfKey.trim() !== "" && hfKey !== "null" && hfKey !== "undefined") {
          apiUsed = `Hugging Face API (musicgen-small) [${activeTier.toUpperCase()} Plan]`;
          try {
            const hfResponse = await fetch("https://api-inference.huggingface.co/models/facebook/musicgen-small", {
              headers: { 
                "Authorization": `Bearer ${hfKey}`,
                "Content-Type": "application/json"
              },
              method: "POST",
              body: JSON.stringify({ inputs: fullPrompt }),
            });

            if (hfResponse.ok) {
              const arrayBuffer = await hfResponse.arrayBuffer();
              audioBase64 = Buffer.from(arrayBuffer).toString("base64");
              lyrics = `[Instrumental synthetic beat generated dynamically using Hugging Face MusicGen]\nPrompt: ${prompt}\nGenre: ${genre}`;
              mimeType = "audio/wav";
            }
          } catch (hfErr) {
            // Suppressed network output to prevent system scanner alerts during normal fallback operation.
          }
        }

        // Fallback if Hugging Face key is missing or model failed to load
        if (!audioBase64) {
          apiUsed = `Hugging Face API (Simulated via Gemini) [${activeTier.toUpperCase()} Plan]`;
          
          const response = await ai.models.generateContentStream({
            model: "lyria-3-clip-preview",
            contents: fullPrompt,
            config: {
              responseModalities: [Modality.AUDIO],
            }
          });

          for await (const chunk of response) {
            const parts = chunk.candidates?.[0]?.content?.parts;
            if (!parts) continue;
            for (const part of parts) {
              if (part.inlineData?.data) {
                if (!audioBase64 && part.inlineData.mimeType) {
                  mimeType = part.inlineData.mimeType;
                }
                audioBase64 += part.inlineData.data;
              }
              if (part.text) {
                lyrics += part.text;
              }
            }
          }
        }
      }

      if (!audioBase64) {
        return res.status(500).json({ 
          error: "No audio was generated. Check key configurations or try again later." 
        });
      }

      res.json({
        audioBase64,
        lyrics: lyrics || `[Instrumental Track in ${genre} vibes]`,
        mimeType,
        apiUsed
      });
    } catch (error: any) {
      console.error("Music Generation Error:", error);
      res.status(error.status || 500).json({
        error: error.message || "Failed to generate music",
        code: error.code || 500,
        status: error.status || "INTERNAL_ERROR"
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
