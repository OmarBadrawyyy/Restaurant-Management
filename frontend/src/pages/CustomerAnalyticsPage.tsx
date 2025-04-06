import React, { useMemo } from 'react';
import { format } from 'date-fns';
import { useCustomerAnalytics, formatCurrency, formatNumber, formatPercentage } from '../hooks/useAnalytics';
import { 
  AnalyticsAuthorization, 
  AnalyticsHeader, 
  DateRangeSelector, 
  DateRangeWarning,
  BarChartComponent,
  KpiCard,
  AnalyticsLoading,
  ErrorDisplay,
  AnalyticsEmptyState 
} from '../components/AnalyticsComponents';

const CustomerAnalyticsPage: React.FC = () => {
  // Use the custom analytics hook for data fetching and state management
  const { 
    data: customerData, 
    isLoading, 
    error, 
    dateRange,
    handleDateChange,
    handleRetry,
    handleReduceDateRange,
    setLastWeek,
    setLastMonth,
    setThisMonth
  } = useCustomerAnalytics();
  
  // If there's an error, show the error section
  if (error) {
    return (
      <ErrorDisplay 
        error={error} 
        onRetry={handleRetry} 
        onReduceDateRange={handleReduceDateRange} 
      />
    );
  }

  return (
    <AnalyticsAuthorization>
      <div className="container mx-auto px-4 py-8">
        <AnalyticsHeader 
          title="Customer Analytics" 
          subtitle="Analyze customer behavior and spending patterns" 
        />
        
        {/* Date Range Controls */}
        <DateRangeSelector
          dateRange={dateRange}
          onDateChange={handleDateChange}
          onSetLastWeek={setLastWeek}
          onSetLastMonth={setLastMonth}
          onSetThisMonth={setThisMonth}
        />
        
        {isLoading ? (
          <AnalyticsLoading message="Loading customer data..." />
        ) : customerData ? (
          <>
            {/* Customer Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-700 mb-2">Total Customers</h2>
                <p className="text-3xl font-bold">{customerData.summary.totalCustomers}</p>
                <p className="text-sm text-gray-500 mt-1">
                  As of {format(new Date(customerData.period.end), 'MMM d, yyyy')}
                </p>
              </div>
              
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-700 mb-2">New Customers</h2>
                <p className="text-3xl font-bold">{customerData.summary.newCustomers}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {format(new Date(customerData.period.start), 'MMM d')} - {format(new Date(customerData.period.end), 'MMM d, yyyy')}
                </p>
              </div>
              
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-700 mb-2">Active Customers</h2>
                <p className="text-3xl font-bold">{customerData.summary.activeCustomers}</p>
                <p className="text-sm text-gray-500 mt-1">Made purchases in period</p>
              </div>
              
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-700 mb-2">Retention Rate</h2>
                <p className="text-3xl font-bold">{customerData.summary.retentionRate}%</p>
                <p className="text-sm text-gray-500 mt-1">
                  Customer engagement
                </p>
              </div>
            </div>
            
            {/* Top Customers */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
              <h2 className="text-xl font-semibold text-gray-700 p-4 border-b">Top Customers by Spending</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Customer
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Orders
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Total Spent
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Average Order
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {customerData.topCustomers && customerData.topCustomers.length > 0 ? (
                      customerData.topCustomers.map((customer, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {customer.name}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {customer.email}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {customer.orderCount}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatCurrency(customer.totalSpent)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatCurrency(customer.averageOrderValue)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500">
                          No customer data available for the selected period
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Customer Analytics Notes */}
            <div className="bg-blue-50 border-l-4 border-blue-500 text-blue-700 p-4 mb-6" role="note">
              <h3 className="font-bold">About Customer Analytics</h3>
              <ul className="mt-2 list-disc pl-5 space-y-1">
                <li>Total Customers: All customers registered up to the end date</li>
                <li>New Customers: Customers who registered during the selected period</li>
                <li>Active Customers: Customers who placed at least one order during the selected period</li>
                <li>Retention Rate: Percentage of total customers who were active during the period</li>
              </ul>
            </div>
          </>
        ) : (
          <AnalyticsEmptyState onRetry={handleRetry} />
        )}
      </div>
    </AnalyticsAuthorization>
  );
};

export default CustomerAnalyticsPage; 