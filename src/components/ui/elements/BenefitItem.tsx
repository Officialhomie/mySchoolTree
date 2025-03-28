import React from 'react';

const BenefitItem = ({ title, children }: { title: string, children: React.ReactNode }) => (
  <div>
    <div className="flex items-start">
      <div className="flex-shrink-0 mt-1">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      </div>
      <div className="ml-3">
        <h4 className="text-sm font-medium text-blue-400">{title}</h4>
        <p className="mt-1 text-sm text-gray-400">{children}</p>
      </div>
    </div>
  </div>
);

export default BenefitItem;