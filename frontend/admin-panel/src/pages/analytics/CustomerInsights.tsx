import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, TrendingUp, DollarSign, Star, MapPin, Clock, Target, PieChart } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/utils/api';
import { PieChart as RechartsPieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

interface CustomerSegment {
  segment: string;
  count: number;
  percentage: number;
  avgOrderValue: number;
  totalSpent: number;
  avgOrdersPerMonth: number;
}

interface CustomerAnalytics {
  totalCustomers: number;
  segments: CustomerSegment[];
  topCustomers: Array<{
    id: string;
    username: string;
    totalSpent: number;
    orderCount: number;
    avgOrderValue: number;
    lastOrderDate: string;
  }>;
  customerLifetimeValue: number;
}

interface GeographicData {
  type: string;
  regions: Array<{
    name: string;
    orders: number;
    revenue: number;
    drivers: number;
    density: number;
  }>;
  heatmap: {
    maxValue: number;
    minValue: number;
  };
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const CustomerInsights: React.FC = () => {
  const [selectedSegment, setSelectedSegment] = useState<string>('all');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');

  // Fetch customer analytics
  const { data: customerData, isLoading: customerLoading } = useQuery({
    queryKey: ['analytics', 'customers', selectedSegment],
    queryFn: async () => {
      const response = await api.get(`/analytics/customers${selectedSegment !== 'all' ? `?segment=${selectedSegment}` : ''}`);
      return response.data as CustomerAnalytics;
    },
  });

  // Fetch geographic data
  const { data: geographicData } = useQuery({
    queryKey: ['analytics', 'geographic', 'orders'],
    queryFn: async () => {
      const response = await api.get('/analytics/geographic?type=orders');
      return response.data as GeographicData;
    },
  });

  const segmentData = customerData?.segments.map(segment => ({
    name: segment.segment,
    value: segment.count,
    percentage: segment.percentage,
  })) || [];

  const regionData = geographicData?.regions.map(region => ({
    name: region.name.split(' ')[1] || region.name, // Take second word for shorter labels
    orders: region.orders,
    revenue: region.revenue,
    drivers: region.drivers,
  })) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Customer Insights</h1>
          <p className="text-gray-600 mt-2">
            Detaillierte Analyse Ihres Kundenstamms und deren Verhaltensmuster
          </p>
        </div>
        <div className="flex space-x-2">
          <Select value={selectedSegment} onValueChange={setSelectedSegment}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Segmente</SelectItem>
              <SelectItem value="new">Neue Kunden</SelectItem>
              <SelectItem value="returning">Wiederkehrende</SelectItem>
              <SelectItem value="vip">VIP Kunden</SelectItem>
              <SelectItem value="inactive">Inaktive</SelectItem>
            </SelectContent>
          </Select>
          <Button>
            <Target className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      {customerData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gesamtkunden</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{customerData.totalCustomers.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Registrierte Nutzer
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ø Lifetime Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">€{customerData.customerLifetimeValue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                Durchschnitt pro Kunde
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Top Kunde</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                €{customerData.topCustomers[0]?.totalSpent.toFixed(0) || '0'}
              </div>
              <p className="text-xs text-muted-foreground">
                Höchster Umsatz
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Retention Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">78%</div>
              <p className="text-xs text-muted-foreground">
                Wiederkehrende Kunden
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="segments" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="segments">Segmente</TabsTrigger>
          <TabsTrigger value="geographic">Geografisch</TabsTrigger>
          <TabsTrigger value="behavior">Verhalten</TabsTrigger>
          <TabsTrigger value="loyalty">Loyalty</TabsTrigger>
        </TabsList>

        <TabsContent value="segments" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Customer Segments Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Kunden-Segmente</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPieChart>
                    <Pie
                      data={segmentData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name }) => {
                        const segment = segmentData.find(s => s.name === name);
                        return `${name}: ${segment?.percentage}%`;
                      }}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {segmentData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Segment Details */}
            <Card>
              <CardHeader>
                <CardTitle>Segment-Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {customerData?.segments.map((segment, index) => (
                    <div key={segment.segment} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="font-medium capitalize">{segment.segment}</span>
                        </div>
                        <Badge variant="default">{segment.count} Kunden</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                        <div>Ø Bestellwert: €{segment.avgOrderValue.toFixed(2)}</div>
                        <div>Gesamtumsatz: €{segment.totalSpent.toFixed(0)}</div>
                      </div>
                      <Progress value={segment.percentage} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Customers Table */}
          <Card>
            <CardHeader>
              <CardTitle>Top Kunden</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {customerData?.topCustomers.slice(0, 5).map((customer, index) => (
                  <div key={customer.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{customer.username}</p>
                        <p className="text-sm text-gray-600">
                          {customer.orderCount} Bestellungen • Ø €{customer.avgOrderValue.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">€{customer.totalSpent.toFixed(2)}</p>
                      <p className="text-xs text-gray-500">
                        Letzte Bestellung: {new Date(customer.lastOrderDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="geographic" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Geographic Orders */}
            <Card>
              <CardHeader>
                <CardTitle>Bestellungen nach Region</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={regionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip
                      formatter={(value: any) => [value, 'Bestellungen']}
                      labelFormatter={(label) => `Region: ${label}`}
                    />
                    <Bar dataKey="orders" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Geographic Revenue */}
            <Card>
              <CardHeader>
                <CardTitle>Umsatz nach Region</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={regionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip
                      formatter={(value: any) => [`€${value}`, 'Umsatz']}
                      labelFormatter={(label) => `Region: ${label}`}
                    />
                    <Bar dataKey="revenue" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Region Details */}
          <Card>
            <CardHeader>
              <CardTitle>Regionales Detail</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {geographicData?.regions.map((region) => (
                  <div key={region.name} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{region.name}</h4>
                      <MapPin className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Bestellungen:</span>
                        <span className="font-medium">{region.orders}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Umsatz:</span>
                        <span className="font-medium">€{(region.revenue / 1000).toFixed(0)}K</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Fahrer:</span>
                        <span className="font-medium">{region.drivers}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="behavior" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Bestellfrequenz</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Täglich</span>
                    <span className="font-medium">5%</span>
                  </div>
                  <Progress value={5} className="h-2" />

                  <div className="flex justify-between">
                    <span className="text-sm">Wöchentlich</span>
                    <span className="font-medium">25%</span>
                  </div>
                  <Progress value={25} className="h-2" />

                  <div className="flex justify-between">
                    <span className="text-sm">Monatlich</span>
                    <span className="font-medium">45%</span>
                  </div>
                  <Progress value={45} className="h-2" />

                  <div className="flex justify-between">
                    <span className="text-sm">Gelegentlich</span>
                    <span className="font-medium">25%</span>
                  </div>
                  <Progress value={25} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Bezahlmethoden</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Kreditkarte</span>
                    <span className="font-medium">65%</span>
                  </div>
                  <Progress value={65} className="h-2" />

                  <div className="flex justify-between">
                    <span className="text-sm">PayPal</span>
                    <span className="font-medium">20%</span>
                  </div>
                  <Progress value={20} className="h-2" />

                  <div className="flex justify-between">
                    <span className="text-sm">Apple Pay</span>
                    <span className="font-medium">10%</span>
                  </div>
                  <Progress value={10} className="h-2" />

                  <div className="flex justify-between">
                    <span className="text-sm">Barzahlung</span>
                    <span className="font-medium">5%</span>
                  </div>
                  <Progress value={5} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Bestellzeiten</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Mittags (11-14)</span>
                    <span className="font-medium">35%</span>
                  </div>
                  <Progress value={35} className="h-2" />

                  <div className="flex justify-between">
                    <span className="text-sm">Abends (18-21)</span>
                    <span className="font-medium">45%</span>
                  </div>
                  <Progress value={45} className="h-2" />

                  <div className="flex justify-between">
                    <span className="text-sm">Frühstück (8-11)</span>
                    <span className="font-medium">15%</span>
                  </div>
                  <Progress value={15} className="h-2" />

                  <div className="flex justify-between">
                    <span className="text-sm">Spät (21-24)</span>
                    <span className="font-medium">5%</span>
                  </div>
                  <Progress value={5} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Gericht-Kategorien</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Pizza & Pasta</span>
                    <span className="font-medium">28%</span>
                  </div>
                  <Progress value={28} className="h-2" />

                  <div className="flex justify-between">
                    <span className="text-sm">Asiatisch</span>
                    <span className="font-medium">22%</span>
                  </div>
                  <Progress value={22} className="h-2" />

                  <div className="flex justify-between">
                    <span className="text-sm">Burger</span>
                    <span className="font-medium">18%</span>
                  </div>
                  <Progress value={18} className="h-2" />

                  <div className="flex justify-between">
                    <span className="text-sm">Salate</span>
                    <span className="font-medium">12%</span>
                  </div>
                  <Progress value={12} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="loyalty" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Loyalty Level</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Bronze</span>
                    <Badge variant="default">60%</Badge>
                  </div>
                  <Progress value={60} className="h-2" />

                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Silber</span>
                    <Badge variant="default">25%</Badge>
                  </div>
                  <Progress value={25} className="h-2" />

                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Gold</span>
                    <Badge variant="default">12%</Badge>
                  </div>
                  <Progress value={12} className="h-2" />

                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Platin</span>
                    <Badge variant="default">3%</Badge>
                  </div>
                  <Progress value={3} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Loyalty Benefits</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Gratis Lieferung</span>
                    <Badge variant="default">Gold+</Badge>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm">Priority Support</span>
                    <Badge variant="default">Silber+</Badge>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm">Exklusive Angebote</span>
                    <Badge variant="default">Bronze+</Badge>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm">VIP Events</span>
                    <Badge variant="default">Platin</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Retention Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-4xl font-bold text-green-600 mb-2">78%</div>
                  <p className="text-sm text-gray-600 mb-4">
                    Kunden kommen wieder
                  </p>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>1 Monat</span>
                      <span className="font-medium">85%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>3 Monate</span>
                      <span className="font-medium">72%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>6 Monate</span>
                      <span className="font-medium">65%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>12 Monate</span>
                      <span className="font-medium">58%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CustomerInsights;
