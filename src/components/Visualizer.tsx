import React, { useEffect, useRef } from 'react';

interface VisualizerProps {
  audioElement: HTMLAudioElement | null;
  isPlaying: boolean;
}

export const Visualizer: React.FC<VisualizerProps> = ({ audioElement, isPlaying }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

  useEffect(() => {
    if (!audioElement || !canvasRef.current) return;

    if (!contextRef.current) {
      contextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      analyzerRef.current = contextRef.current.createAnalyser();
      sourceRef.current = contextRef.current.createMediaElementSource(audioElement);
      sourceRef.current.connect(analyzerRef.current);
      analyzerRef.current.connect(contextRef.current.destination);
    }

    const analyzer = analyzerRef.current!;
    analyzer.fftSize = 256;
    const bufferLength = analyzer.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;

    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      analyzer.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = (dataArray[i] / 255) * canvas.height;

        // Gradient color based on frequency
        const hue = (i / bufferLength) * 360;
        ctx.fillStyle = `hsla(${hue}, 70%, 50%, 0.8)`;
        
        // Draw bars from center or bottom? Let's do center
        const y = (canvas.height - barHeight) / 2;
        
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth - 2, barHeight, 4);
        ctx.fill();

        x += barWidth;
      }
    };

    if (isPlaying) {
      if (contextRef.current.state === 'suspended') {
        contextRef.current.resume();
      }
      draw();
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      cancelAnimationFrame(animationRef.current!);
    }

    return () => {
      cancelAnimationFrame(animationRef.current!);
    };
  }, [audioElement, isPlaying]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-32 rounded-xl"
      width={800}
      height={128}
    />
  );
};
