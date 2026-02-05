import React, { useState } from 'react';
import { Scale, Atom, Zap, Info, ChevronRight, ArrowDown } from 'lucide-react';

const PROTON_MASS = 1.007276;
const NEUTRON_MASS = 1.008665;
const MEV_PER_AMU = 931.5;

const ISOTOPES = [
  { name: 'Hydrogen-2 (Deuterium)', symbol: '²H', z: 1, n: 1, actualMass: 2.014102, description: 'Heavy hydrogen. Fuel for stars and fusion reactors.' },
  { name: 'Helium-4', symbol: '⁴He', z: 2, n: 2, actualMass: 4.002603, description: "Alpha particle. Extremely stable 'double magic' nucleus." },
  { name: 'Lithium-6', symbol: '⁶Li', z: 3, n: 3, actualMass: 6.015122, description: 'Less stable than Helium-4, despite being heavier.' },
  { name: 'Carbon-12', symbol: '¹²C', z: 6, n: 6, actualMass: 12.0, description: 'The standard for atomic mass. Formed in dying stars.' },
  { name: 'Oxygen-16', symbol: '¹⁶O', z: 8, n: 8, actualMass: 15.994915, description: 'A major product of stellar fusion.' },
  { name: 'Iron-56', symbol: '⁵⁶Fe', z: 26, n: 30, actualMass: 55.934937, description: "The peak of stability. The 'ash' of stellar burning." },
  { name: 'Krypton-92', symbol: '⁹²Kr', z: 36, n: 56, actualMass: 91.926156, description: 'Common fission product of Uranium.' },
  { name: 'Uranium-235', symbol: '²³⁵U', z: 92, n: 143, actualMass: 235.04393, description: 'Fissile fuel for nuclear reactors.' },
  { name: 'Uranium-238', symbol: '²³⁸U', z: 92, n: 146, actualMass: 238.050788, description: 'Most common isotope of Uranium.' },
];

const calculateNuclearData = (isotope) => {
  const { z, n, actualMass } = isotope;
  const massNumber = z + n;
  const ingredientsMass = z * PROTON_MASS + n * NEUTRON_MASS;
  const massDefect = ingredientsMass - actualMass;
  const totalBindingEnergy = massDefect * MEV_PER_AMU;
  const bePerNucleon = totalBindingEnergy / massNumber;

  return {
    massNumber,
    ingredientsMass,
    massDefect,
    totalBindingEnergy,
    bePerNucleon,
  };
};

const CHART_DATA = ISOTOPES.map((iso) => ({
  ...iso,
  ...calculateNuclearData(iso),
})).sort((a, b) => a.massNumber - b.massNumber);

export default function NuclearBindingApp() {
  const [selectedIsotopeIdx, setSelectedIsotopeIdx] = useState(1);

  const currentIsotope = ISOTOPES[selectedIsotopeIdx];
  const data = calculateNuclearData(currentIsotope);

  return (
    <div className="bg-slate-50 text-slate-900 font-sans p-4 md:p-8 rounded-2xl border border-slate-200">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="space-y-2">
          <h1 className="text-3xl md:text-4xl font-bold text-indigo-900 flex items-center gap-3">
            <Atom className="w-10 h-10 text-indigo-600" />
            Nuclear Binding Energy Visualizer
          </h1>
          <p className="text-slate-600 max-w-2xl">
            Select an isotope to weigh its ingredients against its actual nucleus, revealing the
            missing mass that becomes energy.
          </p>
        </header>

        <div className="grid md:grid-cols-12 gap-6">
          <div className="md:col-span-4 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Select Isotope
              </label>
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                {ISOTOPES.map((iso, idx) => (
                  <button
                    key={iso.name}
                    onClick={() => setSelectedIsotopeIdx(idx)}
                    className={`w-full text-left px-4 py-3 rounded-xl transition-all border flex items-center justify-between group ${
                      selectedIsotopeIdx === idx
                        ? 'bg-indigo-50 border-indigo-200 shadow-inner'
                        : 'hover:bg-slate-50 border-transparent hover:border-slate-200'
                    }`}
                  >
                    <div>
                      <span
                        className={`block font-bold text-lg ${
                          selectedIsotopeIdx === idx ? 'text-indigo-700' : 'text-slate-700'
                        }`}
                      >
                        {iso.symbol}
                      </span>
                      <span className="text-xs text-slate-500">{iso.name}</span>
                    </div>
                    {selectedIsotopeIdx === idx && <ChevronRight className="w-5 h-5 text-indigo-500" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-indigo-900 text-indigo-100 p-4 rounded-xl">
              <h3 className="font-semibold text-sm uppercase tracking-wider mb-2 text-indigo-300">Composition</h3>
              <div className="flex justify-between items-center mb-1">
                <span>Protons (Z)</span>
                <span className="font-mono text-xl">{currentIsotope.z}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Neutrons (N)</span>
                <span className="font-mono text-xl">{currentIsotope.n}</span>
              </div>
            </div>

            <p className="text-sm text-slate-500 italic border-l-4 border-indigo-200 pl-3">
              {currentIsotope.description}
            </p>
          </div>

          <div className="md:col-span-8 bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col">
            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
              <Scale className="w-6 h-6 text-indigo-500" />
              The Mass Defect Calculation
            </h2>

            <div className="flex-1 flex flex-col justify-center">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-8">
                <div className="bg-red-50 p-4 rounded-xl border border-red-100 w-full md:w-1/3 text-center relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-2 opacity-10">
                    <Atom size={64} />
                  </div>
                  <h3 className="text-red-800 font-semibold mb-2">Ingredients</h3>
                  <div className="text-3xl font-mono text-red-600 font-bold mb-1">
                    {data.ingredientsMass.toFixed(4)} <span className="text-sm">u</span>
                  </div>
                  <div className="text-xs text-red-700/70">
                    ({currentIsotope.z} × {PROTON_MASS}) + ({currentIsotope.n} × {NEUTRON_MASS})
                  </div>
                </div>

                <div className="text-slate-400 font-bold text-2xl">-</div>

                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 w-full md:w-1/3 text-center relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-2 opacity-10">
                    <Scale size={64} />
                  </div>
                  <h3 className="text-emerald-800 font-semibold mb-2">Actual Nucleus</h3>
                  <div className="text-3xl font-mono text-emerald-600 font-bold mb-1">
                    {currentIsotope.actualMass.toFixed(4)} <span className="text-sm">u</span>
                  </div>
                  <div className="text-xs text-emerald-700/70">Measured Mass</div>
                </div>

                <div className="text-slate-400 font-bold text-2xl">=</div>

                <div className="bg-indigo-50 p-4 rounded-xl border-2 border-indigo-500 w-full md:w-1/3 text-center relative shadow-lg transform scale-105">
                  <div className="absolute top-0 right-0 p-2 opacity-10">
                    <Zap size={64} />
                  </div>
                  <h3 className="text-indigo-900 font-bold mb-2">Mass Defect (Δm)</h3>
                  <div className="text-3xl font-mono text-indigo-700 font-bold mb-1">
                    {data.massDefect.toFixed(4)} <span className="text-sm">u</span>
                  </div>
                  <div className="text-xs text-indigo-600/70">Missing Mass</div>
                </div>
              </div>

              <div className="bg-slate-900 text-white rounded-xl p-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-900 to-purple-900 opacity-50" />
                <div className="relative z-10 flex flex-col md:flex-row items-center justify-around gap-6">
                  <div className="text-center md:text-left">
                    <div className="text-indigo-300 text-sm font-semibold uppercase tracking-widest mb-1">
                      Einstein&apos;s Equation
                    </div>
                    <div className="text-2xl font-serif italic">E = Δm c²</div>
                    <div className="text-xs text-slate-400 mt-1">1 u ≈ 931.5 MeV</div>
                  </div>

                  <ArrowDown className="md:-rotate-90 text-indigo-400 animate-pulse" />

                  <div className="text-center">
                    <div className="text-indigo-300 text-sm font-semibold uppercase tracking-widest mb-1">
                      Total Binding Energy
                    </div>
                    <div className="text-4xl font-bold font-mono text-white tracking-tight">
                      {data.totalBindingEnergy.toFixed(1)}{' '}
                      <span className="text-lg text-indigo-300">MeV</span>
                    </div>
                  </div>

                  <div className="h-12 w-px bg-slate-700 hidden md:block" />

                  <div className="text-center">
                    <div className="text-yellow-400 text-sm font-semibold uppercase tracking-widest mb-1">
                      Per Nucleon
                    </div>
                    <div className="text-5xl font-bold font-mono text-yellow-400 tracking-tight drop-shadow-lg">
                      {data.bePerNucleon.toFixed(2)}{' '}
                      <span className="text-lg text-yellow-200/80">MeV</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-800">Binding Energy Curve</h2>
              <p className="text-slate-500 text-sm">Binding Energy per Nucleon vs. Mass Number (A)</p>
            </div>
            <div className="flex gap-4 text-xs font-semibold uppercase tracking-wider mt-4 md:mt-0">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-orange-400" /> Fusion Region
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-400" /> Fission Region
              </div>
            </div>
          </div>

          <div className="w-full h-[400px] relative">
            <BindingEnergyChart data={CHART_DATA} highlightIsotope={currentIsotope} />
          </div>

          <div className="grid md:grid-cols-3 gap-6 mt-8">
            <InfoCard
              title="Fusion (Left Slope)"
              color="orange"
              text="Light nuclei (like Hydrogen) release huge energy when combining because the curve rises steeply here. Moving up the hill releases energy."
            />
            <InfoCard
              title="Peak Stability (Iron-56)"
              color="indigo"
              text="Iron sits at the top. You can&apos;t get energy by fusing Iron (it costs energy) nor by splitting it. It is the nuclear dead end."
            />
            <InfoCard
              title="Fission (Right Slope)"
              color="blue"
              text="Heavy nuclei (like Uranium) are less tightly bound than Iron. Splitting them lets them slide up the hill towards Iron, releasing energy."
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ title, text, color }) {
  const colors = {
    orange: 'bg-orange-50 border-orange-100 text-orange-900',
    indigo: 'bg-indigo-50 border-indigo-100 text-indigo-900',
    blue: 'bg-blue-50 border-blue-100 text-blue-900',
  };

  return (
    <div className={`p-4 rounded-xl border ${colors[color]}`}>
      <h4 className="font-bold mb-2 flex items-center gap-2">
        <Info className="w-4 h-4 opacity-50" /> {title}
      </h4>
      <p className="text-sm opacity-90 leading-relaxed">{text}</p>
    </div>
  );
}

function BindingEnergyChart({ data, highlightIsotope }) {
  const padding = { top: 20, right: 30, bottom: 40, left: 50 };
  const width = 1000;
  const height = 500;

  const maxA = 250;
  const maxBE = 10;

  const xScale = (a) => padding.left + (a / maxA) * (width - padding.left - padding.right);
  const yScale = (be) =>
    height - padding.bottom - (be / maxBE) * (height - padding.top - padding.bottom);

  const points = data.map((d) => `${xScale(d.massNumber)},${yScale(d.bePerNucleon)}`).join(' ');

  const hx = xScale(highlightIsotope.z + highlightIsotope.n);
  const hy = yScale(data.find((d) => d.name === highlightIsotope.name)?.bePerNucleon || 0);

  const ironX = xScale(56);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible">
      <defs>
        <linearGradient id="curveFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#6366f1" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect
        x={padding.left}
        y={padding.top}
        width={ironX - padding.left}
        height={height - padding.bottom - padding.top}
        fill="#ffedd5"
        opacity="0.3"
      />
      <text
        x={(padding.left + ironX) / 2}
        y={padding.top + 30}
        textAnchor="middle"
        className="text-sm font-bold fill-orange-400 uppercase tracking-widest opacity-60"
      >
        Fusion
      </text>

      <rect
        x={ironX}
        y={padding.top}
        width={width - padding.right - ironX}
        height={height - padding.bottom - padding.top}
        fill="#dbeafe"
        opacity="0.3"
      />
      <text
        x={(ironX + width - padding.right) / 2}
        y={padding.top + 30}
        textAnchor="middle"
        className="text-sm font-bold fill-blue-400 uppercase tracking-widest opacity-60"
      >
        Fission
      </text>

      {[2, 4, 6, 8, 10].map((val) => (
        <g key={val}>
          <line
            x1={padding.left}
            y1={yScale(val)}
            x2={width - padding.right}
            y2={yScale(val)}
            stroke="#e2e8f0"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
          <text
            x={padding.left - 10}
            y={yScale(val) + 4}
            textAnchor="end"
            className="text-xs fill-slate-400 font-mono"
          >
            {val}
          </text>
        </g>
      ))}

      <line
        x1={padding.left}
        y1={height - padding.bottom}
        x2={width - padding.right}
        y2={height - padding.bottom}
        stroke="#94a3b8"
        strokeWidth="2"
      />
      {[0, 50, 100, 150, 200, 250].map((val) => (
        <g key={val}>
          <line
            x1={xScale(val)}
            y1={height - padding.bottom}
            x2={xScale(val)}
            y2={height - padding.bottom + 6}
            stroke="#94a3b8"
            strokeWidth="2"
          />
          <text
            x={xScale(val)}
            y={height - padding.bottom + 20}
            textAnchor="middle"
            className="text-xs fill-slate-500 font-bold"
          >
            {val}
          </text>
        </g>
      ))}
      <text
        x={width / 2}
        y={height - 5}
        textAnchor="middle"
        className="text-sm fill-slate-500 font-semibold uppercase tracking-wider"
      >
        Mass Number (A)
      </text>

      <line
        x1={padding.left}
        y1={padding.top}
        x2={padding.left}
        y2={height - padding.bottom}
        stroke="#94a3b8"
        strokeWidth="2"
      />
      <text
        x={15}
        y={height / 2}
        transform={`rotate(-90, 15, ${height / 2})`}
        textAnchor="middle"
        className="text-sm fill-slate-500 font-semibold uppercase tracking-wider"
      >
        Binding Energy / Nucleon (MeV)
      </text>

      <path
        d={`M ${points}`}
        fill="none"
        stroke="#6366f1"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="drop-shadow-lg"
      />

      <circle cx={xScale(56)} cy={yScale(8.79)} r="4" fill="#ef4444" opacity="0.5" />

      {data.map((d) => (
        <circle
          key={d.name}
          cx={xScale(d.massNumber)}
          cy={yScale(d.bePerNucleon)}
          r={highlightIsotope.name === d.name ? 8 : 4}
          fill={highlightIsotope.name === d.name ? '#4f46e5' : '#cbd5e1'}
          stroke="white"
          strokeWidth="2"
          className="transition-all duration-300"
        />
      ))}

      <line x1={hx} y1={hy} x2={hx} y2={height - padding.bottom} stroke="#6366f1" strokeWidth="1" strokeDasharray="4 4" />
      <line x1={padding.left} y1={hy} x2={hx} y2={hy} stroke="#6366f1" strokeWidth="1" strokeDasharray="4 4" />
    </svg>
  );
}
