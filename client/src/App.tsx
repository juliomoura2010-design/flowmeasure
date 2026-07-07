import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import AccessGate from "./components/AccessGate";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Dashboard from "./pages/Dashboard";
import Fornecedores from "./pages/Fornecedores";
import Medicoes from "./pages/Medicoes";
import Pedidos from "./pages/Pedidos";
import Relatorios from "./pages/Relatorios";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/pedidos" component={Pedidos} />
      <Route path="/medicoes" component={Medicoes} />
      <Route path="/fornecedores" component={Fornecedores} />
      <Route path="/relatorios" component={Relatorios} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <AccessGate>
            <Router />
          </AccessGate>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
