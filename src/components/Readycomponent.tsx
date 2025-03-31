import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

const CountdownTimer = () => {
  // Set the target date to 2.5 days from now
  const calculateTargetDate = () => {
    const now = new Date();
    const targetDate = new Date(now);
    targetDate.setHours(now.getHours() + 60); // 2.5 days = 60 hours
    return targetDate;
  };

  const [targetDate] = useState(calculateTargetDate());
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  });
  const [particleCount] = useState(30);
  const [particles] = useState(Array.from({ length: particleCount }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 4 + 1,
    speed: Math.random() * 0.5 + 0.1
  })));

  useEffect(() => {
    const calculateTimeLeft = () => {
      const now = new Date();
      const difference = targetDate.getTime() - now.getTime();
      
      if (difference > 0) {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);
        
        setTimeLeft({ days, hours, minutes, seconds });
      }
    };

    calculateTimeLeft(); // Calculate immediately

    const timer = setInterval(calculateTimeLeft, 1000);
    
    return () => clearInterval(timer);
  }, [targetDate]);

  // Animation variants for various elements
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        when: "beforeChildren",
        staggerChildren: 0.3,
        duration: 1 
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { type: "spring", stiffness: 100 }
    }
  };

  const digitVariants = {
    initial: { scale: 0.8, opacity: 0.5 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.8, opacity: 0 }
  };
  // Function to render a single time unit (days, hours, etc.)
  const TimeUnit = ({ value, label }: { value: number; label: string }) => (
    <motion.div 
      className="flex flex-col items-center justify-center"
      variants={itemVariants}
    >
      <motion.div 
        className="bg-gray-800/80 backdrop-blur-sm border border-gray-700 rounded-lg shadow-lg h-20 w-20 sm:h-24 sm:w-24 md:h-32 md:w-32 flex items-center justify-center relative overflow-hidden"
        whileHover={{ scale: 1.05, boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.2)' }}
      >
        <motion.div 
          className="text-3xl sm:text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent"
          key={value}
          variants={digitVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          {value.toString().padStart(2, '0')}
        </motion.div>
        
        {/* Decorative line */}
        <div className="absolute w-full h-px bg-gradient-to-r from-transparent via-gray-600 to-transparent top-1/2"></div>
        
        {/* Decorative dots */}
        <div className="absolute right-0 top-1/2 transform translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-gray-600"></div>
        <div className="absolute left-0 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-gray-600"></div>
      </motion.div>
      <p className="mt-2 text-gray-400 text-sm md:text-base font-medium">{label}</p>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center relative overflow-hidden">
      {/* Floating particles background */}
      <div className="absolute inset-0 overflow-hidden">
        {particles.map(particle => (
          <motion.div
            key={particle.id}
            className="absolute rounded-full"
            style={{ 
              left: `${particle.x}%`, 
              top: `${particle.y}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              background: `rgba(${Math.floor(Math.random() * 100 + 60)}, ${Math.floor(Math.random() * 100 + 90)}, ${Math.floor(Math.random() * 155 + 100)}, ${Math.random() * 0.5 + 0.2})`
            }}
            animate={{
              y: [`${particle.y}%`, `${(particle.y + particle.speed * 20) % 100}%`],
              x: [`${particle.x}%`, `${(particle.x + (Math.random() * 2 - 1)) % 100}%`],
              opacity: [0.7, 0.3, 0.7]
            }}
            transition={{
              duration: 10 / particle.speed,
              repeat: Infinity,
              repeatType: "reverse",
              ease: "easeInOut"
            }}
          />
        ))}
      </div>

      {/* Main content container */}
      <motion.div 
        className="container mx-auto px-4 py-12 z-10 relative"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.div 
          className="bg-gray-900/90 backdrop-blur-sm border border-gray-700 shadow-xl rounded-lg p-8 md:p-12 max-w-4xl mx-auto relative overflow-hidden"
          whileHover={{ boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.9)' }}
        >
          {/* Decorative corner gradient */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-gradient-to-br from-blue-500/20 to-purple-600/20 rounded-full blur-xl"></div>
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-gradient-to-tr from-green-500/20 to-teal-600/20 rounded-full blur-xl"></div>
          
          {/* Heading */}
          <motion.h1 
            className="text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-6 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent"
            variants={itemVariants}
          >
            App Will Be Ready Soon
          </motion.h1>
          
          <motion.p 
            className="text-gray-300 text-center mb-10 text-lg md:text-xl"
            variants={itemVariants}
          >
            We're working hard to bring you something amazing
          </motion.p>

          {/* Countdown timer */}
          <motion.div 
            className="grid grid-cols-2 sm:grid-cols-4 gap-4 md:gap-8 mb-10"
            variants={itemVariants}
          >
            <TimeUnit value={timeLeft.days} label="Days" />
            <TimeUnit value={timeLeft.hours} label="Hours" />
            <TimeUnit value={timeLeft.minutes} label="Minutes" />
            <TimeUnit value={timeLeft.seconds} label="Seconds" />
          </motion.div>

          {/* Progress bar */}
          <motion.div 
            className="mb-8"
            variants={itemVariants}
          >
            <div className="relative h-4 bg-gray-800 rounded-full overflow-hidden border border-gray-700">
              <motion.div 
                className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-purple-600"
                initial={{ width: "5%" }}
                animate={{ width: "60%" }}
                transition={{ duration: 2, ease: "easeOut" }}
              ></motion.div>
            </div>
            <p className="text-right text-sm text-gray-400 mt-2">Development progress: 60%</p>
          </motion.div>

          {/* Subscribe form */}
          <motion.div 
            className="mb-6 text-center"
            variants={itemVariants}
          >
            <p className="text-gray-300 mb-4">Want to be notified when we launch?</p>
            <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input 
                type="email" 
                placeholder="Enter your email" 
                className="flex-1 bg-gray-800 border border-gray-600 text-gray-200 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
              />
              <motion.button 
                className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-all duration-300"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Notify Me
              </motion.button>
            </div>
          </motion.div>

          {/* Features preview */}
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center"
            variants={itemVariants}
          >
            <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto mb-3 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <h3 className="text-gray-200 font-semibold mb-1">Lightning Fast</h3>
              <p className="text-gray-400 text-sm">Optimized for speed and performance</p>
            </div>
            <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto mb-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <h3 className="text-gray-200 font-semibold mb-1">Secure & Reliable</h3>
              <p className="text-gray-400 text-sm">Enterprise-grade security built in</p>
            </div>
            <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto mb-3 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
              <h3 className="text-gray-200 font-semibold mb-1">Beautiful UI</h3>
              <p className="text-gray-400 text-sm">Stunning design that feels intuitive</p>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default CountdownTimer;