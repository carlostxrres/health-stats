import { Outlet } from "react-router-dom";

export function ViewPage() {
  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col items-center">
        <Outlet />
      </div>
    </div>
  );
}
