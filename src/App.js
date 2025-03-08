import React from 'react';
import './styles.css';
import { Routes, Route, Link } from 'react-router-dom';
import LandingPage from './LandingPage';
import DoublePendulum from './DoublePendulum';
import SpringMass from './SpringMass';
import IdealGas from './IdealGas';

export default function App() {
    return (
        <div>
            <nav className="navbar">
                <div className="nav-container">
                    <Link to="/" className="nav-logo">Physics Nook</Link>
                    <div className="nav-links">
                        <Link to="/double-pendulum" className="nav-item">Chaos</Link>
                        <Link to="/spring-mass" className="nav-item">Oscillation</Link>
                        <Link to="/ideal-gas" className="nav-item">Thermo</Link>
                    </div>
                </div>
            </nav>
            <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/double-pendulum" element={<DoublePendulum />} />
                <Route path="/spring-mass" element={<SpringMass />} />
                <Route path="/ideal-gas" element={<IdealGas />} />
            </Routes>
        </div>
    );
}
