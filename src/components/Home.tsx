import { useAccount } from 'wagmi';
import NavigationBar from '../components/NavigationBar';
import HeroSection from '../components/HeroSection';
import AboutSection from '../components/AboutSection';
import FeaturesSection from '../components/FeaturesSection';
import JoinProtocolSection from '../components/JoinProtocolComponent';
import StatsSection from '../components/StatSection';
import GetDeployedContracts from '../MSTReadfunction/SMFRead/GetDeployedContracts'; 
import Footer from '../components/Footer';  
import { contractSchoolManagementFactory } from '../contracts';
import UpdateDefaultConfig from '../MSTWriteFunctions/SMFWrite/UpdateDefaultConfig';
import Initialize from '../MSTWriteFunctions/SMFWrite/Initialize';


const Home = () => {
  const account = useAccount();
  
  const contractConfig = {
    address: contractSchoolManagementFactory.address,
    abi: contractSchoolManagementFactory.abi,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white">
      <NavigationBar />
      
      <main className="pt-10 pb-16 px-0 sm:px-2 lg:px-4">
        <HeroSection />
        <AboutSection />
        <FeaturesSection />
        <JoinProtocolSection />
        
        {/* Only show stats and contracts when wallet is connected */}
        {account.status === 'connected' && (
          <>
            <StatsSection />
            <div className="max-w-7xl mx-auto mt-16 px-4">
              <GetDeployedContracts contract={contractConfig.address} />
            </div>
          </>
        )}
      </main>

      <UpdateDefaultConfig contract={contractConfig.address} />
      <Initialize contract={contractConfig.address} />

      <Footer />
    </div>
  );
};

export default Home;