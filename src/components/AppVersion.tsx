import { APP_VERSION, BUILD_TIME } from "@/version";

const formatBuild = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const date = d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `${date}, ${time}`;
};

export const AppVersion = ({ className = "" }: { className?: string }) => (
  <p id="app-version" data-version={APP_VERSION} className={`text-[11px] text-muted-foreground/70 text-center ${className}`}>
    v{APP_VERSION} · built {formatBuild(BUILD_TIME)}
  </p>
);
