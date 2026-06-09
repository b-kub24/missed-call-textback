'use client';
import { PLANS } from '@/lib/stripe';

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-16">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900">Simple, Transparent Pricing</h1>
          <p className="mt-4 text-xl text-gray-600">Never miss a lead again. Choose the plan that fits your business.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {Object.entries(PLANS).map(([key, plan]) => (
            <div key={key} className={`bg-white rounded-2xl shadow-lg p-8 ${key === 'pro' ? 'ring-2 ring-blue-600 scale-105' : ''}`}>
              {key === 'pro' && <span className="bg-blue-600 text-white text-sm px-3 py-1 rounded-full">Most Popular</span>}
              <h3 className="text-2xl font-bold mt-4">{plan.name}</h3>
              <p className="text-4xl font-bold mt-4">${plan.price}<span className="text-lg text-gray-500">/mo</span></p>
              <ul className="mt-6 space-y-3">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                    {f}
                  </li>
                ))}
              </ul>
              <a href="/login" className={`mt-8 block text-center py-3 rounded-lg font-semibold ${key === 'pro' ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-100 text-gray-900 hover:bg-gray-200'}`}>
                Get Started
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
