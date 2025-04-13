"use client";
import { useState, useEffect } from "react";
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
  Line,
  ReferenceLine,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import Papa from "papaparse";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  LineChart as LineChartIcon,
  AlertCircle,
  Home,
  PieChart as PieChartIcon,
  TrendingUp,
  Map,
  Download,
  Info,
  HelpCircle,
  Calendar,
  DollarSign,
  Percent,
  Building,
  Waves,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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

interface ChartDataState {
  unitsByYear: UnitsByYearData[];
  unitsByJurisdiction: UnitsByJurisdictionData[];
  jobValueByCounty: JobValueByCountyData[];
  averageAduJobValueByYear: AverageAduJobValueByYearData[];
  aduPercentageByYear: AduPercentageByYearData[];
}

interface ValueAggregate {
  sum: number;
  count: number;
}

// Fallback sample data if the CSV cannot be loaded
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
    Classification: classifications[
      Math.floor(Math.random() * classifications.length)
    ] as any,
    JOB_VALUE: Math.floor(Math.random() * 300000) + 100000,
    ID: i + 1,
  }));
};

const THEME_COLORS = {
  adu: "#2563eb", // Blue
  nonAdu: "#10b981", // Green
  potentialAdu: "#f97316", // Orange
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

const HousingDashboard = () => {
  const [data, setData] = useState<HousingData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [chartData, setChartData] = useState<ChartDataState>({
    unitsByYear: [],
    unitsByJurisdiction: [],
    jobValueByCounty: [],
    averageAduJobValueByYear: [],
    aduPercentageByYear: [],
  });
  const [activeTab, setActiveTab] = useState<string>("overview");
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch("/housing_data.csv");

        // If the file is not accessible, use sample data
        if (!response.ok) {
          console.warn("CSV file could not be loaded. Using sample data...");
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
        console.error("Error loading data:", err);
        const sampleData = generateSampleData();
        setData(sampleData);
        processData(sampleData);
        setError(
          "Unable to retrieve the CSV file. Displaying sample data instead."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const processData = (housingData: HousingData[]) => {
    setChartData({
      unitsByYear: processUnitsByYear(housingData),
      unitsByJurisdiction: processUnitsByJurisdiction(housingData),
      jobValueByCounty: processJobValueByCounty(housingData),
      averageAduJobValueByYear: processAverageAduJobValueByYear(housingData),
      aduPercentageByYear: processAduPercentageByYear(housingData),
    });
  };

  const processUnitsByYear = (housingData: HousingData[]): UnitsByYearData[] => {
    const unitsByYear = housingData.reduce((acc, row) => {
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
      (a, b) => parseInt(a.year) - parseInt(b.year)
    );
  };

  const processAduPercentageByYear = (
    housingData: HousingData[]
  ): AduPercentageByYearData[] => {
    const yearlyData = processUnitsByYear(housingData);
    return yearlyData.map(({ year, ADU, NON_ADU, POTENTIAL_ADU_CONVERSION }) => {
      const total = ADU + NON_ADU + POTENTIAL_ADU_CONVERSION;
      return {
        year,
        aduCount: ADU,
        totalCount: total,
        aduPercentage: total > 0 ? Math.round((ADU / total) * 100) : 0,
      };
    });
  };

  const processUnitsByJurisdiction = (
    housingData: HousingData[]
  ): UnitsByJurisdictionData[] => {
    const jurisdictionData = housingData.reduce((acc, row) => {
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

  const processJobValueByCounty = (
    housingData: HousingData[]
  ): JobValueByCountyData[] => {
    const countyData = housingData.reduce((acc, row) => {
      if (row.Classification === "ADU" && row.JOB_VALUE) {
        if (!acc[row.COUNTY]) {
          acc[row.COUNTY] = { sum: 0, count: 0 };
        }
        acc[row.COUNTY].sum += row.JOB_VALUE;
        acc[row.COUNTY].count++;
      }
      return acc;
    }, {} as Record<string, ValueAggregate>);

    return Object.entries(countyData)
      .map(([county, { sum, count }]) => ({
        county,
        avgValue: Math.round(sum / count / 1000),
        count,
      }))
      .sort((a, b) => b.avgValue - a.avgValue)
      .slice(0, 8);
  };

  const processAverageAduJobValueByYear = (
    housingData: HousingData[]
  ): AverageAduJobValueByYearData[] => {
    const yearlyData = housingData.reduce((acc, row) => {
      if (row.Classification === "ADU" && row.JOB_VALUE) {
        const year = row.YEAR.toString();
        if (!acc[year]) {
          acc[year] = { sum: 0, count: 0 };
        }
        acc[year].sum += row.JOB_VALUE;
        acc[year].count++;
      }
      return acc;
    }, {} as Record<string, ValueAggregate>);

    return Object.entries(yearlyData)
      .map(([year, { sum, count }]) => ({
        year,
        avgAduValue: Math.round(sum / count / 1000),
        count,
      }))
      .sort((a, b) => parseInt(a.year) - parseInt(b.year));
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow text-left">
        <p className="font-semibold mb-2 text-gray-800">{label}</p>
        {payload.map((entry: any) => (
          <div key={entry.name} className="flex items-center gap-2 py-1">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-gray-700">{entry.name}:</span>
            <span className="font-medium text-gray-900">
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
      title: "Download Initiated",
      description: "Your data file is being prepared for download.",
    });

    // In a production environment, this function would initiate a real download.
    setTimeout(() => {
      toast({
        title: "Download Complete",
        description: "Data file was successfully downloaded.",
      });
    }, 1500);
  };

  // Overview metrics
  const getOverviewData = () => {
    if (!chartData.aduPercentageByYear.length) return { trend: 0, latest: 0 };
    const latestYear =
      chartData.aduPercentageByYear[chartData.aduPercentageByYear.length - 1];
    const previousYear =
      chartData.aduPercentageByYear.length > 1
        ? chartData.aduPercentageByYear[
            chartData.aduPercentageByYear.length - 2
          ]
        : { aduPercentage: 0 };

    const trend = latestYear.aduPercentage - previousYear.aduPercentage;
    return {
      trend,
      latest: latestYear.aduPercentage,
    };
  };

  const getAverageValueData = () => {
    if (!chartData.averageAduJobValueByYear.length)
      return { trend: 0, latest: 0 };
    const latestYear =
      chartData.averageAduJobValueByYear[
        chartData.averageAduJobValueByYear.length - 1
      ];
    const previousYear =
      chartData.averageAduJobValueByYear.length > 1
        ? chartData.averageAduJobValueByYear[
            chartData.averageAduJobValueByYear.length - 2
          ]
        : { avgAduValue: 0 };
    const trend = latestYear.avgAduValue - previousYear.avgAduValue;
    return {
      trend,
      latest: latestYear.avgAduValue,
    };
  };

  const getTopCounty = () => {
    if (!chartData.unitsByJurisdiction.length) return "N/A";
    return chartData.unitsByJurisdiction[0].county;
  };

  // Loading state: skeleton placeholders
  const renderSkeleton = () => (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-10 w-32" />
      </div>

      <Skeleton className="h-14 w-full mb-8" />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="overflow-hidden">
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
          <Card key={i}>
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

  // Error state
  const renderError = () => (
    <div className="p-6 max-w-7xl mx-auto">
      <Alert variant="destructive" className="mb-8">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error Loading Data</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
      <Card>
        <CardHeader>
          <CardTitle>Sample Data in Use</CardTitle>
          <CardDescription>
            The dashboard is currently displaying sample data for demonstration.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p>
            We were unable to load the housing data CSV file. Please ensure the
            file is accessible and properly formatted.
          </p>
        </CardContent>
      </Card>
    </div>
  );

  if (loading) {
    return renderSkeleton();
  }

  const overviewData = getOverviewData();
  const valueData = getAverageValueData();

  return (
    <div className="p-6 max-w-7xl mx-auto bg-background min-h-screen">
      {error && (
        <Alert variant="default" className="mb-8 border-amber-500 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          <AlertTitle className="text-amber-700">Notification</AlertTitle>
          <AlertDescription className="text-amber-600">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Home className="h-6 w-6 text-primary" />
            <h1 className="text-3xl font-bold text-gray-900">
              ADU Project Insights Dashboard
            </h1>
          </div>
          <p className="text-muted-foreground mt-2">
            A comprehensive analysis of Accessory Dwelling Unit permits and
            construction trends
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleDownloadData}>
            <Download className="h-4 w-4 mr-2" />
            Export Data
          </Button>
          <Button variant="outline" size="sm">
            <HelpCircle className="h-4 w-4 mr-2" />
            Help
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-blue-50 to-white border-blue-100 hover:shadow-md transition-all duration-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center">
              <Percent className="h-4 w-4 mr-2 text-blue-500" />
              ADU Share of Total Permits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                <div className="text-3xl font-bold text-gray-900">
                  {overviewData.latest}%
                </div>
                <div className="flex items-center mt-1">
                  {overviewData.trend > 0 ? (
                    <Badge
                      variant="outline"
                      className="bg-green-50 text-green-700 border-green-200"
                    >
                      <TrendingUp className="h-3 w-3 mr-1" />+
                      {overviewData.trend}%
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
                  <span className="text-gray-500 text-xs ml-2">
                    vs previous year
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-indigo-50 to-white border-indigo-100 hover:shadow-md transition-all duration-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center">
              <DollarSign className="h-4 w-4 mr-2 text-indigo-500" />
              Average ADU Construction Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div>
                <div className="text-3xl font-bold text-gray-900">
                  ${valueData.latest}k
                </div>
                <div className="flex items-center mt-1">
                  {valueData.trend > 0 ? (
                    <Badge
                      variant="outline"
                      className="bg-green-50 text-green-700 border-green-200"
                    >
                      <TrendingUp className="h-3 w-3 mr-1" /> +$
                      {valueData.trend}k
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="bg-red-50 text-red-700 border-red-200"
                    >
                      <TrendingUp className="h-3 w-3 mr-1 rotate-180" /> $
                      {valueData.trend}k
                    </Badge>
                  )}
                  <span className="text-gray-500 text-xs ml-2">
                    vs previous year
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-white border-purple-100 hover:shadow-md transition-all duration-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center">
              <Building className="h-4 w-4 mr-2 text-purple-500" />
              Leading ADU County
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <div className="text-3xl font-bold text-gray-900">
                {getTopCounty()}
              </div>
              <div className="flex items-center mt-1">
                <Badge
                  variant="outline"
                  className="bg-blue-50 text-blue-700 border-blue-200"
                >
                  <Map className="h-3 w-3 mr-1" /> Highest ADU Volume
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Section */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
        <TabsList className="grid grid-cols-3 w-full sm:w-[500px] mb-6">
          <TabsTrigger value="overview" className="flex gap-2">
            <PieChartIcon className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="units" className="flex gap-2">
            <BarChart3 className="h-4 w-4" />
            Units Analysis
          </TabsTrigger>
          <TabsTrigger value="values" className="flex gap-2">
            <LineChartIcon className="h-4 w-4" />
            Value Analysis
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ADU Percentage Trend by Year */}
            <Card className="hover:shadow-md transition-all duration-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChartIcon className="h-5 w-5 text-blue-500" />
                  ADU Percentage Trend (Yearly)
                </CardTitle>
                <CardDescription>
                  Tracks ADUs as a percentage of total housing permits over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData.aduPercentageByYear}>
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
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="95%"
                          stopColor={THEME_COLORS.adu}
                          stopOpacity={0.1}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={THEME_COLORS.border}
                    />
                    <XAxis
                      dataKey="year"
                      stroke={THEME_COLORS.text}
                      tick={{ fill: THEME_COLORS.text }}
                    />
                    <YAxis
                      domain={[0, 10]}
                      stroke={THEME_COLORS.text}
                      tick={{ fill: THEME_COLORS.text }}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      dataKey="aduPercentage"
                      name="ADU Percentage"
                      stroke={THEME_COLORS.adu}
                      fill="url(#aduPercentageGradient)"
                      activeDot={{
                        r: 5,
                        stroke: THEME_COLORS.background,
                        strokeWidth: 2,
                      }}
                    />
                    <ReferenceLine
                      y={25}
                      stroke={THEME_COLORS.secondary}
                      strokeDasharray="4 4"
                      label={{
                        value: "50% Target",
                        position: "insideBottomRight",
                        fill: THEME_COLORS.secondary,
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Wave Chart: Permits by Classification */}
            <Card className="hover:shadow-md transition-all duration-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Waves className="h-5 w-5 text-blue-500" />
                  Permits Trend by Type
                </CardTitle>
                <CardDescription>
                  Stacked area visualization of ADU vs. Non-ADU permits over
                  time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart
                    data={chartData.unitsByYear}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="aduGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor={THEME_COLORS.adu}
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="95%"
                          stopColor={THEME_COLORS.adu}
                          stopOpacity={0.1}
                        />
                      </linearGradient>
                      <linearGradient
                        id="nonAduGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor={THEME_COLORS.nonAdu}
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="95%"
                          stopColor={THEME_COLORS.nonAdu}
                          stopOpacity={0.1}
                        />
                      </linearGradient>
                      <linearGradient
                        id="potentialAduGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor={THEME_COLORS.potentialAdu}
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="95%"
                          stopColor={THEME_COLORS.potentialAdu}
                          stopOpacity={0.1}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={THEME_COLORS.border}
                    />
                    <XAxis
                      dataKey="year"
                      stroke={THEME_COLORS.text}
                      tick={{ fill: THEME_COLORS.text }}
                    />
                    <YAxis
                      stroke={THEME_COLORS.text}
                      tick={{ fill: THEME_COLORS.text }}
                      domain={[0, 3000]}
                      ticks={[0, 100, 200, 500, 1000, 1500, 2000, 3000, 4000]}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Area
                      dataKey="POTENTIAL_ADU_CONVERSION"
                      name="Potential ADU Conversion"
                      type="monotone"
                      stackId="1"
                      stroke={THEME_COLORS.potentialAdu}
                      fillOpacity={1}
                      fill="url(#potentialAduGradient)"
                    />
                    <Area
                      dataKey="NON_ADU"
                      name="Non-ADU"
                      type="monotone"
                      stackId="1"
                      stroke={THEME_COLORS.nonAdu}
                      fillOpacity={1}
                      fill="url(#nonAduGradient)"
                    />
                    <Area
                      dataKey="ADU"
                      name="ADU"
                      type="monotone"
                      stackId="1"
                      stroke={THEME_COLORS.adu}
                      fillOpacity={1}
                      fill="url(#aduGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Units Analysis Tab */}
        <TabsContent value="units">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ADU Share by Year */}
            <Card className="hover:shadow-md transition-all duration-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Percent className="h-5 w-5 text-blue-500" />
                  ADU Share over Time
                </CardTitle>
                <CardDescription>
                  Year-over-year percentage comparison of ADUs to total permits
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData.aduPercentageByYear}>
                    <defs>
                      <linearGradient
                        id="aduPercentageGradient2"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor={THEME_COLORS.adu}
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="95%"
                          stopColor={THEME_COLORS.adu}
                          stopOpacity={0.1}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={THEME_COLORS.border}
                    />
                    <XAxis
                      dataKey="year"
                      stroke={THEME_COLORS.text}
                      tick={{ fill: THEME_COLORS.text }}
                    />
                    <YAxis
                      domain={[0, 10]}
                      stroke={THEME_COLORS.text}
                      tick={{ fill: THEME_COLORS.text }}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      dataKey="aduPercentage"
                      name="ADU Percentage"
                      stroke={THEME_COLORS.adu}
                      fill="url(#aduPercentageGradient2)"
                      activeDot={{
                        r: 5,
                        stroke: THEME_COLORS.background,
                        strokeWidth: 2,
                      }}
                    />
                    <ReferenceLine
                      y={50}
                      stroke={THEME_COLORS.secondary}
                      strokeDasharray="4 4"
                      label={{
                        value: "50% Target",
                        position: "insideBottomRight",
                        fill: THEME_COLORS.secondary,
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* ADU Permits by County (Horizontal Bar) */}
            <Card className="hover:shadow-md transition-all duration-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Map className="h-5 w-5 text-blue-500" />
                  ADU Permits by County
                </CardTitle>
                <CardDescription>
                  Comparison of ADU activity in top counties
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={chartData.unitsByJurisdiction}
                    layout="vertical"
                    barSize={15}
                    margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={THEME_COLORS.border}
                    />
                    <XAxis
                      type="number"
                      stroke={THEME_COLORS.text}
                      tick={{ fill: THEME_COLORS.text }}
                    />
                    <YAxis
                      type="category"
                      dataKey="county"
                      width={100}
                      stroke={THEME_COLORS.text}
                      tick={{ fill: THEME_COLORS.text }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                      dataKey="ADU"
                      name="ADU Permits"
                      fill={THEME_COLORS.adu}
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Value Analysis Tab */}
        <TabsContent value="values">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Average ADU Job Value by Year */}
            <Card className="hover:shadow-md transition-all duration-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Waves className="h-5 w-5 text-blue-500" />
                  Yearly Average ADU Construction Value
                </CardTitle>
                <CardDescription>
                  Shows the average ADU construction value (in thousands)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData.averageAduJobValueByYear}>
                    <defs>
                      <linearGradient
                        id="valueGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor={THEME_COLORS.adu}
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="95%"
                          stopColor={THEME_COLORS.adu}
                          stopOpacity={0.1}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={THEME_COLORS.border}
                    />
                    <XAxis
                      dataKey="year"
                      stroke={THEME_COLORS.text}
                      tick={{ fill: THEME_COLORS.text }}
                    />
                    <YAxis
                      stroke={THEME_COLORS.text}
                      tick={{ fill: THEME_COLORS.text }}
                      tickFormatter={(value) => `$${value}k`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="avgAduValue"
                      name="Average Value (K)"
                      stroke={THEME_COLORS.adu}
                      fill="url(#valueGradient)"
                      activeDot={{
                        r: 5,
                        stroke: THEME_COLORS.background,
                        strokeWidth: 2,
                      }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* ADU Job Value by County */}
            <Card className="hover:shadow-md transition-all duration-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5 text-blue-500" />
                  ADU Job Value by County
                </CardTitle>
                <CardDescription>
                  Displays average ADU construction values by county (in
                  thousands)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={chartData.jobValueByCounty}
                    barSize={15}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
                  >
                    <defs>
                      <linearGradient
                        id="countyValueGradient"
                        x1="0"
                        y1="0"
                        x2="1"
                        y2="0"
                      >
                        <stop
                          offset="5%"
                          stopColor={THEME_COLORS.adu}
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="95%"
                          stopColor="#8884d8"
                          stopOpacity={0.8}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke={THEME_COLORS.border}
                    />
                    <XAxis
                      type="number"
                      stroke={THEME_COLORS.text}
                      tick={{ fill: THEME_COLORS.text }}
                      tickFormatter={(value) => `$${value}k`}
                    />
                    <YAxis
                      type="category"
                      dataKey="county"
                      width={100}
                      stroke={THEME_COLORS.text}
                      tick={{ fill: THEME_COLORS.text }}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar
                      dataKey="avgValue"
                      name="Average Value (K)"
                      fill="url(#countyValueGradient)"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Footer */}
      <div className="mt-8 text-center text-sm text-muted-foreground border-t pt-4">
        <p>Data last updated: {new Date().toLocaleDateString()}</p>
        <p className="mt-1 inline-flex items-center">
          <Info className="h-3 w-3 mr-1" />
          This dashboard provides key metrics on ADU housing trends and
          construction values in California.
        </p>
      </div>
    </div>
  );
};

export default HousingDashboard;