import { BrowserRouter, Routes, Route, HashRouter } from 'react-router-dom';
import { Home } from './pages/Home.js';
import { SkillDetail } from './pages/SkillDetail.js';

export function App() {
    return (
        <HashRouter>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/skills/:name" element={<SkillDetail />} />
            </Routes>
        </HashRouter>
    );
}
