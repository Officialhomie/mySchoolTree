import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { ReactNode, useState, useEffect } from 'react';

// Import page components
import HeroSection from './HeroSection';
import RoleSelectionPage from './RoleSelectionPage';
import SchoolAdminstratorDashboardPage from './SchoolAdminstratorDashboardPage';
import TeacherDashboardPage from './TeacherDashboardPage';
import StudentDashboard from './StudentDahboardPage';
import GuestDashboard from './GuestDashboard';

// Import role verification function
import { PREDEFINED_ROLES } from '../MSTReadfunction/AttendaceRead/hasRole';

// Define types
type RoleType = 'admin' | 'teacher' | 'student' | null;

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: RoleType;
}

// Role-based route protection component
const ProtectedRoute = ({ children, requiredRole = null }: ProtectedRouteProps) => {
  const { isConnected, address } = useAccount();
  const [isLoading, setIsLoading] = useState(true);
  const [hasRequiredRole, setHasRequiredRole] = useState(false);

  useEffect(() => {
    const checkRole = async () => {
      if (!requiredRole || !isConnected || !address) {
        setHasRequiredRole(false);
        setIsLoading(false);
        return;
      }

      try {
        // Map the role type to the corresponding role hash
        const roleHash = requiredRole === 'admin' ? PREDEFINED_ROLES.ADMIN_ROLE :
                        requiredRole === 'teacher' ? PREDEFINED_ROLES.TEACHER_ROLE :
                        requiredRole === 'student' ? PREDEFINED_ROLES.STUDENT_ROLE : null;

        if (!roleHash) {
          setHasRequiredRole(false);
          setIsLoading(false);
          return;
        }

        // TODO: Implement actual role verification using the contract
        // For now, we'll simulate a successful role check
        setHasRequiredRole(true);
      } catch (error) {
        console.error('Error checking role:', error);
        setHasRequiredRole(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkRole();
  }, [requiredRole, isConnected, address]);

  // If we're checking role status, show a loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-t-blue-500 border-blue-200/30 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300">Verifying access...</p>
        </div>
      </div>
    );
  }
  
  // If user is not connected, redirect to landing page
  if (!isConnected) {
    return <Navigate to="/" replace />;
  }
  
  // If role is required but user doesn't have it, redirect to role selection
  if (requiredRole && !hasRequiredRole) {
    return <Navigate to="/role-select" replace />;
  }
  
  // If all checks pass, render the protected content
  return <>{children}</>;
};

// Landing Page Component that includes HeroSection
const LandingPage = () => {
  return (
    <div className="min-h-screen bg-gray-900">
      <HeroSection />
    </div>
  );
};

// Main Router Component
const AppRouter = () => {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/role-select" element={<RoleSelectionPage />} />
        
        {/* Protected Routes with Role Verification */}
        <Route
          path="/admin-dashboard/*"
          element={
            <ProtectedRoute requiredRole="admin">
              <SchoolAdminstratorDashboardPage />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/teacher-dashboard/*"
          element={
            <ProtectedRoute requiredRole="teacher">
              <TeacherDashboardPage />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/student-dashboard/*"
          element={
            <ProtectedRoute requiredRole="student">
              <StudentDashboard />
            </ProtectedRoute>
          }
        />
        
        {/* Guest Access (No Protection) */}
        <Route path="/guest-dashboard/*" element={<GuestDashboard />} />
        
        {/* 404 Page */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default AppRouter;