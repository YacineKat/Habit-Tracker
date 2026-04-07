import { useEffect, useRef } from 'react';

export default function useHabitDetailCharts({
  visible,
  habitId,
  trendSeries,
  weekdaySeries,
  breakdown,
}) {
  const trendCanvasRef = useRef(null);
  const weekdayCanvasRef = useRef(null);
  const breakdownCanvasRef = useRef(null);

  const trendChartRef = useRef(null);
  const weekdayChartRef = useRef(null);
  const breakdownChartRef = useRef(null);

  useEffect(() => {
    const destroyCharts = () => {
      if (trendChartRef.current) {
        trendChartRef.current.destroy();
        trendChartRef.current = null;
      }
      if (weekdayChartRef.current) {
        weekdayChartRef.current.destroy();
        weekdayChartRef.current = null;
      }
      if (breakdownChartRef.current) {
        breakdownChartRef.current.destroy();
        breakdownChartRef.current = null;
      }
    };

    const ChartCtor = window.Chart;
    if (!visible || !habitId || !ChartCtor) {
      destroyCharts();
      return undefined;
    }

    destroyCharts();

    if (trendCanvasRef.current) {
      const ctx = trendCanvasRef.current.getContext('2d');
      const gradient = ctx.createLinearGradient(0, 0, 0, 220);
      gradient.addColorStop(0, 'rgba(52, 211, 153, 0.28)');
      gradient.addColorStop(1, 'rgba(52, 211, 153, 0.0)');

      trendChartRef.current = new ChartCtor(ctx, {
        type: 'line',
        data: {
          labels: trendSeries.labels,
          datasets: [{
            label: 'Done',
            data: trendSeries.values,
            borderColor: '#34d399',
            backgroundColor: gradient,
            fill: true,
            tension: 0.25,
            pointBackgroundColor: '#34d399',
            pointBorderColor: '#181b25',
            pointBorderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 5,
            borderWidth: 2.3,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { intersect: false, mode: 'index' },
          scales: {
            y: {
              min: 0,
              max: 1,
              ticks: {
                color: '#5c6078',
                stepSize: 1,
                callback: (value) => (value === 1 ? 'Done' : 'Missed'),
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
                label: (context) => (context.raw === 1 ? 'Done' : 'Missed'),
              },
            },
          },
          animation: { duration: 650 },
        },
      });
    }

    if (weekdayCanvasRef.current) {
      const ctx = weekdayCanvasRef.current.getContext('2d');
      weekdayChartRef.current = new ChartCtor(ctx, {
        type: 'bar',
        data: {
          labels: weekdaySeries.labels,
          datasets: [{
            label: 'Completion %',
            data: weekdaySeries.values,
            backgroundColor: weekdaySeries.values.map((value) => (value >= 60 ? 'rgba(108, 99, 255, 0.3)' : 'rgba(248, 113, 113, 0.3)')),
            borderColor: weekdaySeries.values.map((value) => (value >= 60 ? '#6c63ff' : '#f87171')),
            borderWidth: 1.4,
            borderRadius: 8,
            maxBarThickness: 34,
          }],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              min: 0,
              max: 100,
              ticks: {
                color: '#5c6078',
                callback: (value) => `${value}%`,
                font: { size: 11 },
              },
              grid: { color: 'rgba(38,41,56,0.6)', drawBorder: false },
              border: { display: false },
            },
            x: {
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
                label: (context) => `Completion: ${context.raw}%`,
              },
            },
          },
          animation: { duration: 650 },
        },
      });
    }

    if (breakdownCanvasRef.current) {
      const ctx = breakdownCanvasRef.current.getContext('2d');
      breakdownChartRef.current = new ChartCtor(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Done', 'Missed'],
          datasets: [{
            data: [breakdown.done, breakdown.missed],
            backgroundColor: ['#34d399', 'rgba(248, 113, 113, 0.45)'],
            borderColor: ['#34d399', '#f87171'],
            borderWidth: 1,
            hoverOffset: 4,
          }],
        },
        options: {
          cutout: '72%',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: {
                color: '#8b8fa4',
                boxWidth: 10,
                boxHeight: 10,
              },
            },
            tooltip: {
              backgroundColor: '#1f2231',
              titleColor: '#eaeaf0',
              bodyColor: '#8b8fa4',
              borderColor: '#262938',
              borderWidth: 1,
              padding: 10,
              cornerRadius: 8,
              callbacks: {
                label: (context) => `${context.label}: ${context.raw} day${context.raw !== 1 ? 's' : ''}`,
              },
            },
          },
          animation: { animateRotate: true, duration: 650 },
        },
      });
    }

    return destroyCharts;
  }, [visible, habitId, trendSeries, weekdaySeries, breakdown]);

  return {
    trendCanvasRef,
    weekdayCanvasRef,
    breakdownCanvasRef,
  };
}