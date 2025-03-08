// src/App.js
import React from 'react';
import './styles.css';
import {Routes, Route, Link } from 'react-router-dom';
import LandingPage from './LandingPage';
import DoublePendulum from './DoublePendulum';
import SpringMass from './SpringMass';
import IdealGas from './IdealGas';

export default function App() {
    return (
        <div>
            <nav>
                <Link to="/">Home</Link> | 
                <Link to="/double-pendulum">Double Pendulum</Link> | 
                <Link to="/spring-mass">Spring-Mass System</Link> |
				<Link to="/ideal-gas">Ideal Gas</Link>
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