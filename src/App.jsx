import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import { isConfigured } from './firebaseConfig.js';
import Layout from './components/Layout.jsx';
import AuthPage from './components/auth/AuthPage.jsx';
import Home from './components/home/Home.jsx';
import RoomPage from './components/lobby/RoomPage.jsx';
import ProfilePage from './components/profile/ProfilePage.jsx';
import Leaderboard from './components/leaderboard/Leaderboard.jsx';
import History from './components/history/History.jsx';
import MatchView from './components/history/MatchView.jsx';
import { Spinner } from './components/ui.jsx';
import Intro from './components/Intro.jsx';
import { useState } from 'react';

function Guard({ children }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading)
    return (
      <div className="min-h-screen grid place-items-center">
        <Spinner />
      </div>
    );
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname }} />;
  return children;
}

function SetupNotice() {
  return (
    <div className="min-h-screen grid place-items-center p-6">
      <div className="max-w-md">
        <h1 className="text-2xl font-medium">Connect Firebase first</h1>
        <p className="mt-3 text-sm text-fg2 leading-6">
          Open <code className="font-mono text-fg">src/firebaseConfig.js</code>, paste the web app config from your Firebase project and push
          again. The README walks through it step by step.
        </p>
      </div>
    </div>
  );
}

export default function App() {
  // opening animation, once per browser session
  const [intro, setIntro] = useState(() => sessionStorage.getItem('hc:intro') !== '1');
  const doneIntro = () => {
    sessionStorage.setItem('hc:intro', '1');
    setIntro(false);
  };
  if (intro) return <Intro onDone={doneIntro} />;
  if (!isConfigured) return <SetupNotice />;
  return (
    <Routes>
      <Route path="/login" element={<AuthPage />} />
      <Route
        path="/room/:code"
        element={
          <Guard>
            <RoomPage />
          </Guard>
        }
      />
      <Route
        element={
          <Guard>
            <Layout />
          </Guard>
        }
      >
        <Route path="/" element={<Home />} />
        <Route path="/profile/:uid" element={<ProfilePage />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/history" element={<History />} />
        <Route path="/match/:id" element={<MatchView />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
