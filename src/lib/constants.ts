export const GENRES = [
  "Lo-fi",
  "Synthwave",
  "Cinematic",
  "Jazz Fusion",
  "Ambient Polyphony",
  "Cyberpunk",
  "Orchestral Hybrid",
  "Chillhop",
  "Liquid Drum & Bass",
  "Techno",
  "Vaporwave",
  "Neo-Classical"
];

export interface Track {
  id?: string;
  userId: string;
  prompt: string;
  genre: string;
  lyrics?: string;
  audioUrl: string;
  createdAt: any;
}
