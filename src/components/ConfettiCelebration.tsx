import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const COLORS = [
  "hsl(142, 71%, 45%)",  // savings green
  "hsl(45, 100%, 51%)",  // gold
  "hsl(358, 82%, 55%)",  // primary red
  "hsl(174, 100%, 33%)", // secondary teal
  "hsl(270, 60%, 50%)",  // purple
  "hsl(25, 95%, 53%)",   // orange
];

const PARTICLE_COUNT = 40;

interface Particle {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  rotation: number;
  shape: "circle" | "rect" | "star";
}

const generateParticles = (): Particle[] =>
  Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
    id: i,
    x: 50 + (Math.random() - 0.5) * 30,
    y: 20,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    size: 4 + Math.random() * 6,
    rotation: Math.random() * 360,
    shape: (["circle", "rect", "star"] as const)[Math.floor(Math.random() * 3)],
  }));

const ConfettiCelebration = ({ active }: { active: boolean }) => {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (active) {
      setParticles(generateParticles());
      // Vibrate
      if (navigator.vibrate) {
        navigator.vibrate([50, 30, 100]);
      }
      const timer = setTimeout(() => setParticles([]), 2500);
      return () => clearTimeout(timer);
    }
  }, [active]);

  return (
    <AnimatePresence>
      {particles.length > 0 && (
        <div className="fixed inset-0 z-[70] pointer-events-none overflow-hidden">
          {particles.map((p) => (
            <motion.div
              key={p.id}
              initial={{
                left: `${p.x}%`,
                top: `${p.y}%`,
                opacity: 1,
                scale: 0,
                rotate: 0,
              }}
              animate={{
                left: `${p.x + (Math.random() - 0.5) * 60}%`,
                top: `${70 + Math.random() * 30}%`,
                opacity: [1, 1, 0],
                scale: [0, 1.2, 0.8],
                rotate: p.rotation + Math.random() * 720 - 360,
              }}
              transition={{
                duration: 1.5 + Math.random() * 1,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
              className="absolute"
              style={{
                width: p.size,
                height: p.shape === "rect" ? p.size * 0.5 : p.size,
                backgroundColor: p.color,
                borderRadius: p.shape === "circle" ? "50%" : p.shape === "star" ? "2px" : "1px",
              }}
            />
          ))}
        </div>
      )}
    </AnimatePresence>
  );
};

export default ConfettiCelebration;
