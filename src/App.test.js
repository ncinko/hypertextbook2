import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

jest.mock('react-router-dom', () => ({
  Link: ({ children, to = '#', ...rest }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
  Routes: ({ children }) => <div>{children}</div>,
  Route: ({ element = null }) => <>{element}</>,
}), { virtual: true });

const stub = (label) => () => <div>{label}</div>;

jest.mock('./LandingPage', () => stub('LandingPage'));
jest.mock('./DoublePendulum', () => stub('DoublePendulum'));
jest.mock('./SpringMass', () => stub('SpringMass'));
jest.mock('./IdealGas', () => stub('IdealGas'));
jest.mock('./pages/Oscillations', () => stub('Oscillations'));
jest.mock('./pages/ElectricField', () => stub('ElectricField'));
jest.mock('./pages/ElectricPotential', () => stub('ElectricPotential'));
jest.mock('./pages/RotationalDynamics', () => stub('RotationalDynamics'));
jest.mock('./pages/Chaos', () => stub('Chaos'));
jest.mock('./pages/Momentum', () => stub('Momentum'));
jest.mock('./pages/Sound', () => stub('Sound'));
jest.mock('./pages/Kinematics', () => stub('Kinematics'));
jest.mock('./pages/Kinematics2', () => stub('Kinematics2'));
jest.mock('./pages/PolarKinematics', () => stub('PolarKinematics'));
jest.mock('./pages/Vectors', () => stub('Vectors'));
jest.mock('./pages/Forces', () => stub('Forces'));

test('renders navigation brand text', () => {
  render(<App />);
  const brand = screen.getByText(/Physics Nook/i);
  expect(brand).toBeInTheDocument();
});
