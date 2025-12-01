import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import RoleSelection from "./pages/RoleSelection";
import Admin from "./pages/Admin";
import PendingAdvisors from "./pages/PendingAdvisors";
import AdvisorTools from "./pages/AdvisorTools";
import Planner from "./pages/Planner";
import Transcript from "./pages/Transcript";
import Messages from "./pages/Messages";
import PendingApprovals from "./pages/PendingApprovals";
import NotFound from "./pages/NotFound";
import AdvisorSuggestionsReview from "./pages/AdvisorSuggestionsReview";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/role-selection" element={<RoleSelection />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/pending-advisors" element={<PendingAdvisors />} />
          <Route path="/planner" element={<Planner />} />
          <Route path="/transcript" element={<Transcript />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/advisor-tools" element={<AdvisorTools />} />
          <Route path="/pending-approvals" element={<PendingApprovals />} />
          <Route
            path="/advisor-suggestions-review"
            element={<AdvisorSuggestionsReview />}
          />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
