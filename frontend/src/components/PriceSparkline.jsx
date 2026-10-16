import React from "react";

export default function PriceSparkline({ prices = [2380, 2395, 2410, 2390, 2430, 2415, 2450] }) {
  const width = 180;
  const height = 45;
  
  // Calculate coordinates
  const min = Math.min(...prices) * 0.995;
  const max = Math.max(...prices) * 1.005;
  const range = max - min;
  
  const points = prices.map((price, idx) => {
    const x = (idx / (prices.length - 1)) * width;
    // Invert Y because SVG coordinates start from top-left (0,0)
    const y = height - ((price - min) / range) * height;
    return { x, y };
  });

  const pathD = points.reduce((acc, p, idx) => {
    return idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, "");

  // Create closed path for the gradient area fill
  const areaD = `${pathD} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

  const lastPoint = points[points.length - 1];

  return (
    <div className="price-sparkline-container">
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height} className="sparkline-svg">
        <defs>
          <linearGradient id="sparkline-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent-green)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--accent-green)" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Gradient Area Fill */}
        <path d={areaD} fill="url(#sparkline-grad)" stroke="none" />

        {/* Trend Line */}
        <path
          d={pathD}
          fill="none"
          stroke="var(--accent-green)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Final Interactive Glowing Ring */}
        <circle
          cx={lastPoint.x}
          cy={lastPoint.y}
          r="4"
          fill="var(--accent-green)"
          stroke="var(--bg-surface)"
          strokeWidth="1.5"
        />
        <circle
          cx={lastPoint.x}
          cy={lastPoint.y}
          r="8"
          fill="none"
          stroke="var(--accent-green)"
          strokeWidth="1"
          opacity="0.5"
          className="sparkline-pulse"
        />
      </svg>
    </div>
  );
}
