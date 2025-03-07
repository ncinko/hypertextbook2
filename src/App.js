// src/App.js
import React from 'react';
import {Routes, Route, Link } from 'react-router-dom';
import LandingPage from './LandingPage';
import DoublePendulum from './DoublePendulum';

export default function App() {
  return (
    
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/double-pendulum" element={<DoublePendulum />} />
      </Routes>
    
  );
}
