import { m } from "motion/react";
import { forwardRef } from "react";
import { cn } from "@/utils";
import { Card, CardContent } from "@/ui/card";
import { Text, Title } from "@/ui/typography";
import { ModernCard } from "./modern-card";

interface ModernStatsCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: "increase" | "decrease";
  };
  icon?: React.ReactNode;
  trend?: number[];
  loading?: boolean;
  colorScheme?: "blue" | "green" | "purple" | "orange" | "red" | "gray";
  className?: string;
  onClick?: () => void;
}

const colorSchemes = {
  blue: {
    icon: "bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400",
    change: {
      increase: "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-500/10",
      decrease: "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-500/10"
    }
  },
  green: {
    icon: "bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400",
    change: {
      increase: "text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-500/10",
      decrease: "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-500/10"
    }
  },
  purple: {
    icon: "bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400",
    change: {
      increase: "text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-500/10",
      decrease: "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-500/10"
    }
  },
  orange: {
    icon: "bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400",
    change: {
      increase: "text-orange-600 bg-orange-50 dark:text-orange-400 dark:bg-orange-500/10",
      decrease: "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-500/10"
    }
  },
  red: {
    icon: "bg-red-500/10 text-red-600 dark:bg-red-500/20 dark:text-red-400",
    change: {
      increase: "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-500/10",
      decrease: "text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-500/10"
    }
  },
  gray: {
    icon: "bg-gray-500/10 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400",
    change: {
      increase: "text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-500/10",
      decrease: "text-gray-600 bg-gray-50 dark:text-gray-400 dark:bg-gray-500/10"
    }
  }
};

const ModernStatsCard = forwardRef<HTMLDivElement, ModernStatsCardProps>(
  ({ className, title, value, change, icon, trend, loading, colorScheme = "blue", onClick }, ref) => {
    const colors = colorSchemes[colorScheme];

    return (
      <ModernCard ref={ref} className={cn("relative", className)} onClick={onClick ? () => onClick?.() : undefined}>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <Text className="text-sm font-medium text-muted-foreground mb-2">
              {title}
            </Text>
            
            {loading ? (
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            ) : (
              <Title as="h3" className="text-3xl font-bold mb-2">
                {typeof value === "number" ? value.toLocaleString() : value}
              </Title>
            )}

            {change && !loading && (
              <m.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn(
                  "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium",
                  colors.change[change.type]
                )}
              >
                <m.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2 }}
                  className="mr-1"
                >
                  {change.type === "increase" ? "↗" : "↘"}
                </m.span>
                {Math.abs(change.value)}%
              </m.div>
            )}
          </div>

          {icon && (
            <m.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className={cn(
                "p-3 rounded-xl",
                colors.icon
              )}
            >
              {icon}
            </m.div>
          )}
        </div>

        {trend && trend.length > 0 && (
          <div className="mt-4 h-12 w-full">
            <svg className="w-full h-full" viewBox="0 0 100 20">
              <m.polyline
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
                fill="none"
                stroke={`var(--${colorScheme}-500)`}
                strokeWidth="2"
                points={trend.map((point, index) => 
                  `${(index / (trend.length - 1)) * 100},${20 - (point / Math.max(...trend)) * 15}`
                ).join(" ")}
                className="opacity-60"
              />
            </svg>
          </div>
        )}
      </ModernCard>
    );
  }
);

ModernStatsCard.displayName = "ModernStatsCard";

export { ModernStatsCard };