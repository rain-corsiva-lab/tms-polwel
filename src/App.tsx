import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./pages/Layout";
import Home from "./pages/Home";

import UserManagement from "./pages/UserManagement";
import PolwelUsers from "./pages/PolwelUsers";
import TrainersAndPartners from "./pages/TrainersAndPartners";
import TrainerDetail from "./pages/TrainerDetail";
import TrainerPartner from "./pages/TrainerPartner";
import ClientOrganisations from "./pages/ClientOrganisations";
import ClientOrganisationDetail from "./pages/ClientOrganisationDetail";
import OrganizationDashboard from "./pages/OrganizationDashboard";
import CourseArchive from "./pages/CourseArchive";
import CourseForm from "./pages/CourseForm";
import CourseDetail from "./pages/CourseDetail";
import CourseRunManagement from "./pages/CourseRunManagement";
import CourseRunsOverview from "./pages/CourseRunsOverview";
import VenueArchive from "./pages/VenueArchive";
import VenueForm from "./pages/VenueForm";
import VenueDetail from "./pages/VenueDetail";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import CompleteSetup from "./pages/CompleteSetup";

import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public route - Login page */}
            <Route path="/login" element={<Login />} />
            
            {/* Public route - Password Reset */}
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            
            {/* Public route - Complete Setup */}
            <Route path="/onboarding/:token" element={<CompleteSetup />} />
            
            {/* Standalone routes */}
            <Route path="/trainerpartner" element={<TrainerPartner />} />
            <Route path="/org" element={<OrganizationDashboard />} />
            
            {/* Main application routes */}
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              
              {/* User Management */}
              <Route path="users" element={<UserManagement />} />
              <Route path="polwel-users" element={<PolwelUsers />} />
              <Route path="clients" element={<UserManagement />} />
              
              {/* Trainer Management */}
              <Route path="trainers" element={<TrainersAndPartners />} />
              <Route path="trainers/:id" element={<TrainerDetail />} />
              <Route path="learners" element={<UserManagement />} />
              
              {/* Organization Management */}
              <Route path="client-organisations" element={<ClientOrganisations />} />
              <Route path="client-organisations/:id" element={<ClientOrganisationDetail />} />
              
              {/* Course Management */}
              <Route path="course-creation" element={<CourseArchive />} />
              <Route path="course-creation/new" element={<CourseForm />} />
              <Route path="course-creation/edit/:id" element={<CourseForm />} />
              <Route path="course-creation/view/:id" element={<CourseForm />} />
              <Route path="course-creation/detail/:id" element={<CourseDetail />} />
              <Route path="course-detail/:id" element={<CourseDetail />} />
              
              {/* Course Run Management */}
              <Route path="course-runs" element={<CourseRunsOverview />} />
              <Route path="course-runs/:courseId" element={<CourseRunManagement />} />
              <Route path="course-runs/:courseId/:runId" element={<CourseRunManagement />} />
              
              {/* Venue Management */}
              <Route path="venue-setup" element={<VenueArchive />} />
              <Route path="venue-setup/new" element={<VenueForm />} />
              <Route path="venue-setup/edit/:id" element={<VenueForm />} />
              <Route path="venue-setup/view/:id" element={<VenueForm />} />
              <Route path="venue-detail/:id" element={<VenueDetail />} />
              
              {/* Settings */}
              <Route path="settings" element={<UserManagement />} />
            </Route>
            
            {/* Standalone routes */}
            <Route path="/trainerpartner" element={<TrainerPartner />} />
            <Route path="/org" element={<OrganizationDashboard />} />
            
            {/* Keep login routes for potential future use */}
            <Route path="/login" element={<Login />} />
            <Route path="/reset-password/:token" element={<ResetPassword />} />
            
            {/* 404 page */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
