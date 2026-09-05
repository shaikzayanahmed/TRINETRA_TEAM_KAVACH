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
              <Route path="/targets" element={<TargetTrackingPage />} />
              <Route path="/targets/:id" element={<TargetTrackingPage />} />
              <Route path="/virtual-fence" element={<VirtualFencePage />} />
              <Route path="/edge-node" element={<EdgeNodePage />} />
              <Route path="/evidence" element={<EvidenceVaultPage />} />
              <Route path="/environment" element={<EnvironmentalPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/data-flow" element={<DataFlowPage />} />
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
