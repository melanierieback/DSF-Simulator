import { Switch, Route, Router, Redirect } from "wouter";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DsfProvider } from "@/hooks/useDsfStore";
import { StoryModeProvider } from "@/contexts/storyMode";
import { GuidedModeProvider } from "@/contexts/guidedMode";
import { Layout } from "@/components/dsf/Layout";
import OverviewPage from "@/pages/overview";
import FinancialPage from "@/pages/financial";
import ImpactPage from "@/pages/impact";
import TheologyPage from "@/pages/theology";
import UnifiedPage from "@/pages/unified";
import CompanyPage from "@/pages/company";
import CooperativePage from "@/pages/cooperative";
import StructurePage from "@/pages/structure";
import TaxPage from "@/pages/tax";
import RevenuePage from "@/pages/revenue";
import LegalPage from "@/pages/legal";
import GuidedPage from "@/pages/guided";
import LPViewPage from "@/pages/lp";
import ErgodicityPage from "@/pages/ergodicity";
import NotFound from "@/pages/not-found";

const base = import.meta.env.BASE_URL.replace(/\/$/, "");

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={LPViewPage} />
      <Route path="/lp" component={LPViewPage} />
      <Route path="/guided" component={GuidedPage} />
      <Route path="/explore" component={OverviewPage} />
      <Route path="/financial" component={FinancialPage} />
      <Route path="/impact" component={ImpactPage} />
      <Route path="/theology" component={TheologyPage} />
      <Route path="/unified" component={UnifiedPage} />
      <Route path="/company" component={CompanyPage} />
      <Route path="/cooperative" component={CooperativePage} />
      <Route path="/structure" component={StructurePage} />
      <Route path="/tax" component={TaxPage} />
      <Route path="/revenue" component={RevenuePage} />
      <Route path="/legal" component={LegalPage} />
      <Route path="/ergodicity" component={ErgodicityPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <TooltipProvider>
      <StoryModeProvider>
        <GuidedModeProvider>
          <DsfProvider>
            <Router base={base}>
              <Layout>
                <AppRouter />
              </Layout>
            </Router>
          </DsfProvider>
        </GuidedModeProvider>
      </StoryModeProvider>
    </TooltipProvider>
  );
}

export default App;
