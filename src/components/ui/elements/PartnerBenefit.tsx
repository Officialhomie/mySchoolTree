
const PartnerBenefit = ({ number, title, description }: { number: string, title: string, description: string }) => (
  <div className="flex">
    <div className="flex-shrink-0">
      <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center border border-blue-500/30">
        <span className="text-blue-400 font-bold">{number}</span>
      </div>
    </div>
    <div className="ml-4">
      <h4 className="text-lg font-medium">{title}</h4>
      <p className="mt-1 text-gray-400 text-sm">{description}</p>
    </div>
  </div>
);

export default PartnerBenefit;