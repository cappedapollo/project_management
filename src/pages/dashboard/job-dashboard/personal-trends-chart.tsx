import { Chart } from "@/components/chart";
import { useTheme } from "@/theme/hooks/use-theme";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/card";
import { Text } from "@/ui/typography";
import { m } from "motion/react";
import { useMemo } from "react";

interface TrendData {
	label: string;
	applications: number;
	interviews: number;
}

interface PersonalTrendsChartProps {
	monthlyTrends: TrendData[];
	loading?: boolean;
	timePeriod?: string;
}

export default function PersonalTrendsChart({ monthlyTrends, loading = false, timePeriod = "month" }: PersonalTrendsChartProps) {
	const { mode } = useTheme();

	const chartData = useMemo(() => {
		// More strict check for real data - must have actual trends with meaningful data
		const hasRealData =
			monthlyTrends &&
			monthlyTrends.length > 0 &&
			monthlyTrends.some(
				(trend) => trend && typeof trend.applications === "number" && typeof trend.interviews === "number" && (trend.applications > 0 || trend.interviews > 0),
			);

		if (!hasRealData) {
			// Return empty data structure - we'll show a message instead of fake data
			return {
				series: [
					{ name: "Job Applications", data: [] },
					{ name: "Interviews Scheduled", data: [] },
				],
				categories: [],
				hasData: false,
			};
		}

		const categories = monthlyTrends.map((trend) => trend.label);
		const applicationsData = monthlyTrends.map((trend) => trend.applications || 0);
		const interviewsData = monthlyTrends.map((trend) => trend.interviews || 0);

		return {
			series: [
				{ name: "Job Applications", data: applicationsData },
				{ name: "Interviews Scheduled", data: interviewsData },
			],
			categories,
			hasData: true,
		};
	}, [monthlyTrends]);

	const chartOptions = useMemo(
		() => ({
			chart: {
				type: "line" as const,
				height: 280,
				toolbar: {
					show: false,
				},
				animations: {
					enabled: true,
					easing: "easeinout",
					speed: 800,
				},
			},
			colors: ["#3b82f6", "#10b981"],
			stroke: {
				curve: "smooth" as const,
				width: 3,
			},
			grid: {
				borderColor: mode === "dark" ? "#374151" : "#e5e7eb",
				strokeDashArray: 4,
			},
			xaxis: {
				categories: chartData.categories,
				labels: {
					style: {
						colors: mode === "dark" ? "#9ca3af" : "#6b7280",
					},
				},
				axisBorder: {
					color: mode === "dark" ? "#374151" : "#e5e7eb",
				},
			},
			yaxis: {
				labels: {
					style: {
						colors: mode === "dark" ? "#9ca3af" : "#6b7280",
					},
				},
			},
			tooltip: {
				theme: mode,
				x: {
					show: true,
				},
				marker: { show: true },
				y: {
					formatter: (value: number, { seriesIndex }: { seriesIndex: number }) => {
						const type = seriesIndex === 0 ? "application" : "interview";
						const plural = value === 1 ? type : `${type}s`;
						return `${value} ${plural}`;
					},
				},
				custom: ({ series, seriesIndex, dataPointIndex, w }: any) => {
					const category = w.globals.categoryLabels[dataPointIndex];
					const applications = series[0][dataPointIndex];
					const interviews = series[1][dataPointIndex];

					return `
						<div class="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 shadow-lg">
							<div class="font-semibold text-gray-900 dark:text-gray-100 mb-2">${category}</div>
							<div class="space-y-1">
								<div class="flex items-center gap-2">
									<div class="w-3 h-3 rounded-full bg-blue-500"></div>
									<span class="text-sm text-gray-700 dark:text-gray-300">${applications} job application${applications === 1 ? "" : "s"}</span>
								</div>
								<div class="flex items-center gap-2">
									<div class="w-3 h-3 rounded-full bg-green-500"></div>
									<span class="text-sm text-gray-700 dark:text-gray-300">${interviews} interview${interviews === 1 ? "" : "s"} scheduled</span>
								</div>
							</div>
						</div>
					`;
				},
			},
			legend: {
				position: "top" as const,
				horizontalAlign: "right" as const,
				labels: {
					colors: mode === "dark" ? "#9ca3af" : "#6b7280",
				},
			},
			dataLabels: {
				enabled: false,
			},
			markers: {
				size: 6,
				strokeWidth: 2,
				strokeColors: mode === "dark" ? "#1f2937" : "#ffffff",
				colors: ["#3b82f6", "#10b981"],
			},
			fill: {
				type: "gradient",
				gradient: {
					shadeIntensity: 1,
					opacityFrom: 0.3,
					opacityTo: 0.1,
					stops: [0, 90, 100],
				},
			},
		}),
		[chartData.categories, mode],
	);

	if (loading) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<m.div
							animate={{ rotate: 360 }}
							transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY, ease: "linear" }}
							className="w-5 h-5 border-2 border-primary/20 border-t-primary rounded-full"
						/>
						Personal Trends
					</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="h-64 flex items-center justify-center">
						<Text className="text-muted-foreground">Loading trends...</Text>
					</div>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" role="img" aria-label="Chart icon">
						<title>Activity Trends Chart</title>
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18" />
					</svg>
					Activity Trends
					<Text className="text-sm text-muted-foreground font-normal ml-2">
						({timePeriod === "today" ? "Today" : timePeriod === "week" ? "This Week" : timePeriod === "month" ? "This Month" : "All Time"})
					</Text>
				</CardTitle>
			</CardHeader>
			<CardContent>
				{chartData.hasData ? (
					<div>
						<div className="mb-4">
							<Text className="text-sm text-muted-foreground">
								Track your job search activity over time. The chart shows when you submitted applications and scheduled interviews.
							</Text>
						</div>
						<Chart type="line" series={chartData.series} options={chartOptions} height={280} />
						<div className="mt-4 flex items-center justify-center gap-6 text-sm">
							<div className="flex items-center gap-2">
								<div className="w-3 h-3 rounded-full bg-blue-500" />
								<span className="text-muted-foreground">Job Applications</span>
							</div>
							<div className="flex items-center gap-2">
								<div className="w-3 h-3 rounded-full bg-green-500" />
								<span className="text-muted-foreground">Interviews Scheduled</span>
							</div>
						</div>
					</div>
				) : (
					<div className="h-64 flex items-center justify-center">
						<div className="text-center space-y-4">
							<div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto">
								<svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" role="img" aria-label="Chart placeholder">
									<title>No Data Chart Icon</title>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M9 19v-6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2zm0 0V9a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v10m-6 0a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2m0 0V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2z"
									/>
								</svg>
							</div>
							<div>
								<Text className="text-lg font-semibold mb-2">No Activity Data Yet</Text>
								<Text className="text-muted-foreground mb-4 max-w-sm">
									Your activity trends will appear here once you start submitting job applications and scheduling interviews.
								</Text>
								<div className="space-y-2">
									<div className="flex items-center gap-2 text-sm text-muted-foreground justify-center">
										<div className="w-3 h-3 rounded-full bg-blue-500" />
										<span>Job Applications Submitted</span>
									</div>
									<div className="flex items-center gap-2 text-sm text-muted-foreground justify-center">
										<div className="w-3 h-3 rounded-full bg-green-500" />
										<span>Interviews Scheduled</span>
									</div>
								</div>
								<div className="mt-4">
									<Text className="text-xs text-muted-foreground">Start by creating job applications or scheduling interviews to see your trends</Text>
								</div>
							</div>
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
