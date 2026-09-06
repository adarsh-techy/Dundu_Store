import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Package, Palette, LayoutGrid } from 'lucide-react';
import { insightsApi } from '../../../api';

import OverviewTab from './tabs/OverviewTab';
import ProductDemandTab from './tabs/ProductDemandTab';
import VariantsTab from './tabs/VariantsTab';
import CategoriesTab from './tabs/CategoriesTab';

const TABS = [
  { id: 'overview',   label: 'Overview & KPIs',      icon: BarChart3 },
  { id: 'products',   label: 'Top Products & Demand', icon: Package },
  { id: 'variants',   label: 'Sizes & Colors',       icon: Palette },
  { id: 'categories', label: 'Categories & Types',   icon: LayoutGrid },
];

export default function ProductInsights() {
  const [activeTab, setActiveTab] = useState('overview');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-product-insights'],
    queryFn: insightsApi.getProducts,
    staleTime: 60_000,
  });

  const rawData = data?.data || {};

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Product Insights</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Real-time analytics on top products, customer wishlists, search trends, and size/color demand.
        </p>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-1 overflow-x-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all shrink-0 ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Tab View */}
      <div>
        {activeTab === 'overview' && <OverviewTab data={rawData} />}
        {activeTab === 'products' && <ProductDemandTab data={rawData} />}
        {activeTab === 'variants' && <VariantsTab data={rawData} />}
        {activeTab === 'categories' && <CategoriesTab data={rawData} />}
      </div>
    </div>
  );
}
