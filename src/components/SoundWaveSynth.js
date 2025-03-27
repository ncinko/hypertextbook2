import React, { useState, useEffect, useRef } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart, LineElement, LinearScale, PointElement, CategoryScale } from 'chart.js';

Chart.register(LineElement, LinearScale, PointElement, CategoryScale);

export default function SoundWaveSynth() {
  const [freq1, setFreq1] = useState(440);  // A4
  const [freq2, setFreq2] = useState(444);  // Slightly detuned for beats
  const sampleRate = 44100;
  const duration = 1.5; // seconds
  const audioContextRef = useRef(null);

  const generateWaveform = () => {
    const samples = Math.floor(sampleRate * duration);
    const time = Array.from({ length: samples }, (_, i) => i / sampleRate);
    const signal = time.map(t =>
      Math.sin(2 * Math.PI * freq1 * t) + Math.sin(2 * Math.PI * freq2 * t)
    );
    return { time, signal };
  };

  const { time, signal } = generateWaveform();

  const playWaveform = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    const audioCtx = audioContextRef.current;
    const buffer = audioCtx.createBuffer(1, signal.length, sampleRate);
    buffer.copyToChannel(new Float32Array(signal), 0);
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtx.destination);
    source.start();
  };

  const chartData = {
    labels: time.slice(0, 500).map(t => t.toFixed(4)),
    datasets: [
      {
        label: 'y(t) = sin(2πf₁t) + sin(2πf₂t)',
        data: signal.slice(0, 500),
        borderColor: 'blue',
        pointRadius: 0,
        borderWidth: 1,
        tension: 0.3,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    scales: {
      x: { title: { display: true, text: 'Time (s)' } },
      y: { title: { display: true, text: 'Amplitude' }, min: -2, max: 2 },
    },
    plugins: {
      legend: { display: false },
    },
  };

  return (
    <div style={{ maxWidth: 700, margin: 'auto' }}>
      <h2>Sum of Two Sine Waves</h2>
      <div className="control-panel">
        <label>
          Frequency 1: {freq1} Hz
          <input
            type="range"
            min="100"
            max="1000"
            step="1"
            value={freq1}
            onChange={(e) => setFreq1(Number(e.target.value))}
          />
        </label>
        <label>
          Frequency 2: {freq2} Hz
          <input
            type="range"
            min="100"
            max="1000"
            step="1"
            value={freq2}
            onChange={(e) => setFreq2(Number(e.target.value))}
          />
        </label>
        <button onClick={playWaveform} style={{ marginTop: '10px' }}>Play Waveform</button>
      </div>
      <Line data={chartData} options={chartOptions} />
    </div>
  );
}
