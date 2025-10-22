import { m } from "motion/react";
import { forwardRef } from "react";
import { cn } from "@/utils";
import { Title, Text } from "@/ui/typography";
import Icon from "@/components/icon/icon";

interface ModernPageLayoutProps {
  title: string;
  description?: string;
  icon?: string;
  iconColor?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  loading?: boolean;
  className?: string;
}

const ModernPageLayout = forwardRef<HTMLDivElement, ModernPageLayoutProps>(
  ({ 
    className, 
    title, 
    description, 
    icon, 
    iconColor = "text-blue-600 dark:text-blue-400",
    actions, 
    children, 
    loading = false
  }, ref) => {
    
    if (loading) {
      return (
        <m.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-center min-h-[400px]"
        >
          <div className="text-center space-y-4">
            <m.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full mx-auto"
            />
            <Text className="text-muted-foreground">Loading...</Text>
          </div>
        </m.div>
      );
    }

    return (
      <m.div 
        ref={ref}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className={cn("space-y-8", className)}
      >
        {/* Header */}
        <m.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6"
        >
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              {icon && (
                <m.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className={cn(
                    "p-3 rounded-xl bg-gradient-to-br from-current/10 to-current/5",
                    iconColor
                  )}
                >
                  <Icon icon={icon} className="h-6 w-6" />
                </m.div>
              )}
              <div>
                <Title as="h1" className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                  {title}
                </Title>
                {description && (
                  <Text className="text-muted-foreground mt-1">{description}</Text>
                )}
              </div>
            </div>
          </div>
          {actions && (
            <m.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center gap-3 flex-wrap"
            >
              {actions}
            </m.div>
          )}
        </m.div>

        {/* Content */}
        <m.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          {children}
        </m.div>
      </m.div>
    );
  }
);

ModernPageLayout.displayName = "ModernPageLayout";

export { ModernPageLayout };