import { motion } from "framer-motion";

export const Greeting = () => {
  return (
    <div
      className="mx-auto mt-4 flex size-full max-w-3xl flex-col justify-center px-4 md:mt-16 md:px-8"
      key="overview"
    >
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="font-heading font-bold text-3xl tracking-tight md:text-5xl"
        exit={{ opacity: 0, y: 10 }}
        initial={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.4 }}
      >
        <span className="neon-text-gradient">READY</span>
        <span className="animate-[cursor-blink_1s_steps(1)_infinite] text-neon-lime">_</span>
      </motion.div>
      <motion.div
        animate={{ opacity: 1, y: 0 }}
        className="mt-2 font-heading text-lg text-muted-foreground md:text-xl"
        exit={{ opacity: 0, y: 10 }}
        initial={{ opacity: 0, y: 10 }}
        transition={{ delay: 0.55 }}
      >
        What's on your mind?
      </motion.div>
    </div>
  );
};
