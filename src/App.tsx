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
import CourseRuns from "./pages/CourseRuns";
import CourseRunForm from "./pages/CourseRunForm";
import CourseRunDetail from "./pages/CourseRunDetail";
import VenueArchive from "./pages/VenueArchive";
import VenueForm from "./pages/VenueForm";
import VenueDetail from "./pages/VenueDetail";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import CompleteSetup from "./pages/CompleteSetup";
import PostRunManagement from "./pages/PostRunManagement";
import PostRunDetail from "./pages/PostRunDetail";
import BillingReports from "./pages/BillingReports";

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

            {/* Public route - Forgot Password */}
            <Route path="/forgot-password" element={<ForgotPassword />} />

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

              {/* Organisation Management */}
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
                path="courses"
                element={
                  <ProtectedRoute requiredRoles={["POLWEL", "TRAINING_COORDINATOR"]} requiredPermissions={["course-venue.view"]}>
                    <CourseArchive />
                  </ProtectedRoute>
                }
              />
              <Route
                path="courses/new"
                element={
                  <ProtectedRoute requiredRoles={["POLWEL", "TRAINING_COORDINATOR"]} requiredPermissions={["course-venue.create"]}>
                    <CourseForm />
                  </ProtectedRoute>
                }
              />
              <Route
                path="courses/edit/:id"
                element={
                  <ProtectedRoute requiredRoles={["POLWEL", "TRAINING_COORDINATOR"]} requiredPermissions={["course-venue.edit"]}>
                    <CourseForm />
                  </ProtectedRoute>
                }
              />
              <Route
                path="courses/view/:id"
                element={
                  <ProtectedRoute requiredPermissions={["course-venue.view"]}>
                    <CourseForm />
                  </ProtectedRoute>
                }
              />
              <Route
                path="courses/detail/:id"
                element={
                  <ProtectedRoute requiredPermissions={["course-venue.view"]}>
                    <CourseDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="course-detail/:id"
                element={
                  <ProtectedRoute requiredPermissions={["course-venue.view"]}>
                    <CourseDetail />
                  </ProtectedRoute>
                }
              />

              {/* Course Run Management */}
              <Route
                path="course-runs"
                element={
                  <ProtectedRoute requiredPermissions={["course-run.view"]}>
                    <CourseRuns />
                  </ProtectedRoute>
                }
              />
              <Route
                path="course-runs/new"
                element={
                  <ProtectedRoute requiredPermissions={["course-run.create"]}>
                    <CourseRunForm />
                  </ProtectedRoute>
                }
              />
              <Route
                path="course-runs/edit/:id"
                element={
                  <ProtectedRoute requiredPermissions={["course-run.edit"]}>
                    <CourseRunForm />
                  </ProtectedRoute>
                }
              />
              <Route
                path="course-runs/:id"
                element={
                  <ProtectedRoute requiredPermissions={["course-run.view"]}>
                    <CourseRunDetail />
                  </ProtectedRoute>
                }
              />

              <Route
                path="post-run-management"
                element={
                  <ProtectedRoute requiredPermissions={["post-course-run.view"]}>
                    <PostRunManagement />
                  </ProtectedRoute>
                }
              />
              <Route
                path="post-run/:id"
                element={
                  <ProtectedRoute requiredPermissions={["post-course-run.view"]}>
                    <PostRunDetail />
                  </ProtectedRoute>
                }
              />

              {/* Billing Reports */}
              <Route
                path="billing-reports"
                element={
                  <ProtectedRoute requiredPermissions={["post-course-run.view"]}>
                    <BillingReports />
                  </ProtectedRoute>
                }
              />

              {/* Venue Management */}
              <Route
                path="venue-setup"
                element={
                  <ProtectedRoute requiredPermissions={["course-venue.view"]}>
                    <VenueArchive />
                  </ProtectedRoute>
                }
              />
              <Route
                path="venue-setup/new"
                element={
                  <ProtectedRoute requiredPermissions={["course-venue.create"]}>
                    <VenueForm />
                  </ProtectedRoute>
                }
              />
              <Route
                path="venue-setup/edit/:id"
                element={
                  <ProtectedRoute requiredPermissions={["course-venue.edit"]}>
                    <VenueForm />
                  </ProtectedRoute>
                }
              />
              <Route
                path="venue-setup/view/:id"
                element={
                  <ProtectedRoute requiredPermissions={["course-venue.view"]}>
                    <VenueForm />
                  </ProtectedRoute>
                }
              />
              <Route
                path="venue-detail/:id"
                element={
                  <ProtectedRoute requiredPermissions={["course-venue.view"]}>
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
