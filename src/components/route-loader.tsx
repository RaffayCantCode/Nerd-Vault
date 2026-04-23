import { NVLoader } from "@/components/nv-loader";

type RouteLoaderProps = {
  label: string;
  className?: string;
};

export function RouteLoader({ label, className = "" }: RouteLoaderProps) {
  return (
    <section className={`route-loading route-loading-full glass ${className}`.trim()}>
      <NVLoader label={label} />
    </section>
  );
}
