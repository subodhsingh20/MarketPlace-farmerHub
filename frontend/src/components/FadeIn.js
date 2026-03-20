import React from 'react';
import { motion } from 'framer-motion';

const FadeIn = ({
  children,
  direction = 'up',
  delay = 0,
  duration = 0.6,
  className = '',
  ...props
}) => {
  const directionVariants = {
    up: { y: 30 },
    down: { y: -30 },
    left: { x: 30 },
    right: { x: -30 },
    none: {}
  };

  const variants = {
    hidden: {
      opacity: 0,
      ...directionVariants[direction]
    },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: {
        duration,
        delay,
        ease: [0.25, 0.46, 0.45, 0.94]
      }
    }
  };

  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={variants}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export default FadeIn;