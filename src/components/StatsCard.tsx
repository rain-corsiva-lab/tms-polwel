import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  description?: string;
}

const StatsCard = ({ title, value, icon: Icon, trend, description }: StatsCardProps) => {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold text-foreground">{value}</p>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">{description}</p>
            )}
          </div>
          <div className="flex flex-col items-center">
            <div className="p-2 bg-accent rounded-lg">
              <Icon className="h-5 w-5 text-accent-foreground" />
            </div>
            {trend && (
              <span className={`text-xs mt-2 ${
                trend.isPositive ? 'text-success' : 'text-destructive'
              }`}>
                {trend.isPositive ? '+' : ''}{trend.value}%
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StatsCard;