import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  volume: number; // 0 to 1
  isActive: boolean;
  color?: string;
  label?: string;
}

const AudioVisualizer: React.FC<AudioVisualizerProps> = ({ volume, isActive, color = '#60a5fa', label }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Smooth out the volume for nicer visuals
  const smoothVolumeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const draw = () => {
      // Ease the volume transition
      const targetVolume = isActive ? volume : 0;
      smoothVolumeRef.current += (targetVolume - smoothVolumeRef.current) * 0.2;
      
      const width = canvas.width;
      const height = canvas.height;
      const centerY = height / 2;

      ctx.clearRect(0, 0, width, height);

      if (label) {
          ctx.fillStyle = '#94a3b8';
          ctx.font = '12px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(label, width/2, height - 5);
      }

      ctx.beginPath();
      ctx.moveTo(0, centerY);

      const bars = 30;
      const step = width / bars;
      
      for (let i = 0; i <= bars; i++) {
        const x = i * step;
        // Create a wave effect
        const noise = Math.random() * 0.1; 
        const wave = Math.sin(i * 0.5 + Date.now() * 0.005) * 0.3;
        
        // Amplitude based on volume
        const amplitude = (smoothVolumeRef.current * height * 0.4) + 2; 
        const y = centerY + Math.sin(i * 0.5) * amplitude * (1 + noise + wave);
        
        ctx.lineTo(x, y);
      }

      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.stroke();

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => cancelAnimationFrame(animationId);
  }, [volume, isActive, color, label]);

  return (
    <div className="flex flex-col items-center justify-center w-full h-full">
        <div className="relative w-full h-32 bg-slate-800/50 rounded-lg overflow-hidden border border-slate-700">
            <canvas 
                ref={canvasRef} 
                width={300} 
                height={128} 
                className="w-full h-full"
            />
        </div>
    </div>
  );
};

export default AudioVisualizer;
