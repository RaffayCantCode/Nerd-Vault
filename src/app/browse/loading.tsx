import { RouteLoader } from "@/components/route-loader";

export default function BrowseLoading() {
  return (
    <div className="workspace">
      <RouteLoader label="Loading browse..." />
    </div>
  );
}
