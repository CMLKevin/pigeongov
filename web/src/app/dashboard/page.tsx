import type { Metadata } from "next";
import DashboardClient from "./dashboard-client";

export const metadata: Metadata = {
  title: "Dashboard | PigeonGov",
  description:
    "Your PigeonGov home screen. Track active workflows, upcoming deadlines, and quick actions.",
};

export default function DashboardPage() {
  return <DashboardClient />;
}
