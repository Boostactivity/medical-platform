import React from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface NotificationBadgeProps {
  count: number;
}

export default function NotificationBadge({ count }: NotificationBadgeProps) {
  // Ne rien afficher si count = 0
  if (count === 0) return null;

  // Limiter l'affichage à 99+ si le nombre est trop grand
  const displayCount = count > 99 ? '99+' : count.toString();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        className={`absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 flex items-center justify-center bg-[#CE0500] text-white text-xs rounded-full shadow-lg border-2 border-white ${
          count > 0 ? 'animate-pulse' : ''
        }`}
      >
        <motion.span
          key={count}
          initial={{ y: -10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          {displayCount}
        </motion.span>
      </motion.div>
    </AnimatePresence>
  );
}
