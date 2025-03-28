
const StatCard = ({ title, value }: { title: string, value: string }) => (
  <div className="p-4 bg-gray-700/50 rounded-xl text-center">
    <p className="text-gray-400 text-sm mb-1">{title}</p>
    <p className="text-2xl font-bold">{value}</p>
  </div>
);

export default StatCard;