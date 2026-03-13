import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import DashboardPage from "@/pages/dashboard-page";
import ReceptionPage from "@/pages/reception-page";
import LotDetailPage from "@/pages/lot-detail-page";
import SensorsPage from "@/pages/sensors-page";
import SimulationsPage from "@/pages/simulations-page";
import NewSimulationPage from "@/pages/new-simulation-page";
import SimulationDetailPage from "@/pages/simulation-detail-page";
import ProductionPage from "@/pages/production-page";
import VerificationPage from "@/pages/verification-page";
import TraceabilityPage from "@/pages/traceability-page";
import AlertsPage from "@/pages/alerts-page";
import ConfigPage from "@/pages/config-page";
import { useAuth } from "@/hooks/use-auth";
import EspectrometroPage from "@/pages/espectrometro-page";

const sidebarStyle = {
  "--sidebar-width": "15rem",
  "--sidebar-width-icon": "3.5rem",
};

function AppLayout() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-sm text-muted-foreground">Inicializando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Switch>
        <Route path="/auth" component={AuthPage} />
        <Route component={AuthPage} />
      </Switch>
    );
  }

  return (
    <SidebarProvider style={sidebarStyle as React.CSSProperties}>
      <div className="flex h-screen w-full overflow-hidden">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center h-12 px-4 border-b border-border bg-background flex-shrink-0">
            <SidebarTrigger
              data-testid="button-sidebar-toggle"
              className="text-muted-foreground"
            />
          </header>
          <main className="flex-1 overflow-auto">
            <Switch>
              <ProtectedRoute path="/" component={DashboardPage} />
              <ProtectedRoute path="/recepcion" component={ReceptionPage} />
              <ProtectedRoute path="/recepcion/:id" component={LotDetailPage} />
              <ProtectedRoute path="/sensores" component={SensorsPage} />
              <ProtectedRoute
                path="/simulaciones"
                component={SimulationsPage}
              />
              <ProtectedRoute
                path="/simulaciones/nueva"
                component={NewSimulationPage}
              />
              <ProtectedRoute
                path="/simulaciones/:id"
                component={SimulationDetailPage}
              />
              <ProtectedRoute path="/produccion" component={ProductionPage} />
              <ProtectedRoute
                path="/verificacion"
                component={VerificationPage}
              />
              <ProtectedRoute
                path="/trazabilidad"
                component={TraceabilityPage}
              />
              <ProtectedRoute path="/alertas" component={AlertsPage} />
              <ProtectedRoute path="/configuracion" component={ConfigPage} />
              <ProtectedRoute
                path="/espectrometro"
                component={EspectrometroPage}
              />
              <Route component={NotFound} />
            </Switch>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <AppLayout />
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
