import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ChatPage } from './pages/ChatPage';
import { ConfigPage } from './pages/ConfigPage';
import { SkillsPage } from './pages/SkillsPage';
import { PluginsPage } from './pages/PluginsPage';
import { HistoryPage } from './pages/HistoryPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<ChatPage />} />
        <Route path="config" element={<ConfigPage />} />
        <Route path="skills" element={<SkillsPage />} />
        <Route path="plugins" element={<PluginsPage />} />
        <Route path="history" element={<HistoryPage />} />
        {/* 404 重定向 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
