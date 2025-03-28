import { motion } from 'framer-motion';

const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="relative w-full bg-gray-900/90 backdrop-blur-lg shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.3)] border-t border-green-800/50">
      {/* Decorative top edge */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>
      
      <div className="max-w-7xl mx-auto py-8 sm:py-10 md:py-12 px-4 sm:px-6 lg:px-8 relative">
        {/* Background layered effect */}
        <div className="absolute inset-0 bg-gradient-to-b from-gray-900/20 to-gray-900/60 pointer-events-none rounded-lg"></div>
        
        <div className="relative">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 lg:gap-12">
            {/* Logo and description */}
            <div className="col-span-1 sm:col-span-2 md:col-span-1">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
                  mySchoolTree
                </h2>
                <p className="mt-2 text-gray-400 text-sm max-w-xs">
                  Bridging traditional education with blockchain technology for a more secure, transparent future of learning.
                </p>
              </motion.div>
              
              <div className="mt-4 sm:mt-6 flex space-x-4">
                <SocialIcon 
                  href="https://twitter.com" 
                  aria-label="Twitter"
                  icon={
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M22.1623 5.65593C21.3989 5.99362 20.5893 6.2154 19.7603 6.31393C20.634 5.79136 21.288 4.96894 21.6003 3.99993C20.7803 4.48793 19.8813 4.82993 18.9443 5.01493C18.3149 4.34151 17.4807 3.89489 16.5713 3.74451C15.6618 3.59413 14.7282 3.74842 13.9156 4.18338C13.1029 4.61834 12.4567 5.30961 12.0774 6.14972C11.6981 6.98983 11.607 7.93171 11.8183 8.82893C10.1554 8.74558 8.52863 8.31345 7.04358 7.56059C5.55854 6.80773 4.24842 5.75097 3.1983 4.45893C2.82659 5.09738 2.63125 5.82315 2.6323 6.56193C2.6323 8.01193 3.3703 9.29293 4.4923 10.0429C3.82831 10.022 3.17893 9.84271 2.5983 9.51993V9.57193C2.5985 10.5376 2.93267 11.4735 3.54414 12.221C4.15562 12.9684 5.00678 13.4814 5.9533 13.6729C5.33691 13.84 4.6906 13.8646 4.0633 13.7449C4.33016 14.5762 4.8503 15.3031 5.55089 15.824C6.25147 16.3449 7.09742 16.6337 7.9703 16.6499C7.10278 17.3313 6.10947 17.8349 5.04718 18.1321C3.98488 18.4293 2.87442 18.5142 1.7793 18.3819C3.69099 19.6114 5.91639 20.264 8.1893 20.2619C15.8823 20.2619 20.0893 13.8889 20.0893 8.36193C20.0893 8.18193 20.0843 7.99993 20.0763 7.82193C20.8952 7.23009 21.6019 6.49695 22.1633 5.65693L22.1623 5.65593Z" />
                    </svg>
                  } 
                  ariaLabel="Twitter"
                />
                <SocialIcon 
                  href="https://linkedin.com" 
                  aria-label="LinkedIn"
                  icon={
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                    </svg>
                  } 
                  ariaLabel="LinkedIn"
                />
                <SocialIcon 
                  href="https://github.com" 
                  aria-label="GitHub"
                  icon={
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                    </svg>
                  } 
                  ariaLabel="GitHub"
                />
                <SocialIcon 
                  href="https://discord.com" 
                  aria-label="Discord"
                  icon={
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z" />
                    </svg>
                } 
                ariaLabel="Discord"
                />
              </div>
            </div>
            
            {/* Quick links - responsive grid */}
            <div className="hidden xs:block">
              <h3 className="text-sm font-semibold text-gray-300 tracking-wider uppercase">
                Platform
              </h3>
              <ul className="mt-3 space-y-2">
                <FooterLink href="#">Features</FooterLink>
                <FooterLink href="#">How It Works</FooterLink>
                <FooterLink href="#">Pricing</FooterLink>
                <FooterLink href="#">Case Studies</FooterLink>
                <FooterLink href="#">Documentation</FooterLink>
              </ul>
            </div>
            
            {/* Resources links */}
            <div className="hidden xs:block">
              <h3 className="text-sm font-semibold text-gray-300 tracking-wider uppercase">
                Resources
              </h3>
              <ul className="mt-3 space-y-2">
                <FooterLink href="#">Blog</FooterLink>
                <FooterLink href="#">Support Center</FooterLink>
                <FooterLink href="#">Partner Program</FooterLink>
                <FooterLink href="#">Student Wallet</FooterLink>
                <FooterLink href="#">API Documentation</FooterLink>
              </ul>
            </div>
            
            {/* Company links */}
            <div className="hidden xs:block">
              <h3 className="text-sm font-semibold text-gray-300 tracking-wider uppercase">
                Company
              </h3>
              <ul className="mt-3 space-y-2">
                <FooterLink href="#">About</FooterLink>
                <FooterLink href="#">Team</FooterLink>
                <FooterLink href="#">Careers</FooterLink>
                <FooterLink href="#">Contact Us</FooterLink>
                <FooterLink href="#">Privacy Policy</FooterLink>
              </ul>
            </div>
            
            {/* Mobile Footer Links - Accordion style */}
            <div className="block xs:hidden col-span-1 sm:col-span-2 space-y-4">
              <MobileFooterSection title="Platform">
                <ul className="space-y-2 py-2">
                  <FooterLink href="#">Features</FooterLink>
                  <FooterLink href="#">How It Works</FooterLink>
                  <FooterLink href="#">Pricing</FooterLink>
                  <FooterLink href="#">Case Studies</FooterLink>
                  <FooterLink href="#">Documentation</FooterLink>
                </ul>
              </MobileFooterSection>
              
              <MobileFooterSection title="Resources">
                <ul className="space-y-2 py-2">
                  <FooterLink href="#">Blog</FooterLink>
                  <FooterLink href="#">Support Center</FooterLink>
                  <FooterLink href="#">Partner Program</FooterLink>
                  <FooterLink href="#">Student Wallet</FooterLink>
                  <FooterLink href="#">API Documentation</FooterLink>
                </ul>
              </MobileFooterSection>
              
              <MobileFooterSection title="Company">
                <ul className="space-y-2 py-2">
                  <FooterLink href="#">About</FooterLink>
                  <FooterLink href="#">Team</FooterLink>
                  <FooterLink href="#">Careers</FooterLink>
                  <FooterLink href="#">Contact Us</FooterLink>
                  <FooterLink href="#">Privacy Policy</FooterLink>
                </ul>
              </MobileFooterSection>
            </div>
          </div>
          
          {/* Newsletter Subscription */}
          <div className="mt-8 sm:mt-10 pt-6 sm:pt-8 border-t border-gray-800/50">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center">
              <div>
                <h3 className="text-sm sm:text-base font-medium text-white">Subscribe to our newsletter</h3>
                <p className="mt-1.5 text-xs sm:text-sm text-gray-400">
                  Stay updated with the latest in educational blockchain technology.
                </p>
              </div>
              <div>
                <form className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <input
                    type="email"
                    placeholder="Enter your email"
                    className="px-3 sm:px-4 py-2 bg-gray-800/80 border border-gray-700/80 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent flex-grow text-sm"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 rounded-lg text-white font-medium text-sm whitespace-nowrap"
                  >
                    Subscribe
                  </button>
                </form>
              </div>
            </div>
          </div>
          
          {/* Bottom Footer */}
          <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-gray-800/50 flex flex-col sm:flex-row justify-between items-center">
            <p className="text-gray-400 text-xs sm:text-sm">
              &copy; {currentYear} mySchoolTree. All rights reserved.
            </p>
            <div className="mt-3 sm:mt-0 flex space-x-4 sm:space-x-6">
              <span className="text-xs sm:text-sm text-gray-400 hover:text-gray-300">
                <a href="#">Terms</a>
              </span>
              <span className="text-xs sm:text-sm text-gray-400 hover:text-gray-300">
                <a href="#">Privacy</a>
              </span>
              <span className="text-xs sm:text-sm text-gray-400 hover:text-gray-300">
                <a href="#">Cookies</a>
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

// Mobile footer section with toggle functionality
const MobileFooterSection = ({ title, children }: { title: string, children: React.ReactNode }) => {
  return (
    <div className="border-b border-gray-800/50 pb-3">
      <details>
        <summary className="text-sm font-semibold text-gray-300 tracking-wider uppercase cursor-pointer py-2 flex justify-between items-center">
          {title}
          <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </summary>
        {children}
      </details>
    </div>
  );
};

// Footer link component
const FooterLink = ({ href, children }: { href: string, children: React.ReactNode }) => (
  <li>
    <a 
      href={href} 
      className="text-gray-400 hover:text-blue-400 transition-colors text-xs sm:text-sm"
    >
      {children}
    </a>
  </li>
);

// Social icon component
const SocialIcon = ({ href, icon, ariaLabel }: { href: string, icon: React.ReactNode, ariaLabel: string }) => (
  <motion.a
    href={href}
    aria-label={ariaLabel}
    target="_blank"
    rel="noopener noreferrer"
    whileHover={{ scale: 1.1 }}
    whileTap={{ scale: 0.95 }}
    className="text-gray-400 hover:text-blue-400 transition-colors flex items-center justify-center bg-gray-800/30 p-2 rounded-full"
  >
    {icon}
  </motion.a>
);

export default Footer;