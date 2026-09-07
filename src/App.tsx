import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DemoProvider } from './context/DemoContext';
import { MainLayout } from './layouts/MainLayout';

import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { CommandCenterPage } from './pages/CommandCenterPage';
import { LiveSurveillancePage } from './pages/LiveSurveillancePage';
import { TacticalMapPage } from './pages/TacticalMapPage';
import { AlertsPage } from './pages/AlertsPage';
import { TargetTrackingPage } from './pages/TargetTrackingPage';
import { VirtualFencePage } from './pages/VirtualFencePage';
import { EdgeNodePage } from './pages/EdgeNodePage';
import { EvidenceVaultPage } from './pages/EvidenceVaultPage';
import { EnvironmentalPage } from './pages/EnvironmentalPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { DataFlowPage } from './pages/DataFlowPage';
import { ReportsPage } from './pages/ReportsPage';

import { RbacGuard } from './components/common/RbacGuard';

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <DemoProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Standalone Landing and Login Pages */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/landing" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />

            {/* Tactical Console Dashboard Routes */}
            <Route element={<MainLayout />}>
              <Route path="/dashboard" element={<CommandCenterPage />} />
              <Route path="/command-center" element={<CommandCenterPage />} />
              <Route path="/surveillance" element={<LiveSurveillancePage />} />
              <Route path="/map" element={<TacticalMapPage />} />
              <Route path="/alerts" element={<AlertsPage />} />
              <Route
                path="/targets"
                element={
                  <RbacGuard requiredRole="OPERATOR" fallbackTitle="TARGET INTELLIGENCE & TRACKING RESTRICTED" fallbackDescription="Target vector tracking, Kalman predictions, and optical telemetry are restricted to OPERATOR and ADMIN clearance levels.">
                    <TargetTrackingPage />
                  </RbacGuard>
                }
              />
              <Route
                path="/targets/:id"
                element={
                  <RbacGuard requiredRole="OPERATOR" fallbackTitle="TARGET INTELLIGENCE & TRACKING RESTRICTED" fallbackDescription="Target vector tracking, Kalman predictions, and optical telemetry are restricted to OPERATOR and ADMIN clearance levels.">
                    <TargetTrackingPage />
                  </RbacGuard>
                }
              />
              
              {/* Operator & Admin Authorized Modules */}
              <Route
                path="/virtual-fence"
                element={
                  <RbacGuard requiredRole="OPERATOR" fallbackTitle="VIRTUAL FENCE CALIBRATION LOCKED">
                    <VirtualFencePage />
                  </RbacGuard>
                }
              />
              <Route path="/evidence" element={<EvidenceVaultPage />} />
              <Route path="/environment" element={<EnvironmentalPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              
              {/* Admin (Commander) Exclusive Modules */}
              <Route
                path="/edge-node"
                element={
                  <RbacGuard requiredRole="ADMIN" fallbackTitle="HARDWARE & EDGE NODE MANAGEMENT RESTRICTED">
                    <EdgeNodePage />
                  </RbacGuard>
                }
              />
              <Route
                path="/data-flow"
                element={
                  <RbacGuard requiredRole="ADMIN" fallbackTitle="SYSTEM DATA PIPELINE CONTROL RESTRICTED">
                    <DataFlowPage />
                  </RbacGuard>
                }
              />
              <Route path="/reports" element={<ReportsPage />} />
            </Route>

            {/* Fallback Redirect */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </DemoProvider>
    </AuthProvider>
  );
};

export default App;
