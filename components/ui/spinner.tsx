import { Loader2 } from "lucide-react";

export function Spinner({ size = 24 }: { size?: number }) {
  return (
    <div className="flex items-center justify-center">
      <Loader2 size={size} className="text-smoke animate-spin" />
    </div>
  );
}
