import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./pages/Layout";
import Dashboard from "./pages/Dashboard";
import UserManagement from "./pages/UserManagement";
import PolwelUsers from "./pages/PolwelUsers";
import TrainersAndPartners from "./pages/TrainersAndPartners";
import TrainerDetail from "./pages/TrainerDetail";
import TrainerPartner from "./pages/TrainerPartner";
import ClientOrganisations from "./pages/ClientOrganisations";
import ClientOrganisationDetail from "./pages/ClientOrganisationDetail";
import OrganizationDashboard from "./pages/OrganizationDashboard";
import Login from "./pages/Login";

import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/trainerpartner" element={<TrainerPartner />} />
          <Route path="/org" element={<OrganizationDashboard />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="polwel-users" element={<PolwelUsers />} />
            <Route path="clients" element={<UserManagement />} />
            <Route path="trainers" element={<TrainersAndPartners />} />
            <Route path="trainers/:id" element={<TrainerDetail />} />
            <Route path="learners" element={<UserManagement />} />
            <Route path="client-organisations" element={<ClientOrganisations />} />
            <Route path="client-organisations/:id" element={<ClientOrganisationDetail />} />
            
            <Route path="settings" element={<UserManagement />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
