import { Header } from "@/components/Header";
import { useEffect, useState } from "react";
import { trackEvent, trackMetric, deviceType } from "@/lib/posthog";
import { cn } from "@/lib/utils";

const HERO_EMBED = "https://eu.posthog.com/embedded/O17xbEkZf3RIAZmRNONvIP9Wlje-tg?refresh=true";
const FUNNEL_EMBED = "https://eu.posthog.com/embedded/qI__JJtawuiROAsB4BCBS60tL8Uguw?refresh=true";

interface ChartCardProps {
  title: string;
  src: string;
  height: number;
  lazy?: boolean;
  minScrollWidth?: number;
}

const ChartCard = ({ title, src, height, lazy, minScrollWidth }: ChartCardProps) => {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="dark bg-card border rounded-lg shadow-sm overflow-hidden">
      <div className="p-4 border-b border-border/60">
        <h2 className="text-lg font-semibold text-card-foreground">{title}</h2>
      </div>
      <div className="overflow-x-auto">
        <div className="relative" style={{ minHeight: height, minWidth: minScrollWidth }}>
          <div
            className={cn(
              "absolute inset-0 animate-pulse bg-muted",
              loaded && "hidden"
            )}
            aria-hidden="true"
          />
          <iframe
            src={src}
            width="100%"
            height={height}
            frameBorder="0"
            allowFullScreen
            loading={lazy ? "lazy" : undefined}
            onLoad={() => setLoaded(true)}
            className="block"
            title={title}
          />
        </div>
      </div>
    </div>
  );
};

const Live = () => {
  useEffect(() => {
    trackEvent("live_stats_viewed");
    trackMetric("count", "hogshop.live_stats.viewed", 1, {
      attributes: { device_type: deviceType() },
    });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Live stats</h1>
          <p className="text-lg text-muted-foreground">
            HogShop is a demo store. The traffic here is synthetic, but the analytics are real — these charts are live PostHog insights, embedded straight from our project and refreshed on every load. Browse a product, come back, and watch yourself appear in the numbers.
          </p>
        </div>

        <div className="space-y-8">
          <ChartCard
            title="Visitors & product views — last 14 days"
            src={HERO_EMBED}
            height={450}
          />
          <ChartCard
            title="Purchase funnel — last 30 days"
            src={FUNNEL_EMBED}
            height={520}
            lazy
            minScrollWidth={1000}
          />
        </div>
      </main>
    </div>
  );
};

export default Live;
