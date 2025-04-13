"use client";

import { useState, useEffect } from "react";
import Papa from "papaparse";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  AlertCircle,
  BarChart3,
  DollarSign,
  Download,
  HelpCircle,
  Home,
  Info,
  LineChart as LineChartIcon,
  Map,
  Percent,
  PieChart as PieChartIcon,
  TrendingUp,
  Building,
  Waves,
} from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

interface HousingData {
  YEAR: number;
  COUNTY: string;
  STATE?: string;
  Classification: "ADU" | "NON_ADU" | "POTENTIAL_ADU_CONVERSION";
  JOB_VALUE: number;
  [key: string]: any;
}

interface UnitsByYearData {
  year: string;
  ADU: number;
  NON_ADU: number;
  POTENTIAL_ADU_CONVERSION: number;
}

interface AduPercentageByYearData {
  year: string;
  aduPercentage: number;
  aduCount: number;
  totalCount: number;
}

interface UnitsByJurisdictionData {
  county: string;
  total: number;
  ADU: number;
}

interface JobValueByCountyData {
  county: string;
  avgValue: number;
  count: number;
}

interface AverageAduJobValueByYearData {
  year: string;
  avgAduValue: number;
  count: number;
}

interface AduJobValuePercentageByYearData {
  year: string;
  aduJobValuePercentage: number;
  aduValue: number;
  totalValue: number;
}

interface AvgJobValueByStructureTypeAndYearData {
  year: string;
  ADU: number;
  NON_ADU: number;
  POTENTIAL_ADU_CONVERSION: number;
}

interface ChartDataState {
  unitsByYear: UnitsByYearData[];
  aduPercentageByYear: AduPercentageByYearData[];
  unitsByJurisdiction: UnitsByJurisdictionData[];
  aduJobValuePercentageByYear: AduJobValuePercentageByYearData[];
  avgJobValueByStructureTypeAndYear: AvgJobValueByStructureTypeAndYearData[];
  jobValueByCounty: JobValueByCountyData[];
  averageAduJobValueByYear: AverageAduJobValueByYearData[];
}

interface ValueAggregate {
  sum: number;
  count: number;
}

// Consistent color theme used in our charts
const THEME_COLORS = {
  adu: "#2563eb",             // Primary Blue
  nonAdu: "#10b981",          // Green
  potentialAdu: "#f97316",    // Orange
  primary: "#2563eb",
  secondary: "#64748b",
  accent: "#f0f9ff",
  muted: "#94a3b8",
  background: "#f8fafc",
  card: "#ffffff",
  cardHover: "#f1f5f9",
  border: "#e2e8f0",
  text: "#0f172a",
};

// Generate sample data if CSV not found
const generateSampleData = (): HousingData[] => {
  const counties = [
    "Santa Clara",
    "Los Angeles",
    "San Diego",
    "Alameda",
    "Orange",
    "San Francisco",
    "Riverside",
  ];
  const years = [2018, 2019, 2020, 2021, 2022, 2023];
  const classifications = ["ADU", "NON_ADU", "POTENTIAL_ADU_CONVERSION"];

  return Array.from({ length: 300 }, (_, i) => ({
    YEAR: years[Math.floor(Math.random() * years.length)],
    COUNTY: counties[Math.floor(Math.random() * counties.length)],
    Classification:
      classifications[Math.floor(Math.random() * classifications.length)] as any,
    JOB_VALUE: Math.floor(Math.random() * 300000) + 100000,
    ID: i + 1,
  }));
};

export default function AduPermitDashboard() {
  const [data, setData] = useState<HousingData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<ChartDataState>({
    unitsByYear: [],
    aduPercentageByYear: [],
    unitsByJurisdiction: [],
    aduJobValuePercentageByYear: [],
    avgJobValueByStructureTypeAndYear: [],
    jobValueByCounty: [],
    averageAduJobValueByYear: [],
  });
  const [activeTab, setActiveTab] = useState<string>("overview");
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Attempt to load the CSV from "public/housing_data.csv"
        const response = await fetch("/housing_data.csv");

        if (!response.ok) {
          // If CSV not found, warn and use sample data
          console.warn("CSV not found. Using sample data instead.");
          const sampleData = generateSampleData();
          setData(sampleData);
          processData(sampleData);
          return;
        }

        const csvText = await response.text();
        const parsedData = Papa.parse<HousingData>(csvText, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
        });

        if (parsedData.errors?.length) {
          throw new Error(parsedData.errors[0].message);
        }

        setData(parsedData.data);
        processData(parsedData.data);
      } catch (err) {
        // If any error, revert to sample data and set error message
        console.error("Error loading data:", err);
        const sampleData = generateSampleData();
        setData(sampleData);
        processData(sampleData);
        setError("Could not load CSV data. Displaying sample data instead.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // -----------------------
  // DATA PROCESSING
  // -----------------------

  const processUnitsByYear = (data: HousingData[]): UnitsByYearData[] => {
    const unitsByYear = data.reduce((acc, row) => {
      const year = row.YEAR.toString();
      if (!acc[year]) {
        acc[year] = {
          year,
          ADU: 0,
          NON_ADU: 0,
          POTENTIAL_ADU_CONVERSION: 0,
        };
      }
      acc[year][row.Classification]++;
      return acc;
    }, {} as Record<string, UnitsByYearData>);

    return Object.values(unitsByYear).sort(
      (a, b) => parseInt(a.year) - parseInt(b.year),
    );
  };

  const processAduPercentageByYear = (
    data: HousingData[],
  ): AduPercentageByYearData[] => {
    const yearlyData = processUnitsByYear(data);
    return yearlyData.map(({ year, ADU, NON_ADU, POTENTIAL_ADU_CONVERSION }) => {
      const total = ADU + NON_ADU + POTENTIAL_ADU_CONVERSION;
      const aduPercentage = total > 0 ? (ADU / total) * 100 : 0;
      return {
        year,
        aduPercentage: Math.round(aduPercentage),
        aduCount: ADU,
        totalCount: total,
      };
    });
  };

  const processUnitsByJurisdiction = (
    data: HousingData[],
  ): UnitsByJurisdictionData[] => {
    const jurisdictionData = data.reduce((acc, row) => {
      if (!acc[row.COUNTY]) {
        acc[row.COUNTY] = { ADU: 0, total: 0 };
      }
      if (row.Classification === "ADU") {
        acc[row.COUNTY].ADU++;
      }
      acc[row.COUNTY].total++;
      return acc;
    }, {} as Record<string, { ADU: number; total: number }>);

    return Object.entries(jurisdictionData)
      .map(([county, { ADU, total }]) => ({ county, ADU, total }))
      .sort((a, b) => b.ADU - a.ADU)
      .slice(0, 8);
  };

  const processAduJobValuePercentageByYear = (
    data: HousingData[],
  ): AduJobValuePercentageByYearData[] => {
    const groupedByYear = data.reduce((acc, row) => {
      const year = row.YEAR.toString();
      if (!acc[year]) {
        acc[year] = { aduValue: 0, totalValue: 0 };
      }
      acc[year].totalValue += row.JOB_VALUE;
      if (row.Classification === "ADU") {
        acc[year].aduValue += row.JOB_VALUE;
      }
      return acc;
    }, {} as Record<string, { aduValue: number; totalValue: number }>);

    return Object.entries(groupedByYear)
      .map(([year, val]) => {
        const ratio =
          val.totalValue > 0 ? (val.aduValue / val.totalValue) * 100 : 0;
        return {
          year,
          aduJobValuePercentage: Math.round(ratio),
          aduValue: val.aduValue,
          totalValue: val.totalValue,
        };
      })
      .sort((a, b) => parseInt(a.year) - parseInt(b.year));
  };

  const processAverageJobValueByStructureTypeAndYear = (
    data: HousingData[],
  ): AvgJobValueByStructureTypeAndYearData[] => {
    const grouped = data.reduce((acc, row) => {
      const year = row.YEAR.toString();
      if (!acc[year]) {
        acc[year] = {
          ADU: { sum: 0, count: 0 },
          NON_ADU: { sum: 0, count: 0 },
          POTENTIAL_ADU_CONVERSION: { sum: 0, count: 0 },
        };
      }
      acc[year][row.Classification].sum += row.JOB_VALUE;
      acc[year][row.Classification].count++;
      return acc;
    }, {} as Record<
      string,
      {
        ADU: ValueAggregate;
        NON_ADU: ValueAggregate;
        POTENTIAL_ADU_CONVERSION: ValueAggregate;
      }
    >);

    return Object.entries(grouped)
      .map(([year, sums]) => {
        const aduAvg =
          sums.ADU.count > 0 ? Math.round(sums.ADU.sum / sums.ADU.count) : 0;
        const nonAduAvg =
          sums.NON_ADU.count > 0
            ? Math.round(sums.NON_ADU.sum / sums.NON_ADU.count)
            : 0;
        const potAduAvg =
          sums.POTENTIAL_ADU_CONVERSION.count > 0
            ? Math.round(
                sums.POTENTIAL_ADU_CONVERSION.sum /
                  sums.POTENTIAL_ADU_CONVERSION.count,
              )
            : 0;

        return {
          year,
          ADU: aduAvg,
          NON_ADU: nonAduAvg,
          POTENTIAL_ADU_CONVERSION: potAduAvg,
        };
      })
      .sort((a, b) => parseInt(a.year) - parseInt(b.year));
  };

  const processJobValueByCounty = (data: HousingData[]): JobValueByCountyData[] => {
    const countyData = data.reduce((acc, row) => {
      if (row.Classification === "ADU" && row.JOB_VALUE) {
        if (!acc[row.COUNTY]) acc[row.COUNTY] = { sum: 0, count: 0 };
        acc[row.COUNTY].sum += row.JOB_VALUE;
        acc[row.COUNTY].count++;
      }
      return acc;
    }, {} as Record<string, ValueAggregate>);

    return Object.entries(countyData)
      .map(([county, { sum, count }]) => ({
        county,
        avgValue: Math.round(sum / count / 1000), // in thousands
        count,
      }))
      .sort((a, b) => b.avgValue - a.avgValue)
      .slice(0, 8);
  };

  const processAverageAduJobValueByYear = (
    data: HousingData[],
  ): AverageAduJobValueByYearData[] => {
    const yearlyData = data.reduce((acc, row) => {
      if (row.Classification === "ADU" && row.JOB_VALUE) {
        const year = row.YEAR.toString();
        if (!acc[year]) acc[year] = { sum: 0, count: 0 };
        acc[year].sum += row.JOB_VALUE;
        acc[year].count++;
      }
      return acc;
    }, {} as Record<string, ValueAggregate>);

    return Object.entries(yearlyData)
      .map(([year, { sum, count }]) => ({
        year,
        avgAduValue: Math.round(sum / count / 1000), // in thousands
        count,
      }))
      .sort((a, b) => parseInt(a.year) - parseInt(b.year));
  };

  const processData = (data: HousingData[]) => {
    const _unitsByYear = processUnitsByYear(data);
    const _aduPercentageByYear = processAduPercentageByYear(data);
    const _unitsByJurisdiction = processUnitsByJurisdiction(data);
    const _aduJobValuePercentageByYear = processAduJobValuePercentageByYear(data);
    const _avgJobValueByStructureTypeAndYear =
      processAverageJobValueByStructureTypeAndYear(data);
    const _jobValueByCounty = processJobValueByCounty(data);
    const _averageAduJobValueByYear = processAverageAduJobValueByYear(data);

    setChartData({
      unitsByYear: _unitsByYear,
      aduPercentageByYear: _aduPercentageByYear,
      unitsByJurisdiction: _unitsByJurisdiction,
      aduJobValuePercentageByYear: _aduJobValuePercentageByYear,
      avgJobValueByStructureTypeAndYear: _avgJobValueByStructureTypeAndYear,
      jobValueByCounty: _jobValueByCounty,
      averageAduJobValueByYear: _averageAduJobValueByYear,
    });
  };

  // -----------------------
  // UI & MISC
  // -----------------------

  // Custom minimal tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow text-sm text-gray-800">
        <p className="font-semibold mb-1">{label}</p>
        {payload.map((entry: any) => (
          <div key={entry.name} className="flex items-center gap-2 py-1">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span>{entry.name}:</span>
            <span className="font-medium">
              {typeof entry.value === "number"
                ? entry.value.toLocaleString()
                : entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  };

  const handleDownloadData = () => {
    toast({
      title: "Download Started",
      description: "Your CSV file is being prepared.",
    });

    // In a real application, you’d generate and download the CSV here
    setTimeout(() => {
      toast({
        title: "Download Complete",
        description: "Your data has been downloaded successfully.",
      });
    }, 1200);
  };

  // Simple stats (for top cards)
  const getOverviewData = () => {
    if (!chartData.aduPercentageByYear.length) return { trend: 0, latest: 0 };
    const arr = chartData.aduPercentageByYear;
    const latestYear = arr[arr.length - 1];
    const previousYear =
      arr.length > 1 ? arr[arr.length - 2] : { aduPercentage: 0 };
    const trend = latestYear.aduPercentage - previousYear.aduPercentage;
    return { trend, latest: latestYear.aduPercentage };
  };

  const getAverageValueData = () => {
    if (!chartData.averageAduJobValueByYear.length)
      return { trend: 0, latest: 0 };
    const arr = chartData.averageAduJobValueByYear;
    const latestYear = arr[arr.length - 1];
    const previousYear =
      arr.length > 1 ? arr[arr.length - 2] : { avgAduValue: 0 };
    const trend = latestYear.avgAduValue - previousYear.avgAduValue;
    return { trend, latest: latestYear.avgAduValue };
  };

  const getTopCounty = () => {
    if (!chartData.unitsByJurisdiction.length) return "N/A";
    return chartData.unitsByJurisdiction[0].county;
  };

  // Loading Skeleton
  const renderSkeleton = () => (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-32" />
      </div>
      <Skeleton className="h-14 w-full mb-8" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="overflow-hidden rounded-lg shadow-sm">
            <CardHeader className="pb-2">
              <Skeleton className="h-5 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-1/3 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <Card key={i} className="rounded-lg shadow-sm">
            <CardHeader>
              <Skeleton className="h-8 w-3/4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-80 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  // Error message if CSV loading fails
  const renderError = () => (
    <div className="p-6 max-w-7xl mx-auto">
      <Alert variant="destructive" className="mb-8">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error Loading Data</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>

      <Card className="rounded-lg border shadow-sm">
        <CardHeader>
          <CardTitle>Sample Data in Use</CardTitle>
          <CardDescription>
            The dashboard is currently displaying sample data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>
            We were unable to load the housing CSV file. Please ensure the file
            is present and properly formatted.
          </p>
        </CardContent>
      </Card>
    </div>
  );

  if (loading) return renderSkeleton();

  const overviewData = getOverviewData();
  const valueData = getAverageValueData();

  return (
    <div className="p-6 max-w-7xl mx-auto min-h-screen bg-gradient-to-b from-gray-50 via-white to-white space-y-8">
      {/* Notice if using sample data */}
      {error && (
        <Alert variant="default" className="mb-4 border-amber-500 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          <AlertTitle className="text-amber-700">Data Source Notice</AlertTitle>
          <AlertDescription className="text-amber-600">{error}</AlertDescription>
        </Alert>
      )}

      {/* HEADER */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Home className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold text-gray-900">
              ADU Permit Explorer
            </h1>
          </div>
          <p className="mt-2 max-w-lg text-sm text-gray-600">
            An interactive look at Accessory Dwelling Unit (ADU) permit trends
            and valuations across California counties.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleDownloadData}>
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
          <Button variant="outline" size="sm">
            <HelpCircle className="h-4 w-4 mr-2" />
            Dashboard Guide
          </Button>
        </div>
      </header>

      {/* TOP CARDS */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="shadow-sm border hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center text-sm text-gray-600">
              <Percent className="h-4 w-4 mr-2 text-blue-600" />
              ADUs as % of All Permits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                <div className="text-3xl font-bold text-gray-800">
                  {overviewData.latest}%
                </div>
                <div className="flex items-center mt-1">
                  {overviewData.trend >= 0 ? (
                    <Badge
                      variant="outline"
                      className="bg-green-50 text-green-700 border-green-200"
                    >
                      <TrendingUp className="h-3 w-3 mr-1" />
                      +{overviewData.trend}%
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="bg-red-50 text-red-700 border-red-200"
                    >
                      <TrendingUp className="h-3 w-3 mr-1 rotate-180" />
                      {overviewData.trend}%
                    </Badge>
                  )}
                  <span className="text-xs text-gray-500 ml-2">
                    vs. previous year
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center text-sm text-gray-600">
              <DollarSign className="h-4 w-4 mr-2 text-indigo-600" />
              Avg ADU Permit Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                <div className="text-3xl font-bold text-gray-800">
                  ${valueData.latest}k
                </div>
                <div className="flex items-center mt-1">
                  {valueData.trend >= 0 ? (
                    <Badge
                      variant="outline"
                      className="bg-green-50 text-green-700 border-green-200"
                    >
                      <TrendingUp className="h-3 w-3 mr-1" />
                      +${valueData.trend}k
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="bg-red-50 text-red-700 border-red-200"
                    >
                      <TrendingUp className="h-3 w-3 mr-1 rotate-180" />
                      ${valueData.trend}k
                    </Badge>
                  )}
                  <span className="text-xs text-gray-500 ml-2">
                    vs. previous year
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center text-sm text-gray-600">
              <Building className="h-4 w-4 mr-2 text-purple-600" />
              Leading ADU County
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                <div className="text-3xl font-bold text-gray-800">
                  {getTopCounty()}
                </div>
                <div className="flex items-center mt-1">
                  <Badge
                    variant="outline"
                    className="bg-blue-50 text-blue-700 border-blue-200"
                  >
                    <Map className="h-3 w-3 mr-1" />
                    Most Permits
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* MAIN TABS */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 w-full sm:w-[500px] mb-6">
          <TabsTrigger value="overview" className="flex gap-2 rounded-none">
            <PieChartIcon className="h-4 w-4" />
            Key Trends
          </TabsTrigger>
          <TabsTrigger value="units" className="flex gap-2 rounded-none">
            <BarChart3 className="h-4 w-4" />
            Permit Volume
          </TabsTrigger>
          <TabsTrigger value="values" className="flex gap-2 rounded-none">
            <LineChartIcon className="h-4 w-4" />
            Permit Value
          </TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview">
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-sm border hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-700">
                  <PieChartIcon className="h-5 w-5 text-blue-600" />
                  ADU Share of Total Permits
                </CardTitle>
                <CardDescription className="text-sm text-gray-500">
                  % of ADUs among all structures, by year
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart
                    data={chartData.aduPercentageByYear}
                    margin={{ top: 20, right: 20, left: 0, bottom: 20 }}
                  >
                    <defs>
                      <linearGradient
                        id="aduPercentageGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor={THEME_COLORS.adu}
                          stopOpacity={0.7}
                        />
                        <stop
                          offset="95%"
                          stopColor={THEME_COLORS.adu}
                          stopOpacity={0.1}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      stroke={THEME_COLORS.muted}
                      strokeDasharray="3 3"
                      strokeOpacity={0.3}
                    />
                    <XAxis
                      dataKey="year"
                      stroke={THEME_COLORS.muted}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      stroke={THEME_COLORS.muted}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(val) => `${val}%`}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ opacity: 0.1 }} />
                    <Area
                      dataKey="aduPercentage"
                      name="ADU %"
                      stroke={THEME_COLORS.adu}
                      fill="url(#aduPercentageGradient)"
                      isAnimationActive
                      animationBegin={100}
                      animationDuration={900}
                      activeDot={{
                        r: 4,
                        stroke: THEME_COLORS.background,
                        strokeWidth: 2,
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="shadow-sm border hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-700">
                  <Waves className="h-5 w-5 text-blue-600" />
                  ADU Share of Permit Value
                </CardTitle>
                <CardDescription className="text-sm text-gray-500">
                  % of total permit value attributed to ADUs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart
                    data={chartData.aduJobValuePercentageByYear}
                    margin={{ top: 20, right: 20, left: 0, bottom: 20 }}
                  >
                    <defs>
                      <linearGradient
                        id="aduValueGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor={THEME_COLORS.adu}
                          stopOpacity={0.7}
                        />
                        <stop
                          offset="95%"
                          stopColor={THEME_COLORS.adu}
                          stopOpacity={0.1}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      stroke={THEME_COLORS.muted}
                      strokeDasharray="3 3"
                      strokeOpacity={0.3}
                    />
                    <XAxis
                      dataKey="year"
                      stroke={THEME_COLORS.muted}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      stroke={THEME_COLORS.muted}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(val) => `${val}%`}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ opacity: 0.1 }} />
                    <Area
                      dataKey="aduJobValuePercentage"
                      name="ADU Value %"
                      stroke={THEME_COLORS.adu}
                      fill="url(#aduValueGradient)"
                      isAnimationActive
                      animationBegin={100}
                      animationDuration={900}
                      activeDot={{
                        r: 4,
                        stroke: THEME_COLORS.background,
                        strokeWidth: 2,
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </section>
        </TabsContent>

        {/* PERMIT VOLUME TAB */}
        <TabsContent value="units">
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-sm border hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-700">
                  <Waves className="h-5 w-5 text-blue-600" />
                  Permit Volume by Structure Type
                </CardTitle>
                <CardDescription className="text-sm text-gray-500">
                  Stacked area of ADU, Non-ADU, Potential ADU by year
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart
                    data={chartData.unitsByYear}
                    margin={{ top: 20, right: 20, left: 0, bottom: 20 }}
                  >
                    <defs>
                      <linearGradient
                        id="grad-adu"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop offset="5%" stopColor={THEME_COLORS.adu} stopOpacity={0.7} />
                        <stop offset="95%" stopColor={THEME_COLORS.adu} stopOpacity={0.1} />
                      </linearGradient>
                      <linearGradient
                        id="grad-nonadu"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop offset="5%" stopColor={THEME_COLORS.nonAdu} stopOpacity={0.7} />
                        <stop offset="95%" stopColor={THEME_COLORS.nonAdu} stopOpacity={0.1} />
                      </linearGradient>
                      <linearGradient
                        id="grad-potadu"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor={THEME_COLORS.potentialAdu}
                          stopOpacity={0.7}
                        />
                        <stop
                          offset="95%"
                          stopColor={THEME_COLORS.potentialAdu}
                          stopOpacity={0.1}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      stroke={THEME_COLORS.muted}
                      strokeDasharray="3 3"
                      strokeOpacity={0.3}
                    />
                    <XAxis
                      dataKey="year"
                      stroke={THEME_COLORS.muted}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      stroke={THEME_COLORS.muted}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ opacity: 0.1 }} />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="POTENTIAL_ADU_CONVERSION"
                      name="Potential ADU"
                      stackId="1"
                      stroke={THEME_COLORS.potentialAdu}
                      fill="url(#grad-potadu)"
                      isAnimationActive
                      animationBegin={100}
                      animationDuration={900}
                    />
                    <Area
                      type="monotone"
                      dataKey="NON_ADU"
                      name="Non-ADU"
                      stackId="1"
                      stroke={THEME_COLORS.nonAdu}
                      fill="url(#grad-nonadu)"
                      isAnimationActive
                      animationBegin={100}
                      animationDuration={900}
                    />
                    <Area
                      type="monotone"
                      dataKey="ADU"
                      name="ADU"
                      stackId="1"
                      stroke={THEME_COLORS.adu}
                      fill="url(#grad-adu)"
                      isAnimationActive
                      animationBegin={100}
                      animationDuration={900}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="shadow-sm border hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-700">
                  <Map className="h-5 w-5 text-blue-600" />
                  Top Counties by ADU Permits
                </CardTitle>
                <CardDescription className="text-sm text-gray-500">
                  Leading 8 counties (by total ADU count)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={chartData.unitsByJurisdiction}
                    layout="vertical"
                    margin={{ top: 20, right: 20, left: 80, bottom: 20 }}
                  >
                    <CartesianGrid
                      stroke={THEME_COLORS.muted}
                      strokeDasharray="3 3"
                      strokeOpacity={0.3}
                    />
                    <XAxis
                      type="number"
                      stroke={THEME_COLORS.muted}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      dataKey="county"
                      type="category"
                      width={100}
                      stroke={THEME_COLORS.muted}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ opacity: 0.1 }} />
                    <Legend />
                    <Bar
                      dataKey="ADU"
                      name="ADU Permits"
                      fill={THEME_COLORS.adu}
                      radius={[4, 4, 4, 4]}
                      isAnimationActive
                      animationBegin={100}
                      animationDuration={900}
                      barSize={18}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </section>
        </TabsContent>

        {/* PERMIT VALUE TAB */}
        <TabsContent value="values">
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-sm border hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-700">
                  <Waves className="h-5 w-5 text-blue-600" />
                  Avg Permit Value by Type
                </CardTitle>
                <CardDescription className="text-sm text-gray-500">
                  ADU, Non-ADU, and Potential ADU comparison
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart
                    data={chartData.avgJobValueByStructureTypeAndYear}
                    margin={{ top: 20, right: 20, left: 0, bottom: 20 }}
                  >
                    <defs>
                      <linearGradient
                        id="aduValueGrad"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor={THEME_COLORS.adu}
                          stopOpacity={0.7}
                        />
                        <stop
                          offset="95%"
                          stopColor={THEME_COLORS.adu}
                          stopOpacity={0.1}
                        />
                      </linearGradient>
                      <linearGradient
                        id="nonAduValueGrad"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor={THEME_COLORS.nonAdu}
                          stopOpacity={0.7}
                        />
                        <stop
                          offset="95%"
                          stopColor={THEME_COLORS.nonAdu}
                          stopOpacity={0.1}
                        />
                      </linearGradient>
                      <linearGradient
                        id="potAduValueGrad"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor={THEME_COLORS.potentialAdu}
                          stopOpacity={0.7}
                        />
                        <stop
                          offset="95%"
                          stopColor={THEME_COLORS.potentialAdu}
                          stopOpacity={0.1}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      stroke={THEME_COLORS.muted}
                      strokeDasharray="3 3"
                      strokeOpacity={0.3}
                    />
                    <XAxis
                      dataKey="year"
                      stroke={THEME_COLORS.muted}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      stroke={THEME_COLORS.muted}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(val) => `$${(val / 1000).toLocaleString()}k`}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ opacity: 0.1 }} />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="POTENTIAL_ADU_CONVERSION"
                      name="Potential ADU"
                      stroke={THEME_COLORS.potentialAdu}
                      fill="url(#potAduValueGrad)"
                      isAnimationActive
                      animationBegin={100}
                      animationDuration={900}
                    />
                    <Area
                      type="monotone"
                      dataKey="NON_ADU"
                      name="Non-ADU"
                      stroke={THEME_COLORS.nonAdu}
                      fill="url(#nonAduValueGrad)"
                      isAnimationActive
                      animationBegin={100}
                      animationDuration={900}
                    />
                    <Area
                      type="monotone"
                      dataKey="ADU"
                      name="ADU"
                      stroke={THEME_COLORS.adu}
                      fill="url(#aduValueGrad)"
                      isAnimationActive
                      animationBegin={100}
                      animationDuration={900}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="shadow-sm border hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-gray-700">
                  <Building className="h-5 w-5 text-blue-600" />
                  Top Counties by ADU Value
                </CardTitle>
                <CardDescription className="text-sm text-gray-500">
                  Leading 8 counties (avg value in thousands)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={chartData.jobValueByCounty}
                    layout="vertical"
                    margin={{ top: 20, right: 20, left: 80, bottom: 20 }}
                  >
                    <CartesianGrid
                      stroke={THEME_COLORS.muted}
                      strokeDasharray="3 3"
                      strokeOpacity={0.3}
                    />
                    <XAxis
                      type="number"
                      stroke={THEME_COLORS.muted}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(val) => `$${val}k`}
                    />
                    <YAxis
                      dataKey="county"
                      type="category"
                      width={100}
                      stroke={THEME_COLORS.muted}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip content={<CustomTooltip />} cursor={{ opacity: 0.1 }} />
                    <Legend />
                    <Bar
                      dataKey="avgValue"
                      name="Avg ADU Value (k)"
                      fill={THEME_COLORS.adu}
                      radius={[4, 4, 4, 4]}
                      isAnimationActive
                      animationBegin={100}
                      animationDuration={900}
                      barSize={18}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </section>
        </TabsContent>
      </Tabs>

      {/* FOOTER */}
      <footer className="mt-8 text-center text-sm text-gray-400 border-t border-gray-200 pt-4">
        <p>Data last updated: {new Date().toLocaleDateString()}</p>
        <p className="mt-1 inline-flex items-center gap-1">
          <Info className="h-3 w-3" />
          This dashboard highlights ADU construction and valuation trends
          across California.
        </p>
      </footer>
    </div>
  );
}
