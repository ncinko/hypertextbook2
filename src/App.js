import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import LandingPage from './LandingPage';
import DoublePendulum from './DoublePendulum';
import SpringMass from './SpringMass';
import IdealGas from './IdealGas';
import Oscillations from "./pages/Oscillations";
import ElectricFields from "./pages/ElectricFields";
import RotationalDynamics from "./pages/RotationalDynamics"
import Chaos from "./pages/Chaos"
import './styles/main.css';

export default function App() {
    return (
        <div>
            <nav className="navbar">
                <div className="nav-container">
                    <Link to="/" className="nav-logo">Physics Nook</Link>
                    <div className="nav-links">
                        <Link to="/chaos" className="nav-item">Chaos</Link>
                        <Link to="/oscillations" className="nav-item">Oscillation</Link>
                        <Link to="/electric-fields" className="nav-item">Fields</Link>
                        <Link to="/ideal-gas" className="nav-item">Thermo</Link>
                    </div>
                </div>
            </nav>
            <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/double-pendulum" element={<DoublePendulum />} />
                <Route path="/spring-mass" element={<SpringMass />} />
                <Route path="/ideal-gas" element={<IdealGas />} />
				<Route path="/oscillations" element={<Oscillations />} />
                <Route path="/electric-fields" element={<ElectricFields/>} />
                <Route path="/rotational-dynamics" element={<RotationalDynamics/>} />
                <Route path="/chaos" element={<Chaos/>} />
            </Routes>
        </div>
    );
}
