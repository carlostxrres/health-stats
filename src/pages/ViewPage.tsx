import { Outlet } from "react-router-dom";
import { ViewSelector } from "@/components/ViewSelector";

export function ViewPage() {
  return (
    <div className="flex flex-1 flex-col">
      <ViewSelector />
      <div className="flex flex-1 flex-col items-center">
        <Outlet />
      </div>
    </div>
  );
}
