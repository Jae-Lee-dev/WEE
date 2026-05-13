import {
  DashboardAiMonitoringScreen,
  DashboardLocationsScreen,
  DashboardScreen,
  DashboardWorkersScreen,
} from "@/features/dashboard";

export function DashboardPage() {
  return <DashboardScreen />;
}

export function DashboardLocationsPage() {
  return <DashboardLocationsScreen />;
}

export function DashboardWorkersPage() {
  return <DashboardWorkersScreen />;
}

export function DashboardAiMonitoringPage() {
  return <DashboardAiMonitoringScreen />;
}
