import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute, RoleBased } from "@/components/ProtectedRoute";
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
import VenueArchive from "./pages/VenueArchive";
import VenueForm from "./pages/VenueForm";
import VenueDetail from "./pages/VenueDetail";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";

import NotFound from "./pages/NotFound";

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
            
            {/* Protected standalone routes */}
            <Route 
              path="/trainerpartner" 
              element={
                <ProtectedRoute requiredRoles={['TRAINER']}>
                  <TrainerPartner />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/org" 
              element={
                <ProtectedRoute requiredRoles={['TRAINING_COORDINATOR', 'POLWEL']}>
                  <OrganizationDashboard />
                </ProtectedRoute>
              } 
            />
            
            {/* Protected main application routes */}
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Home />} />
              
              {/* User Management - Different roles for different sections */}
              <Route 
                path="users" 
                element={
                  <ProtectedRoute requiredRoles={['POLWEL', 'TRAINING_COORDINATOR']}>
                    <UserManagement />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="polwel-users" 
                element={
                  <ProtectedRoute requiredRoles={['POLWEL']}>
                    <PolwelUsers />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="clients" 
                element={
                  <ProtectedRoute requiredRoles={['POLWEL', 'TRAINING_COORDINATOR']}>
                    <UserManagement />
                  </ProtectedRoute>
                } 
              />
              
              {/* Trainer Management */}
              <Route 
                path="trainers" 
                element={
                  <ProtectedRoute requiredRoles={['POLWEL', 'TRAINING_COORDINATOR']}>
                    <TrainersAndPartners />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="trainers/:id" 
                element={
                  <ProtectedRoute requiredRoles={['POLWEL', 'TRAINING_COORDINATOR', 'TRAINER']}>
                    <TrainerDetail />
                  </ProtectedRoute>
                } 
              />
              <Route path="learners" element={<UserManagement />} />
              
              {/* Organization Management */}
              <Route 
                path="client-organisations" 
                element={
                  <ProtectedRoute requiredRoles={['POLWEL']}>
                    <ClientOrganisations />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="client-organisations/:id" 
                element={
                  <ProtectedRoute requiredRoles={['POLWEL', 'TRAINING_COORDINATOR']}>
                    <ClientOrganisationDetail />
                  </ProtectedRoute>
                } 
              />
              
              {/* Course Management */}
              <Route 
                path="course-creation" 
                element={
                  <ProtectedRoute requiredRoles={['POLWEL', 'TRAINING_COORDINATOR']}>
                    <CourseArchive />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="course-creation/new" 
                element={
                  <ProtectedRoute requiredRoles={['POLWEL', 'TRAINING_COORDINATOR']}>
                    <CourseForm />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="course-creation/edit/:id" 
                element={
                  <ProtectedRoute requiredRoles={['POLWEL', 'TRAINING_COORDINATOR']}>
                    <CourseForm />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="course-creation/view/:id" 
                element={
                  <ProtectedRoute>
                    <CourseForm />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="course-creation/detail/:id" 
                element={
                  <ProtectedRoute>
                    <CourseDetail />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="course-detail/:id" 
                element={
                  <ProtectedRoute>
                    <CourseDetail />
                  </ProtectedRoute>
                } 
              />
              
              {/* Venue Management */}
              <Route 
                path="venue-setup" 
                element={
                  <ProtectedRoute requiredRoles={['POLWEL', 'TRAINING_COORDINATOR']}>
                    <VenueArchive />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="venue-setup/new" 
                element={
                  <ProtectedRoute requiredRoles={['POLWEL', 'TRAINING_COORDINATOR']}>
                    <VenueForm />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="venue-setup/edit/:id" 
                element={
                  <ProtectedRoute requiredRoles={['POLWEL', 'TRAINING_COORDINATOR']}>
                    <VenueForm />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="venue-setup/view/:id" 
                element={
                  <ProtectedRoute>
                    <VenueForm />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="venue-detail/:id" 
                element={
                  <ProtectedRoute>
                    <VenueDetail />
                  </ProtectedRoute>
                } 
              />
              
              {/* Settings - Admin only */}
              <Route 
                path="settings" 
                element={
                  <ProtectedRoute requiredRoles={['POLWEL']}>
                    <UserManagement />
                  </ProtectedRoute>
                } 
              />
            </Route>
            
            {/* 404 page */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
