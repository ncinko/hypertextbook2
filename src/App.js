// src/App.js
import React from 'react';
import {Routes, Route, Link } from 'react-router-dom';
import LandingPage from './LandingPage';
import DoublePendulum from './DoublePendulum';
import SpringMass from './SpringMass';

export default function App() {
    return (
        <div>
            <nav>
                <Link to="/">Home</Link> | 
                <Link to="/double-pendulum">Double Pendulum</Link> | 
                <Link to="/spring-mass">Spring-Mass System</Link>
            </nav>
            <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/double-pendulum" element={<DoublePendulum />} />
                <Route path="/spring-mass" element={<SpringMass />} />
            </Routes>
        </div>
    );
}