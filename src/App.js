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
import Momentum from "./pages/Momentum"
import Sound from "./pages/Sound"
import Kinematics from "./pages/Kinematics"
import PolarKinematics from "./pages/PolarKinematics";

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
                        <Link to="/momentum" className="nav-item">Momentum</Link>
                        <Link to="/kinematics" className="nav-item">Kinematics</Link>
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
                <Route path="/momentum" element={<Momentum/>} />
                <Route path="/sound" element={<Sound/>} />
                <Route path="/kinematics" element={<Kinematics />} />
                <Route path="/kk" element={<PolarKinematics />} />
            </Routes>
        </div>
    );
}
