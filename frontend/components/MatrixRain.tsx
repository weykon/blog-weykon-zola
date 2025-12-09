import React, { useEffect, useRef } from 'react';

const MatrixRain: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;

    canvas.width = width;
    canvas.height = height;

    const characters = 'abcdefghijklmnopqrstuvwxyz0123456789@#$%^&*()ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const charArray = characters.split('');
    
    const fontSize = 16;
    const columns = width / fontSize;

    // Array to store the vertical position of the drops
    // Initialize with random starting positions to look more natural immediately
    const drops: number[] = [];
    for (let i = 0; i < columns; i++) {
      drops[i] = Math.random() * -100; // Start above the screen randomly
    }

    const draw = () => {
      // Semi-transparent black to create the trail effect
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, width, height);

      ctx.fillStyle = '#22c55e'; // Tailwind primary-500
      ctx.font = `${fontSize}px monospace`;

      for (let i = 0; i < drops.length; i++) {
        const text = charArray[Math.floor(Math.random() * charArray.length)];
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        // Draw the character
        ctx.fillText(text, x, y);

        // Randomly reset the drop to the top, or move it down
        if (y > height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    };

    let animationId: number;
    const interval = setInterval(draw, 33); // ~30fps

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };

    window.addEventListener('resize', handleResize);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none"
    />
  );
};

export default MatrixRain;