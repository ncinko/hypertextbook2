import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { Chart, LineElement, LinearScale, PointElement, CategoryScale } from 'chart.js';
import { FaPlay, FaPause } from 'react-icons/fa';

Chart.register(LineElement, LinearScale, PointElement, CategoryScale);

export default function Sound() {
  const [freq1, setFreq1] = useState(200);
  const [freq2, setFreq2] = useState(210);
  const [isPlaying, setIsPlaying] = useState(false);
  const [stereo, setStereo] = useState(false);
  const [timeWindow, setTimeWindow] = useState(0.2);
  const audioContextRef = useRef(null);
  const osc1Ref = useRef(null);
  const osc2Ref = useRef(null);
  const gain1Ref = useRef(null);
  const gain2Ref = useRef(null);
  const panner1Ref = useRef(null);
  const panner2Ref = useRef(null);
  const amplitude = 0.3;
  const sampleRate = 44100;

  const { time, signal } = useMemo(() => {
    const samples = Math.floor(sampleRate * 1.5);
    const time = new Array(samples);
    const signal = new Array(samples);
    for (let i = 0; i < samples; i++) {
      const t = i / sampleRate;
      time[i] = t;
      signal[i] = amplitude * (Math.sin(2 * Math.PI * freq1 * t) + Math.sin(2 * Math.PI * freq2 * t));
    }
    return { time, signal };
  }, [freq1, freq2]);

  const stopOscillators = () => {
    const ctx = audioContextRef.current;
    if (gain1Ref.current && ctx) {
      gain1Ref.current.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    }
    if (gain2Ref.current && ctx) {
      gain2Ref.current.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    }
    if (osc1Ref.current) osc1Ref.current.stop(ctx.currentTime + 0.12);
    if (osc2Ref.current) osc2Ref.current.stop(ctx.currentTime + 0.12);
    osc1Ref.current = null;
    osc2Ref.current = null;
    setIsPlaying(false);
  };

  const togglePlayback = () => {
    if (isPlaying) {
      if (gain1Ref.current) gain1Ref.current.gain.exponentialRampToValueAtTime(0.001, audioContextRef.current.currentTime + 0.05);
      if (gain2Ref.current) gain2Ref.current.gain.exponentialRampToValueAtTime(0.001, audioContextRef.current.currentTime + 0.05);
      setTimeout(stopOscillators, 60);
    } else {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      const ctx = audioContextRef.current;

      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      const gain2 = ctx.createGain();
      const panner1 = ctx.createStereoPanner();
      const panner2 = ctx.createStereoPanner();

      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(freq1, ctx.currentTime);
      osc2.frequency.setValueAtTime(freq2, ctx.currentTime);

      gain1.gain.value = amplitude;
      gain2.gain.value = amplitude;

      panner1.pan.value = stereo ? -1 : 0;
      panner2.pan.value = stereo ? 1 : 0;

      osc1.connect(gain1).connect(panner1).connect(ctx.destination);
      osc2.connect(gain2).connect(panner2).connect(ctx.destination);

      osc1.start();
      osc2.start();

      osc1Ref.current = osc1;
      osc2Ref.current = osc2;
      gain1Ref.current = gain1;
      gain2Ref.current = gain2;
      panner1Ref.current = panner1;
      panner2Ref.current = panner2;
      setIsPlaying(true);
    }
  };

  useEffect(() => {
    if (panner1Ref.current && panner2Ref.current) {
      const ctx = audioContextRef.current;
      panner1Ref.current.pan.setValueAtTime(stereo ? -1 : 0, ctx.currentTime);
      panner2Ref.current.pan.setValueAtTime(stereo ? 1 : 0, ctx.currentTime);
    }
  }, [stereo]);

  useEffect(() => {
    if (osc1Ref.current) osc1Ref.current.frequency.setTargetAtTime(freq1, audioContextRef.current.currentTime, 0.01);
  }, [freq1]);

  useEffect(() => {
    if (osc2Ref.current) osc2Ref.current.frequency.setTargetAtTime(freq2, audioContextRef.current.currentTime, 0.01);
  }, [freq2]);

  useEffect(() => {
    return () => {
      stopOscillators();
      if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
      }
    };
  }, []);

  const chartSamples = Math.floor(sampleRate * timeWindow);
  const chartData = {
    labels: time.slice(0, chartSamples).map(t => t.toFixed(4)),
    datasets: [
      {
        label: 'y(t) = A[sin(2πf₁t) + sin(2πf₂t)]',
        data: signal.slice(0, chartSamples),
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
      y: { title: { display: true, text: 'Amplitude' }, min: -1, max: 1 },
    },
    plugins: {
      legend: { display: false },
    },
  };

  return (
    <div className="container mx-auto p-4 left-aligned-container">
      <h1>Sound</h1>

      <p>Adjust the frequencies of two sine waves and observe the resulting waveform.</p>

      <div className="control-panel" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: 400 }}>
        <label>
          Frequency 1:
          <input
            type="number"
            min="100"
            max="1000"
            step="1"
            value={freq1}
            onChange={(e) => setFreq1(Number(e.target.value))}
            style={{ marginLeft: '0.5rem', width: '5rem' }}
          /> Hz
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
          Frequency 2:
          <input
            type="number"
            min="100"
            max="1000"
            step="1"
            value={freq2}
            onChange={(e) => setFreq2(Number(e.target.value))}
            style={{ marginLeft: '0.5rem', width: '5rem' }}
          /> Hz
          <input
            type="range"
            min="100"
            max="1000"
            step="1"
            value={freq2}
            onChange={(e) => setFreq2(Number(e.target.value))}
          />
        </label>
        <label>
          <input type="checkbox" checked={stereo} onChange={() => setStereo(!stereo)} /> Stereo (Freq 1 Left, Freq 2 Right)
        </label>
        <button onClick={togglePlayback} style={{ width: '40px', height: '40px', borderRadius: '50%', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '1rem' }}>
          {isPlaying ? <FaPause /> : <FaPlay />}
        </button>
      </div>

      <Line data={chartData} options={chartOptions} />

      <div style={{ marginTop: '2rem' }}>
        <label>
          Time Scale (s):
          <input
            type="range"
            min="0.01"
            max="1.0"
            step="0.01"
            value={timeWindow}
            onChange={(e) => setTimeWindow(parseFloat(e.target.value))}
          /> {timeWindow.toFixed(2)} s
        </label>
      </div>
    </div>
  );
}
