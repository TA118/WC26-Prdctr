import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import App from './App.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { PredictionPage } from './pages/PredictionPage.tsx';
import { FullWCHubPage } from './pages/FullWCHubPage.tsx';
import { FullPredictionPage } from './pages/FullPredictionPage.tsx';
import { RulesPage } from './pages/RulesPage.tsx';
import { MyGroupsPage } from './pages/MyGroupsPage.tsx';
import { GroupLeaderboardPage } from './pages/GroupLeaderboardPage.tsx';
import { JoinGroupPage } from './pages/JoinGroupPage.tsx';
import { GlobalLeaderboardPage } from './pages/GlobalLeaderboardPage.tsx';
import { MemberPredictionPage } from './pages/MemberPredictionPage.tsx';
import { AuthProvider } from './context/AuthContext.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/simulator" element={<App />} />
        <Route path="/prediction" element={<PredictionPage />} />
        <Route path="/prediction/full" element={<FullWCHubPage />} />
        <Route path="/prediction/full/predict" element={<FullPredictionPage />} />
        <Route path="/prediction/full/rules" element={<RulesPage />} />
        <Route path="/prediction/full/groups" element={<MyGroupsPage />} />
        <Route path="/prediction/full/groups/:groupId" element={<GroupLeaderboardPage />} />
        <Route path="/prediction/full/groups/join/:groupId" element={<JoinGroupPage />} />
        <Route path="/prediction/full/groups/global" element={<GlobalLeaderboardPage />} />
        <Route path="/prediction/full/groups/:groupId/member/:userId" element={<MemberPredictionPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
    </AuthProvider>
  </StrictMode>,
);
