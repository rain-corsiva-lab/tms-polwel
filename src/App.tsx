import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute, RoleBased } from "@/components/ProtectedRoute";
import Layout from "./pages/Layout";
import Home from "./pages/Home";
import TrainerDashboard from "./pages/TrainerDashboard";
import Profile from "./pages/Profile";

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
import VenueArchive from "./pages/VenueArchive";
import VenueForm from "./pages/VenueForm";
import VenueDetail from "./pages/VenueDetail";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import CompleteSetup from "./pages/CompleteSetup";

import NotFound from "./pages/NotFound";
import Forbidden from "./pages/Forbidden";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
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

            {/* Protected standalone routes */}
            <Route
              path="/trainerpartner"
              element={
                <ProtectedRoute requiredRoles={["TRAINER"]}>
                  <TrainerPartner />
                </ProtectedRoute>
              }
            />
            <Route
              path="/org"
              element={
                <ProtectedRoute requiredRoles={["TRAINING_COORDINATOR", "POLWEL"]}>
                  <OrganizationDashboard />
                </ProtectedRoute>
              }
            />

            {/* Main application routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="profile" element={<Profile />} />
              <Route index element={<Home />} />

              {/* Trainer Dashboard */}
              <Route path="trainer-dashboard" element={<TrainerDashboard />} />

              {/* User Management */}
              <Route path="users" element={<UserManagement />} />
              <Route
                path="polwel-users"
                element={
                  <ProtectedRoute requiredPermissions={["users.view"]}>
                    <PolwelUsers />
                  </ProtectedRoute>
                }
              />
              <Route path="clients" element={<UserManagement />} />

              {/* Trainer Management */}
              <Route
                path="trainers"
                element={
                  <ProtectedRoute requiredPermissions={["trainers.view"]}>
                    <TrainersAndPartners />
                  </ProtectedRoute>
                }
              />
              <Route
                path="trainers/:id"
                element={
                  <ProtectedRoute requiredPermissions={["trainers.view"]}>
                    <TrainerDetail />
                  </ProtectedRoute>
                }
              />
              <Route path="learners" element={<UserManagement />} />

              {/* Organization Management */}
              <Route
                path="client-organisations"
                element={
                  <ProtectedRoute requiredPermissions={["clients.view"]}>
                    <ClientOrganisations />
                  </ProtectedRoute>
                }
              />
              <Route
                path="client-organisations/:id"
                element={
                  <ProtectedRoute requiredPermissions={["clients.view"]}>
                    <ClientOrganisationDetail />
                  </ProtectedRoute>
                }
              />

              {/* Course Management */}
              <Route
                path="course-creation"
                element={
                  <ProtectedRoute requiredRoles={["POLWEL", "TRAINING_COORDINATOR"]} requiredPermissions={["courses.view"]}>
                    <CourseArchive />
                  </ProtectedRoute>
                }
              />
              <Route
                path="course-creation/new"
                element={
                  <ProtectedRoute requiredRoles={["POLWEL", "TRAINING_COORDINATOR"]} requiredPermissions={["courses.create"]}>
                    <CourseForm />
                  </ProtectedRoute>
                }
              />
              <Route
                path="course-creation/edit/:id"
                element={
                  <ProtectedRoute requiredRoles={["POLWEL", "TRAINING_COORDINATOR"]} requiredPermissions={["courses.edit"]}>
                    <CourseForm />
                  </ProtectedRoute>
                }
              />
              <Route
                path="course-creation/view/:id"
                element={
                  <ProtectedRoute requiredPermissions={["courses.view"]}>
                    <CourseForm />
                  </ProtectedRoute>
                }
              />
              <Route
                path="course-creation/detail/:id"
                element={
                  <ProtectedRoute requiredPermissions={["courses.view"]}>
                    <CourseDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="course-detail/:id"
                element={
                  <ProtectedRoute requiredPermissions={["courses.view"]}>
                    <CourseDetail />
                  </ProtectedRoute>
                }
              />

              {/* Venue Management */}
              <Route
                path="venue-setup"
                element={
                  <ProtectedRoute requiredPermissions={["venues.view"]}>
                    <VenueArchive />
                  </ProtectedRoute>
                }
              />
              <Route
                path="venue-setup/new"
                element={
                  <ProtectedRoute requiredPermissions={["venues.create"]}>
                    <VenueForm />
                  </ProtectedRoute>
                }
              />
              <Route
                path="venue-setup/edit/:id"
                element={
                  <ProtectedRoute requiredPermissions={["venues.edit"]}>
                    <VenueForm />
                  </ProtectedRoute>
                }
              />
              <Route
                path="venue-setup/view/:id"
                element={
                  <ProtectedRoute requiredPermissions={["venues.view"]}>
                    <VenueForm />
                  </ProtectedRoute>
                }
              />
              <Route
                path="venue-detail/:id"
                element={
                  <ProtectedRoute requiredPermissions={["venues.view"]}>
                    <VenueDetail />
                  </ProtectedRoute>
                }
              />

              {/* Settings */}
              <Route path="settings" element={<UserManagement />} />
            </Route>

            {/* 404 page */}
            <Route path="403" element={<Forbidden />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
