import { useAccount } from 'wagmi';
import NavigationBar from '../components/NavigationBar';
import HeroSection from '../components/HeroSection';
import AboutSection from '../components/AboutSection';
import FeaturesSection from '../components/FeaturesSection';
import JoinProtocolSection from '../components/JoinProtocolComponent';
import StatsSection from '../components/StatSection';
import Footer from '../components/Footer';  



const Home = () => {
  const account = useAccount();
  
  // const SMFConfig = {
  //   address: contractSchoolManagementFactory.address,
  //   abi: contractSchoolManagementFactory.abi,
  // };

  // const SMBConfig = {
  //   address: contractSchoolManagementBase.address,
  //   abi: contractSchoolManagementBase.abi,
  // };



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
            {/* <SMBConstants contract={{
              address: contractSchoolManagementBase.address as `0x${string}`,
              abi: contractSchoolManagementBase.abi,
            }} /> */}
          </>
        )}
      </main>

      {/* <AttendanceMetricsViewer contract={{
        address: contractAttendanceTracking.address as `0x${string}`,
        abi: contractAttendanceTracking.abi,
      }} /> */}

      <Footer />
    </div>
  );
};

export default Home;