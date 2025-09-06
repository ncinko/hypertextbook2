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
import Kinematics2 from "./pages/Kinematics2"
import PolarKinematics from "./pages/PolarKinematics";

import './styles/main.css';

export default function App() {
    return (
        <div>
            <nav className="navbar">
  <div className="nav-container">
    <Link to="/" className="nav-logo">Physics Nook</Link>
    <div className="nav-links">

      {/* Mechanics Dropdown */}
      <div className="nav-dropdown">
        <span className="nav-item">Mechanics ▾</span>
        <div className="dropdown-content">
          <Link to="/kinematics">1D Kinematics</Link>
          <Link to="/momentum">Momentum</Link>
          <Link to="/oscillations">Oscillations</Link>
        </div>
      </div>

      {/* Fields Dropdown */}
      <div className="nav-dropdown">
        <span className="nav-item">Fields ▾</span>
        <div className="dropdown-content">
          <Link to="/electric-fields">Electric Fields</Link>
        </div>
      </div>

      {/* Advanced Dropdown */}
      <div className="nav-dropdown">
        <span className="nav-item">Advanced ▾</span>
        <div className="dropdown-content">
          <Link to="/chaos">Chaos</Link>
        </div>
      </div>

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
                <Route path="/kinematics2" element={<Kinematics2 />} />
                <Route path="/kk" element={<PolarKinematics />} />
            </Routes>
        </div>
    );
}
