import { m } from "motion/react";
import { forwardRef } from "react";
import { cn } from "@/utils";
import { Button, ButtonProps } from "@/ui/button";

interface ModernButtonProps extends ButtonProps {
  glow?: boolean;
  gradient?: boolean;
  loading?: boolean;
}

const ModernButton = forwardRef<HTMLButtonElement, ModernButtonProps>(
  ({ className, glow = false, gradient = false, loading = false, children, disabled, ...props }, ref) => {
    return (
      <m.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
      >
        <Button
          ref={ref}
          disabled={disabled || loading}
          className={cn(
            // Modern enhancements
            "relative overflow-hidden transition-all duration-300",
            // Glow effect
            glow && "shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/40",
            // Gradient background
            gradient && !disabled && "bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70",
            // Loading state
            loading && "opacity-75 cursor-not-allowed",
            className
          )}
          {...props}
        >
          {loading && (
            <m.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full"
            />
          )}
          {children}
                 </Button>
       </m.div>
    );
  }
);

ModernButton.displayName = "ModernButton";

export { ModernButton };