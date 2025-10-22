import { chartWrapper } from "./styles.css";

interface ChartProps {
	type: "line" | "bar" | "donut" | "scatter" | "area" | "pie" | "radar" | "radialBar";
	series: any; // Accept any series format for compatibility
	options?: any; // Accept any options for compatibility with ApexCharts
	height?: number;
}

// Simple SVG-based chart component
export function Chart({ type, series, options = {}, height = 300 }: ChartProps) {
	const colors = options.colors || ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

	// Normalize series data to handle both formats
	const normalizedSeries =
		Array.isArray(series) && typeof series[0] === "number"
			? [{ name: "Series 1", data: series as number[] }]
			: (series as Array<{ name: string; data: number[] | Array<[number, number]> }>);

	const renderLineChart = () => {
		const data = (normalizedSeries[0]?.data as number[]) || [];
		const labels = options.xaxis?.categories || [];
		const maxValue = Math.max(...data, 1);
		const width = 400;
		const chartHeight = height - 80;

		if (data.length === 0) {
			return <div className="h-full flex items-center justify-center text-muted-foreground">No data available</div>;
		}

		const points = data
			.map((value, index) => {
				const x = (index / (data.length - 1)) * (width - 60) + 30;
				const y = chartHeight - (value / maxValue) * (chartHeight - 40) + 20;
				return `${x},${y}`;
			})
			.join(" ");

		return (
			<div className="w-full h-full flex flex-col">
				<div className="flex justify-center mb-4">
					<div className="flex items-center gap-4">
						{normalizedSeries.map((s, index) => (
							<div key={s.name} className="flex items-center gap-2">
								<div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />
								<span className="text-sm">{s.name}</span>
							</div>
						))}
					</div>
				</div>
				<svg width="100%" height={chartHeight} viewBox={`0 0 ${width} ${chartHeight}`} aria-label="Line chart">
					<title>Line Chart</title>
					{/* Grid lines */}
					{[0, 1, 2, 3, 4].map((i) => (
						<line
							key={i}
							x1="30"
							y1={20 + (i * (chartHeight - 40)) / 4}
							x2={width - 30}
							y2={20 + (i * (chartHeight - 40)) / 4}
							stroke="#e5e7eb"
							strokeWidth="1"
							strokeDasharray="3,3"
						/>
					))}

					{/* Data lines */}
					{normalizedSeries.map((s, seriesIndex) => {
						const seriesData = s.data as number[];
						const seriesPoints = seriesData
							.map((value, index) => {
								const x = (index / (seriesData.length - 1)) * (width - 60) + 30;
								const y = chartHeight - (value / maxValue) * (chartHeight - 40) + 20;
								return `${x},${y}`;
							})
							.join(" ");

						return <polyline key={s.name} points={seriesPoints} fill="none" stroke={colors[seriesIndex % colors.length]} strokeWidth="2" />;
					})}

					{/* X-axis labels */}
					{labels.map((label: string, index: number) => (
						<text key={label} x={(index / (labels.length - 1)) * (width - 60) + 30} y={chartHeight - 5} textAnchor="middle" className="text-xs fill-gray-600">
							{label}
						</text>
					))}
				</svg>
			</div>
		);
	};

	const renderBarChart = () => {
		const data = (normalizedSeries[0]?.data as number[]) || [];
		const labels = options.xaxis?.categories || [];
		const maxValue = Math.max(...data, 1);

		if (data.length === 0) {
			return <div className="h-full flex items-center justify-center text-muted-foreground">No data available</div>;
		}

		return (
			<div className="w-full h-full flex flex-col">
				<div className="flex justify-center mb-4">
					<div className="flex items-center gap-4">
						{normalizedSeries.map((s, index) => (
							<div key={s.name} className="flex items-center gap-2">
								<div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />
								<span className="text-sm">{s.name}</span>
							</div>
						))}
					</div>
				</div>
				<div className="flex-1 flex items-end justify-around gap-2 px-4">
					{data.map((value, index) => (
						<div key={`bar-${index}-${value}`} className="flex flex-col items-center gap-2">
							<div className="text-xs text-gray-600">{value}</div>
							<div
								className="w-8 rounded-t"
								style={{
									height: `${(value / maxValue) * (height - 100)}px`,
									backgroundColor: colors[0],
								}}
							/>
							<div className="text-xs text-gray-600">{labels[index]}</div>
						</div>
					))}
				</div>
			</div>
		);
	};

	const renderDonutChart = () => {
		// Handle both series formats for donut charts
		const data = Array.isArray(series) && typeof series[0] === "number" ? (series as number[]) : (normalizedSeries[0]?.data as number[]) || [];
		const labels = options.labels || [];
		const total = data.reduce((sum, value) => sum + value, 0);

		if (data.length === 0 || total === 0) {
			return <div className="h-full flex items-center justify-center text-muted-foreground">No data available</div>;
		}

		// Create a simple visual representation with bars and numbers
		return (
			<div className="w-full h-full flex flex-col p-4">
				<div className="text-center mb-4">
					<div className="text-2xl font-bold text-gray-800">Total: {total}</div>
					<div className="text-sm text-gray-600">Interview Progress</div>
				</div>

				{/* Visual bars showing data */}
				<div className="space-y-3 flex-1">
					{data.map((value, index) => {
						const percentage = total > 0 ? (value / total) * 100 : 0;
						const label = labels[index] || `Item ${index + 1}`;
						const color = colors[index % colors.length];

						return (
							<div key={`bar-${index}`} className="space-y-1">
								<div className="flex justify-between items-center">
									<div className="flex items-center gap-2">
										<div className="w-4 h-4 rounded-full" style={{ backgroundColor: color }} />
										<span className="text-sm font-medium text-gray-700">{label}</span>
									</div>
									<div className="text-sm font-bold text-gray-800">
										{value} ({percentage.toFixed(0)}%)
									</div>
								</div>

								{/* Progress bar */}
								<div className="w-full bg-gray-200 rounded-full h-3">
									<div
										className="h-3 rounded-full transition-all duration-300"
										style={{
											width: `${percentage}%`,
											backgroundColor: color,
										}}
									/>
								</div>
							</div>
						);
					})}
				</div>

				{/* Summary at bottom */}
				<div className="mt-4 pt-3 border-t border-gray-200">
					<div className="grid grid-cols-3 gap-2 text-center">
						{data.map((value, index) => (
							<div key={`summary-${index}`} className="text-center">
								<div className="text-lg font-bold" style={{ color: colors[index % colors.length] }}>
									{value}
								</div>
								<div className="text-xs text-gray-600 truncate">{labels[index] || `Item ${index + 1}`}</div>
							</div>
						))}
					</div>
				</div>
			</div>
		);
	};

	const renderChart = () => {
		try {
			switch (type) {
				case "line":
				case "area": // Area charts can be rendered as line charts for simplicity
					return renderLineChart();
				case "bar":
					return renderBarChart();
				case "donut":
				case "pie": // Pie charts can be rendered as donut charts
					return renderDonutChart();
				case "scatter":
					return renderLineChart(); // Scatter can be rendered as line for simplicity
				case "radar":
				case "radialBar":
					// For now, render these as donut charts as fallback
					return renderDonutChart();
				default:
					return <div className="h-full flex items-center justify-center text-muted-foreground">Unsupported chart type: {type}</div>;
			}
		} catch (error) {
			console.error("Chart render error:", error);
			return <div className="h-full flex items-center justify-center text-muted-foreground">Chart failed to render</div>;
		}
	};

	return (
		<div className={chartWrapper}>
			<div style={{ height: `${height}px` }} className="w-full">
				{renderChart()}
			</div>
		</div>
	);
}
