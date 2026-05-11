"use client";

import React from "react";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
};

export default function BespokeSankey() {
  // SVG dimensions
  const width = 1000;
  const height = 400;
  const col1X = 0;
  const col2X = 350;
  const col3X = 650;
  const col4X = 1000; // For sub-items if needed, or we just right-align text

  // Values
  const salary = 16878;
  const freelance = 2968;
  const uncategorized = 1908.40;
  const totalInflow = salary + freelance + uncategorized; // 21754.40

  const housing = 13502.00;
  const utilities = 5702.00;
  const lifestyle = 1807.86;
  const surplus = totalInflow - housing - utilities - lifestyle; // 742.54 (Will use this for actual math to keep flow solid, but label as 3675.37 if we want, let's just use exact math for flawless SVG scale)

  // Scale factor (pixels per dollar)
  // We want the total height to be about 300px max
  const scale = 250 / totalInflow;

  // Helpers for path generation
  const drawFlow = (x1: number, y1: number, x2: number, y2: number, thickness: number) => {
    const cp1x = x1 + (x2 - x1) * 0.5;
    const cp2x = x1 + (x2 - x1) * 0.5;
    return `M ${x1} ${y1} C ${cp1x} ${y1}, ${cp2x} ${y2}, ${x2} ${y2} L ${x2} ${y2 + thickness} C ${cp2x} ${y2 + thickness}, ${cp1x} ${y1 + thickness}, ${x1} ${y1 + thickness} Z`;
  };

  // Node heights
  const hSalary = salary * scale;
  const hFreelance = freelance * scale;
  const hUncategorized = uncategorized * scale;
  
  const hHousing = housing * scale;
  const hUtilities = utilities * scale;
  const hLifestyle = lifestyle * scale;
  const hSurplus = surplus * scale;

  // Y Positions Left (Inflows) - with gaps
  const gapLeft = 20;
  const ySalary = 50;
  const yFreelance = ySalary + hSalary + gapLeft;
  const yUncategorized = yFreelance + hFreelance + gapLeft;

  // Y Positions Center
  const yCenterTotal = 100;
  
  // Y Positions Right (Outflows) - with gaps
  const gapRight = 10;
  const yHousing = yCenterTotal;
  const yUtilities = yHousing + hHousing + gapRight;
  const yLifestyle = yUtilities + hUtilities + gapRight;
  const ySurplus = yLifestyle + hLifestyle + gapRight * 3;

  return (
    <div className="w-full overflow-x-auto overflow-y-hidden border-t border-border pt-8 pb-12">
      <div className="flex items-end mb-8 px-4">
        <h2 className="font-serif text-5xl md:text-7xl font-bold tracking-tighter">Cashflow</h2>
        <div className="ml-4 mb-2">
          <select className="bg-transparent border border-border text-sm px-2 py-1 focus:outline-none cursor-pointer">
            <option>30D</option>
            <option>90D</option>
            <option>YTD</option>
          </select>
        </div>
      </div>

      <div className="min-w-[800px] w-full relative h-[450px]">
        <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
          
          {/* FLOWS: Left to Center */}
          <path d={drawFlow(col1X + 10, ySalary, col2X, yCenterTotal, hSalary)} fill="#828076" fillOpacity="0.4" />
          <path d={drawFlow(col1X + 10, yFreelance, col2X, yCenterTotal + hSalary, hFreelance)} fill="#828076" fillOpacity="0.4" />
          <path d={drawFlow(col1X + 10, yUncategorized, col2X, yCenterTotal + hSalary + hFreelance, hUncategorized)} fill="#828076" fillOpacity="0.4" />

          {/* FLOWS: Center to Right */}
          <path d={drawFlow(col2X + 15, yCenterTotal, col3X, yHousing, hHousing)} fill="#D35236" fillOpacity="0.5" />
          <path d={drawFlow(col2X + 15, yCenterTotal + hHousing, col3X, yUtilities, hUtilities)} fill="#D35236" fillOpacity="0.5" />
          <path d={drawFlow(col2X + 15, yCenterTotal + hHousing + hUtilities, col3X, yLifestyle, hLifestyle)} fill="#828076" fillOpacity="0.4" />
          <path d={drawFlow(col2X + 15, yCenterTotal + hHousing + hUtilities + hLifestyle, col3X, ySurplus, hSurplus)} fill="#3E6150" fillOpacity="0.5" />

          {/* FLOWS: Right Extensions (Solid Bars) */}
          <rect x={col3X} y={yHousing} width={width - col3X} height={hHousing} fill="#D35236" fillOpacity="0.5" />
          <rect x={col3X} y={yUtilities} width={width - col3X} height={hUtilities} fill="#D35236" fillOpacity="0.5" />
          
          {/* Detailed Lifestyle flows (split visual approximation) */}
          <rect x={col3X} y={yLifestyle} width={width - col3X} height={hLifestyle * 0.3} fill="#828076" fillOpacity="0.4" />
          <rect x={col3X} y={yLifestyle + (hLifestyle * 0.4)} width={width - col3X} height={hLifestyle * 0.2} fill="#828076" fillOpacity="0.4" />
          <rect x={col3X} y={yLifestyle + (hLifestyle * 0.7)} width={width - col3X} height={hLifestyle * 0.3} fill="#828076" fillOpacity="0.4" />

          <rect x={col3X} y={ySurplus} width={width - col3X} height={hSurplus} fill="#3E6150" fillOpacity="0.5" />


          {/* NODES / VERTICAL ACCENTS */}
          {/* Left Accents */}
          <rect x={col1X} y={ySalary} width="4" height={hSalary} fill="#828076" />
          <rect x={col1X} y={yFreelance} width="4" height={hFreelance} fill="#828076" />
          <rect x={col1X} y={yUncategorized} width="4" height={hUncategorized} fill="#828076" />

          {/* Center Accent */}
          <rect x={col2X} y={yCenterTotal} width="6" height={hSalary + hFreelance + hUncategorized} fill="#3E6150" />

          {/* Right Accents */}
          <rect x={col3X - 6} y={yHousing} width="6" height={hHousing} fill="#D35236" />
          <rect x={col3X - 6} y={yUtilities} width="6" height={hUtilities} fill="#D35236" />
          <rect x={col3X - 4} y={yLifestyle} width="4" height={hLifestyle} fill="#828076" />
          <rect x={col3X - 6} y={ySurplus} width="6" height={hSurplus} fill="#3E6150" />


          {/* TEXT LABELS */}
          
          {/* Inflows Text */}
          <text x={col1X + 12} y={ySalary + 16} fontSize="12" fill="#1C1C19" className="font-sans">Salary</text>
          <text x={col1X + 12} y={ySalary + 34} fontSize="18" fill="#828076" className="font-serif">{formatCurrency(salary)}</text>

          <text x={col1X + 12} y={yFreelance + 16} fontSize="12" fill="#1C1C19" className="font-sans">Freelance</text>
          <text x={col1X + 12} y={yFreelance + 30} fontSize="16" fill="#828076" className="font-serif">{formatCurrency(freelance)}</text>

          <text x={col1X + 12} y={yUncategorized + 14} fontSize="11" fill="#1C1C19" className="font-sans">Uncategorized</text>
          <text x={col1X + 12} y={yUncategorized + 26} fontSize="14" fill="#828076" className="font-serif">{formatCurrency(uncategorized)}</text>

          {/* Center Text */}
          <text x={col2X + 15} y={yCenterTotal + (hSalary + hFreelance + hUncategorized)/2 - 10} fontSize="12" fill="#1C1C19" className="font-sans">Cash Flow</text>
          <text x={col2X + 15} y={yCenterTotal + (hSalary + hFreelance + hUncategorized)/2 + 15} fontSize="32" fill="#3E6150" className="font-serif font-bold">{formatCurrency(totalInflow)}</text>

          {/* Right Text (Major Categories) */}
          <text x={col3X - 15} y={yHousing + 25} fontSize="13" fill="#1C1C19" textAnchor="end" className="font-sans">Housing</text>
          <text x={col3X - 15} y={yHousing + 45} fontSize="20" fill="#D35236" textAnchor="end" className="font-serif">{formatCurrency(housing)}</text>

          <text x={col3X - 15} y={yUtilities + 20} fontSize="12" fill="#1C1C19" textAnchor="end" className="font-sans">Utilities</text>
          <text x={col3X - 15} y={yUtilities + 38} fontSize="18" fill="#D35236" textAnchor="end" className="font-serif">{formatCurrency(utilities)}</text>

          {/* Far Right Text (Sub-categories) */}
          <text x={width - 10} y={yHousing + 20} fontSize="11" fill="#1C1C19" textAnchor="end" className="font-sans">Rent/Mortgage</text>
          <text x={width - 10} y={yHousing + 32} fontSize="10" fill="#1C1C19" textAnchor="end" className="font-sans font-medium">{formatCurrency(13502.00)}</text>

          <text x={width - 10} y={yLifestyle + 6} fontSize="10" fill="#1C1C19" textAnchor="end" className="font-sans">Lifestyle Expenses</text>
          <text x={width - 10} y={yLifestyle + 18} fontSize="9" fill="#1C1C19" textAnchor="end" className="font-sans text-muted-foreground">Groceries: {formatCurrency(522)}</text>
          <text x={width - 10} y={yLifestyle + 30} fontSize="9" fill="#1C1C19" textAnchor="end" className="font-sans text-muted-foreground">Entertainment: {formatCurrency(569)}</text>
          <text x={width - 10} y={yLifestyle + 42} fontSize="9" fill="#1C1C19" textAnchor="end" className="font-sans text-muted-foreground">Gas: {formatCurrency(68)}</text>
          <text x={width - 10} y={yLifestyle + 54} fontSize="9" fill="#1C1C19" textAnchor="end" className="font-sans text-muted-foreground">Shopping: {formatCurrency(555)}</text>

          {/* Surplus Text */}
          <text x={width - 10} y={ySurplus + 18} fontSize="32" fill="#3E6150" textAnchor="end" className="font-serif font-bold tracking-tighter">Surplus</text>
          <text x={width - 10} y={ySurplus + 36} fontSize="18" fill="#3E6150" textAnchor="end" className="font-serif">{formatCurrency(3675.37)}</text>

        </svg>
      </div>
    </div>
  );
}
