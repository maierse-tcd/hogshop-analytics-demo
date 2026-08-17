import { Header } from "@/components/Header";
import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent, trackMetric, deviceType } from "@/lib/posthog";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";

interface TrafficRow {
  day: string;
  product_views: number;
  visitors: number;
}

interface FunnelRow {
  product_viewed: number;
  added_to_cart: number;
  checkout_started: number;
  purchased: number;
}

interface LiveStats {
  traffic: TrafficRow[];
  funnel: FunnelRow | null;
  generated_at: string;
}

const trafficConfig = {
  product_views: { label: "Product views", color: "hsl(var(--chart-1))" },
  visitors: { label: "Visitors", color: "hsl(var(--chart-2))" },
} satisfies ChartConfig;

const funnelConfig = {
  value: { label: "Users", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig;

const formatDay = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const ChartCard = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <section className="bg-card border rounded-lg shadow-sm">
    <div className="p-4 border-b border-border/60">
      <h2 className="text-lg font-semibold text-card-foreground">{title}</h2>
    </div>
    <div className="p-4">{children}</div>
  </section>
);

const ChartError = ({ message }: { message: string }) => (
  <div className="flex min-h-[240px] items-center justify-center rounded-md border border-dashed border-border p-6 text-center">
    <p className="text-sm text-muted-foreground">{message}</p>
  </div>
);

const Live = () => {
  useEffect(() => {
    trackEvent("live_stats_viewed");
    trackMetric("count", "hogshop.live_stats.viewed", 1, {
      attributes: { device_type: deviceType() },
    });
  }, []);

  const { data, isLoading, isError } = useQuery<LiveStats>({
    queryKey: ["live-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("live-stats");
      if (error) throw error;
      if (!data) throw new Error("No data returned");
      return data as LiveStats;
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const traffic = (data?.traffic ?? []).map((row) => ({
    ...row,
    product_views: Number(row.product_views ?? 0),
    visitors: Number(row.visitors ?? 0),
  }));

  const funnelSteps = data?.funnel
    ? [
        { step: "Product viewed", value: Number(data.funnel.product_viewed ?? 0) },
        { step: "Added to cart", value: Number(data.funnel.added_to_cart ?? 0) },
        { step: "Checkout started", value: Number(data.funnel.checkout_started ?? 0) },
        { step: "Purchased", value: Number(data.funnel.purchased ?? 0) },
      ]
    : [];

  const firstStep = funnelSteps[0]?.value ?? 0;
  const funnelData = funnelSteps.map((s) => ({
    ...s,
    label:
      firstStep > 0
        ? `${s.value.toLocaleString()} · ${Math.round((s.value / firstStep) * 100)}%`
        : s.value.toLocaleString(),
  }));

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <Header />

      <main className="mx-auto px-4 py-12 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Live stats</h1>
          <p className="text-lg text-muted-foreground">
            HogShop is a demo store. The traffic here is synthetic, but the analytics are real — these
            charts are rendered from PostHog Endpoints, saved queries on our own project served
            straight to this page. The numbers refresh every 15 minutes, so browse a product, come
            back a little later, and watch yourself appear in them.
          </p>
        </div>

        <div className="space-y-8">
          <ChartCard title="Visitors & product views — last 14 days">
            {isLoading ? (
              <Skeleton className="h-[320px] w-full" />
            ) : isError ? (
              <ChartError message="We couldn't load the traffic chart right now. Please try again in a few minutes." />
            ) : traffic.length === 0 ? (
              <ChartError message="No traffic data available yet." />
            ) : (
              <ChartContainer config={trafficConfig} className="h-[320px] w-full">
                <AreaChart data={traffic} margin={{ left: 4, right: 12, top: 8 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="day"
                    tickFormatter={formatDay}
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    minTickGap={16}
                  />
                  <YAxis tickLine={false} axisLine={false} width={40} />
                  <ChartTooltip
                    content={<ChartTooltipContent labelFormatter={(v) => formatDay(String(v))} />}
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Area
                    dataKey="product_views"
                    type="monotone"
                    stroke="var(--color-product_views)"
                    fill="var(--color-product_views)"
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                  <Area
                    dataKey="visitors"
                    type="monotone"
                    stroke="var(--color-visitors)"
                    fill="var(--color-visitors)"
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
            )}
          </ChartCard>

          <ChartCard title="Purchase funnel — last 30 days">
            {isLoading ? (
              <Skeleton className="h-[320px] w-full" />
            ) : isError ? (
              <ChartError message="We couldn't load the funnel chart right now. Please try again in a few minutes." />
            ) : funnelData.length === 0 ? (
              <ChartError message="No funnel data available yet." />
            ) : (
              <ChartContainer config={funnelConfig} className="h-[320px] w-full">
                <BarChart
                  data={funnelData}
                  layout="vertical"
                  margin={{ left: 4, right: 64, top: 8, bottom: 8 }}
                >
                  <CartesianGrid horizontal={false} />
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="step"
                    tickLine={false}
                    axisLine={false}
                    width={110}
                    tickMargin={4}
                  />
                  <ChartTooltip content={<ChartTooltipContent hideLabel={false} />} />
                  <Bar dataKey="value" fill="var(--color-value)" radius={4}>
                    <LabelList
                      dataKey="label"
                      position="right"
                      className="fill-foreground"
                      fontSize={12}
                    />
                  </Bar>
                </BarChart>
              </ChartContainer>
            )}
          </ChartCard>
        </div>
      </main>
    </div>
  );
};

export default Live;
