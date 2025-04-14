import { ArrowRight, Coffee, CreditCard, Flower, HandCoins, Moon, Sun } from 'lucide-react';
import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';

const WelcomePage = ({ darkMode, toggleDarkMode }) => {
  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-[#F8F3E9] text-gray-900'}`}>
      {/* Theme toggle button */}
      <button
        onClick={toggleDarkMode}
        className={`absolute top-6 right-6 p-2 rounded-full transition-colors ${
          darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-100 shadow-md'
        }`}
        aria-label="Toggle theme"
      >
        {darkMode ? (
          <Sun className="h-5 w-5 text-yellow-400" />
        ) : (
          <Moon className="h-5 w-5 text-gray-700" />
        )}
      </button>

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="relative z-10 pb-8 sm:pb-16 md:pb-20 lg:w-full lg:pb-28 xl:pb-32">
            <main className="mt-10 mx-auto max-w-7xl px-4 sm:mt-12 sm:px-6 md:mt-16 lg:mt-20 lg:px-8 xl:mt-28">
              <div className="text-center">
                <div className="flex justify-center mb-8">
                  <div className="flex items-center justify-center w-20 h-20 rounded-full bg-green-700 text-white">
                    <Coffee className="h-10 w-10" />
                  </div>
                </div>
                <h1 className={`text-4xl tracking-tight font-extrabold sm:text-5xl md:text-6xl ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  <span className="block">Inspire Africa</span>
                  <span className="block text-green-700">Coffee Fund</span>
                </h1>
                <p className={`mt-3 max-w-md mx-auto text-base sm:text-lg md:mt-5 md:text-xl md:max-w-3xl ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Empowering coffee farmers with credit, inputs, and sustainable farming solutions to grow their businesses and improve livelihoods.
                </p>
                <div className="mt-10 max-w-md mx-auto sm:flex sm:justify-center md:mt-12">
                  <div className="rounded-md shadow">
                    <Link
                      to="/login"
                      className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-700 hover:bg-green-800 md:py-4 md:text-lg md:px-10"
                    >
                      Get Started <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </div>
                  <div className="mt-3 rounded-md shadow sm:mt-0 sm:ml-3">
                    <a
                      href="#features"
                      className={`w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md ${
                        darkMode 
                          ? 'bg-gray-800 text-gray-100 hover:bg-gray-700'
                          : 'bg-white text-green-700 hover:bg-gray-50'
                      } md:py-4 md:text-lg md:px-10`}
                    >
                      Learn More
                    </a>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" className={`py-12 ${darkMode ? 'bg-gray-800' : 'bg-[#EBE6DD]'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:text-center">
            <h2 className={`text-base text-green-600 font-semibold tracking-wide uppercase`}>Features</h2>
            <p className={`mt-2 text-3xl leading-8 font-extrabold tracking-tight ${darkMode ? 'text-white' : 'text-gray-900'} sm:text-4xl`}>
              Transforming Coffee Value Chains
            </p>
            <p className={`mt-4 max-w-2xl text-xl ${darkMode ? 'text-gray-300' : 'text-gray-700'} lg:mx-auto`}>
              Our platform connects farmers, cooperatives, SACCOs, and suppliers with the resources they need to thrive.
            </p>
          </div>

          <div className="mt-10">
            <dl className="space-y-10 md:space-y-0 md:grid md:grid-cols-3 md:gap-x-8 md:gap-y-10">
              <div className={`relative p-6 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-white shadow'}`}>
                <dt>
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-green-600 text-white">
                    <CreditCard className="h-6 w-6" />
                  </div>
                  <p className={`ml-16 text-lg leading-6 font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>Credit Access</p>
                </dt>
                <dd className={`mt-2 ml-16 text-base ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Streamlined credit applications and disbursements to help farmers access the capital they need.
                </dd>
              </div>

              <div className={`relative p-6 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-white shadow'}`}>
                <dt>
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-green-600 text-white">
                    <Flower className="h-6 w-6" />
                  </div>
                  <p className={`ml-16 text-lg leading-6 font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>Input Distribution</p>
                </dt>
                <dd className={`mt-2 ml-16 text-base ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Quality-assured inputs like fertilizer, seedlings, and irrigation systems delivered directly to farmers.
                </dd>
              </div>

              <div className={`relative p-6 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-white shadow'}`}>
                <dt>
                  <div className="absolute flex items-center justify-center h-12 w-12 rounded-md bg-green-600 text-white">
                    <HandCoins className="h-6 w-6" />
                  </div>
                  <p className={`ml-16 text-lg leading-6 font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>Structured Repayment</p>
                </dt>
                <dd className={`mt-2 ml-16 text-base ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Harvest-based repayment system that aligns with farmers&apos; income cycles and cash flow.
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* Process Section */}
      <div className={`py-12 ${darkMode ? 'bg-gray-900' : 'bg-white'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:text-center mb-12">
            <h2 className={`text-base text-green-600 font-semibold tracking-wide uppercase`}>How It Works</h2>
            <p className={`mt-2 text-3xl leading-8 font-extrabold tracking-tight ${darkMode ? 'text-white' : 'text-gray-900'} sm:text-4xl`}>
              Our Process
            </p>
            <p className={`mt-4 max-w-2xl text-xl ${darkMode ? 'text-gray-300' : 'text-gray-700'} lg:mx-auto`}>
              A simple, transparent approach to funding and supporting coffee farmers
            </p>
          </div>

          <div className="relative">
            {/* Process steps */}
            <div className="relative z-10">
              <div className="flex flex-col md:flex-row justify-between items-start mb-12">
                <div className={`w-full md:w-1/4 p-4 rounded-lg mb-6 md:mb-0 ${darkMode ? 'bg-gray-800' : 'bg-green-50'}`}>
                  <div className="flex items-center mb-4">
                    <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-green-600 text-white font-bold">1</div>
                    <h3 className={`ml-4 text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>KYC Registration</h3>
                  </div>
                  <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Farmers and stakeholders register and verify their identity through our secure KYC process.
                  </p>
                </div>
                
                <div className={`w-full md:w-1/4 p-4 rounded-lg mb-6 md:mb-0 ${darkMode ? 'bg-gray-800' : 'bg-green-50'}`}>
                  <div className="flex items-center mb-4">
                    <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-green-600 text-white font-bold">2</div>
                    <h3 className={`ml-4 text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>Credit Request</h3>
                  </div>
                  <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Farmers apply for credit through the platform, specifying needs and repayment terms.
                  </p>
                </div>
                
                <div className={`w-full md:w-1/4 p-4 rounded-lg mb-6 md:mb-0 ${darkMode ? 'bg-gray-800' : 'bg-green-50'}`}>
                  <div className="flex items-center mb-4">
                    <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-green-600 text-white font-bold">3</div>
                    <h3 className={`ml-4 text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>Input Delivery</h3>
                  </div>
                  <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Approved farmers receive high-quality inputs from vetted suppliers at fair prices.
                  </p>
                </div>
                
                <div className={`w-full md:w-1/4 p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-green-50'}`}>
                  <div className="flex items-center mb-4">
                    <div className="flex-shrink-0 flex items-center justify-center h-10 w-10 rounded-full bg-green-600 text-white font-bold">4</div>
                    <h3 className={`ml-4 text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>Harvest Repayment</h3>
                  </div>
                  <p className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    Loans are repaid through harvest proceeds, with cooperative assistance and fair terms.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className={`${darkMode ? 'bg-gray-900 border-t border-gray-800' : 'bg-[#EBE6DD]'}`}>
        <div className="max-w-7xl mx-auto py-12 px-4 overflow-hidden sm:px-6 lg:px-8">
          <p className={`text-center text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            &copy; {new Date().getFullYear()} Inspire Africa Coffee Fund. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

WelcomePage.propTypes = {
  darkMode: PropTypes.bool.isRequired,
  toggleDarkMode: PropTypes.func.isRequired
};

export default WelcomePage; 