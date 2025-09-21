import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import LandingPage from './LandingPage';
import DoublePendulum from './DoublePendulum';
import SpringMass from './SpringMass';
import IdealGas from './IdealGas';
import Oscillations from "./pages/Oscillations";
import ElectricField from "./pages/ElectricField";
import ElectricPotential from "./pages/ElectricPotential"
import RotationalDynamics from "./pages/RotationalDynamics"
import Chaos from "./pages/Chaos"
import Momentum from "./pages/Momentum"
import Sound from "./pages/Sound"
import Kinematics from "./pages/Kinematics"
import Kinematics2 from "./pages/Kinematics2"
import PolarKinematics from "./pages/PolarKinematics";
import Vectors from "./pages/Vectors";
import Forces from "./pages/Forces";

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
          <Link to="/forces">Forces</Link>
          <Link to="/vectors">Vectors</Link>
          <Link to="/kinematics2">2D Kinematics</Link>
          <Link to="/momentum">Momentum</Link>
          <Link to="/oscillations">Oscillations</Link>
        </div>
      </div>

      {/* Fields Dropdown */}
      <div className="nav-dropdown">
        <span className="nav-item">Electricity ▾</span>
        <div className="dropdown-content">
          <Link to="/electric-field">Electric Field</Link>
          <Link to="/electric-potential">Electric Potential</Link>
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
                <Route path="/electric-field" element={<ElectricField/>} />
                <Route path="/electric-potential" element={<ElectricPotential/>} />
                <Route path="/rotational-dynamics" element={<RotationalDynamics/>} />
                <Route path="/chaos" element={<Chaos/>} />
                <Route path="/momentum" element={<Momentum/>} />
                <Route path="/sound" element={<Sound/>} />
                <Route path="/kinematics" element={<Kinematics />} />
                <Route path="/kinematics2" element={<Kinematics2 />} />
                <Route path="/kk" element={<PolarKinematics />} />
                <Route path="/forces" element={<Forces />} />
                <Route path="/vectors" element={<Vectors />} />
            </Routes>
        </div>
    );
}
