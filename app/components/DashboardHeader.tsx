import Link from "next/link";
import { LogoutButton } from "./LogoutButton";

export function DashboardHeader({
  title,
  userName,
  backHref = "/",
  backLabel = "← Dashboard",
}: {
  title: string;
  userName?: string;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="mb-6 pb-4 border-b">
      <div className="flex items-center justify-between mb-3">
        <Link href={backHref} className="text-sm text-blue-600 hover:underline">
          {backLabel}
        </Link>
        <LogoutButton />
      </div>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {userName && (
          <p className="text-sm text-gray-500">Logged in as {userName}</p>
        )}
      </div>
    </div>
  );
}