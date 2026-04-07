import { useEffect, useRef } from 'react';

export default function useCharts({ activeTab, ringStats, lineSeries, barRanking }) {
  const ringCanvasRef = useRef(null);
  const lineCanvasRef = useRef(null);
  const barCanvasRef = useRef(null);
  const barWrapperRef = useRef(null);

  const ringChartRef = useRef(null);
  const lineChartRef = useRef(null);
  const barChartRef = useRef(null);

  useEffect(() => {
    const ChartCtor = window.Chart;
    if (!ChartCtor || activeTab !== 'dashboard') return undefined;

    if (ringChartRef.current) ringChartRef.current.destroy();
    if (lineChartRef.current) lineChartRef.current.destroy();
    if (barChartRef.current) barChartRef.current.destroy();

    if (ringCanvasRef.current) {
      const ctx = ringCanvasRef.current.getContext('2d');
      ringChartRef.current = new ChartCtor(ctx, {
        type: 'doughnut',
        data: {
          datasets: [{
            data: [ringStats.percent, 100 - ringStats.percent],
            backgroundColor: [
              ringStats.percent === 100 ? '#34d399' : '#6c63ff',
              'rgba(108, 99, 255, 0.08)',
            ],
            borderWidth: 0,
            borderRadius: ringStats.percent > 0 && ringStats.percent < 100 ? 8 : 0,
          }],
        },
        options: {
          cutout: '80%',
          responsive: false,
          plugins: {
            legend: { display: false },
            tooltip: { enabled: false },
          },
          animation: { animateRotate: true, duration: 700 },
        },
      });
    }

    if (lineCanvasRef.current) {
      const ctx = lineCanvasRef.current.getContext('2d');
      const gradient = ctx.createLinearGradient(0, 0, 0, 220);
      gradient.addColorStop(0, 'rgba(108, 99, 255, 0.25)');
      gradient.addColorStop(1, 'rgba(108, 99, 255, 0.0)');

      lineChartRef.current = new ChartCtor(ctx, {
        type: 'line',
        data: {
          labels: lineSeries.labels,
          datasets: [{
            label: 'Completion %',
            data: lineSeries.values,
            borderColor: '#6c63ff',
            backgroundColor: gradient,
            fill: true,
            tension: 0.35,
            pointBackgroundColor: '#6c63ff',
            pointBorderColor: '#181b25',
            pointBorderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 6,
            borderWidth: 2.5,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { intersect: false, mode: 'index' },
          scales: {
            y: {
              min: 0,
              max: 100,
              ticks: {
                color: '#5c6078',
                callback: (v) => `${v}%`,
                font: { size: 11 },
              },
              grid: { color: 'rgba(38,41,56,0.6)', drawBorder: false },
              border: { display: false },
            },
            x: {
              ticks: {
                color: '#5c6078',
                maxRotation: 45,
                font: { size: 10 },
              },
              grid: { display: false },
              border: { display: false },
            },
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#1f2231',
              titleColor: '#eaeaf0',
              bodyColor: '#8b8fa4',
              borderColor: '#262938',
              borderWidth: 1,
              padding: 10,
              cornerRadius: 8,
              displayColors: false,
              callbacks: {
                label: (context) => `Completion: ${context.raw}%`,
              },
            },
          },
          animation: { duration: 700 },
        },
      });
    }

    if (barCanvasRef.current) {
      const ctx = barCanvasRef.current.getContext('2d');
      const colors = barRanking.map((h) => {
        if (h.pct >= 80) return '#34d399';
        if (h.pct >= 50) return '#6c63ff';
        if (h.pct >= 25) return '#fbbf24';
        return '#f87171';
      });

      barChartRef.current = new ChartCtor(ctx, {
        type: 'bar',
        data: {
          labels: barRanking.map((h) => (h.name.length > 20 ? `${h.name.slice(0, 20)}...` : h.name)),
          datasets: [{
            label: 'Commitment %',
            data: barRanking.map((h) => h.pct),
            backgroundColor: colors.map((c) => `${c}33`),
            borderColor: colors,
            borderWidth: 1.5,
            borderRadius: 6,
            maxBarThickness: 32,
          }],
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              min: 0,
              max: 100,
              ticks: {
                color: '#5c6078',
                callback: (v) => `${v}%`,
                font: { size: 11 },
              },
              grid: { color: 'rgba(38,41,56,0.6)', drawBorder: false },
              border: { display: false },
            },
            y: {
              ticks: {
                color: '#8b8fa4',
                font: { size: 11, weight: '500' },
              },
              grid: { display: false },
              border: { display: false },
            },
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#1f2231',
              titleColor: '#eaeaf0',
              bodyColor: '#8b8fa4',
              borderColor: '#262938',
              borderWidth: 1,
              padding: 10,
              cornerRadius: 8,
              displayColors: false,
              callbacks: {
                label: (context) => `Commitment: ${context.raw}%`,
              },
            },
          },
          animation: { duration: 700 },
        },
      });

      if (barWrapperRef.current) {
        barWrapperRef.current.style.height = `${Math.max(160, barRanking.length * 38 + 50)}px`;
      }
    }

    return () => {
      if (ringChartRef.current) {
        ringChartRef.current.destroy();
        ringChartRef.current = null;
      }
      if (lineChartRef.current) {
        lineChartRef.current.destroy();
        lineChartRef.current = null;
      }
      if (barChartRef.current) {
        barChartRef.current.destroy();
        barChartRef.current = null;
      }
    };
  }, [activeTab, ringStats.percent, lineSeries, barRanking]);

  return {
    ringCanvasRef,
    lineCanvasRef,
    barCanvasRef,
    barWrapperRef,
  };
}
