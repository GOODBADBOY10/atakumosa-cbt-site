import { LogoutButton } from "./LogoutButton";

export function DashboardHeader({
  title,
  userName,
}: {
  title: string;
  userName?: string;
}) {
  return (
    <div className="flex items-center justify-between mb-6 pb-4 border-b">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
        {userName && (
          <p className="text-sm text-gray-500">Logged in as {userName}</p>
        )}
      </div>
      <LogoutButton />
    </div>
  );
}