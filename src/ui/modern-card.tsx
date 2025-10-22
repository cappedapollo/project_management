import { m } from "motion/react";
import { forwardRef } from "react";
import { cn } from "@/utils";

interface ModernCardProps {
	children: React.ReactNode;
	hover?: boolean;
	hoverable?: boolean;
	gradient?: boolean;
	glassmorphism?: boolean;
	padding?: "none" | "sm" | "md" | "lg" | "xl";
	className?: string;
	onClick?: () => void;
}

const ModernCard = forwardRef<HTMLDivElement, ModernCardProps>(
  ({ className, children, hover = true, hoverable = false, gradient = false, glassmorphism = false, padding = "md", onClick }, ref) => {
    const paddingClasses = {
      none: "",
      sm: "p-4",
      md: "p-6",
      lg: "p-8",
      xl: "p-10"
    };

    return (
      <m.div
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        whileHover={(hover || hoverable) ? { y: -2, scale: 1.01 } : undefined}
        className={cn(
          // Base styles
          "relative rounded-2xl border transition-all duration-300",
          // Modern shadow
          "shadow-lg shadow-black/5 dark:shadow-black/20",
          // Background
          glassmorphism
            ? "bg-white/80 backdrop-blur-xl dark:bg-gray-900/80"
            : "bg-white dark:bg-gray-900",
          // Border
          "border-gray-100 dark:border-gray-800",
          // Hover effects
          hover && "hover:shadow-xl hover:shadow-black/10 dark:hover:shadow-black/30",
          // Gradient overlay
          gradient && "before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-br before:from-white/50 before:to-transparent before:pointer-events-none",
          // Padding
          paddingClasses[padding],
                  className
        )}
        onClick={onClick}
      >
        {children}
      </m.div>
    );
  }
);

ModernCard.displayName = "ModernCard";

export { ModernCard };