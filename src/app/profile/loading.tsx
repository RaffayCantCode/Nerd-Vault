import { RouteLoader } from "@/components/route-loader";

export default function ProfileLoading() {
  return (
    <div className="workspace">
      <RouteLoader label="Loading profile..." />
    </div>
  );
}
