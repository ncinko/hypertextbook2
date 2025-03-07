// src/LandingPage.js
import React from 'react';
import { Link } from 'react-router-dom';

export default function LandingPage() {
  return (
    <div className="max-w-3xl mx-auto text-center p-6">
      <h1 className="text-3xl font-bold mb-6">
        Welcome to the Physics Interactive Website
      </h1>
      <p className="mb-4">
        Explore interactive simulations and explanations of various physics topics.
      </p>
      <ul className="list-disc text-left mx-auto" style={{ maxWidth: "400px" }}>
        <li className="mb-2">
          <Link to="/double-pendulum" className="text-blue-500 hover:underline">
            Double Pendulum Simulation
          </Link>
        </li>
        {/* Add more topics as needed */}
      </ul>
    </div>
  );
}
