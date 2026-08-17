import { Header } from "@/components/Header";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { trackEvent, trackMetric, deviceType } from "@/lib/posthog";
import { cn } from "@/lib/utils";

const HERO_EMBEDS = {
  dark: "https://eu.posthog.com/embedded/O17xbEkZf3RIAZmRNONvIP9Wlje-tg",
  light: "https://eu.posthog.com/embedded/5phlJDObiZQ1csf_TxBqlKOq3H0Cxg",
};

const FUNNEL_EMBEDS = {
  dark: "https://eu.posthog.com/embedded/qI__JJtawuiROAsB4BCBS60tL8Uguw",
  light: "https://eu.posthog.com/embedded/WgSuIm6CmK85zamKrfNU4JVQ_Rqqkg",
};

interface ChartCardProps {
  title: string;
  src: string;
  height: number;
  lazy?: boolean;
  scrollOnNarrow?: boolean;
}

const ChartCard = ({ title, src, height, lazy, scrollOnNarrow }: ChartCardProps) => {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(false);
  }, [src]);

  return (
    <div className="bg-card border rounded-lg shadow-sm overflow-hidden">
      <div className="p-4 border-b border-border/60">
        <h2 className="text-lg font-semibold text-card-foreground">{title}</h2>
      </div>
      <div className="overflow-x-auto">
        <div
          className={cn(
            "relative w-full",
            scrollOnNarrow && "min-w-[600px] md:min-w-full"
          )}
          style={{ minHeight: height }}
        >
          <div
            className={cn(
              "absolute inset-0 animate-pulse bg-muted",
              loaded && "hidden"
            )}
            aria-hidden="true"
          />
          <iframe
            key={src}
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
  const { resolvedTheme } = useTheme();
  const theme = resolvedTheme === "light" ? "light" : "dark";

  useEffect(() => {
    trackEvent("live_stats_viewed");
    trackMetric("count", "hogshop.live_stats.viewed", 1, {
      attributes: { device_type: deviceType() },
    });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="mx-auto px-4 py-12 max-w-[1400px]">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Live stats</h1>
          <p className="text-lg text-muted-foreground">
            HogShop is a demo store. The traffic here is synthetic, but the analytics are real — these charts are live PostHog insights, embedded straight from our project. Browse a product, come back later, and watch yourself appear in the numbers.
          </p>
        </div>

        <div className="space-y-8">
          <ChartCard
            title="Visitors & product views — last 14 days"
            src={HERO_EMBEDS[theme]}
            height={450}
          />
          <ChartCard
            title="Purchase funnel — last 30 days"
            src={FUNNEL_EMBEDS[theme]}
            height={600}
            lazy
            scrollOnNarrow
          />
        </div>
      </main>
    </div>
  );
};

export default Live;
