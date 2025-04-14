import {
    Coffee,
    CreditCard,
    Home,
    Truck,
    Wallet
} from 'lucide-react';
import PropTypes from 'prop-types';

const MobileNavigation = ({ darkMode, activeSection, setActiveSection }) => {
  // Define navigation items for mobile
  const mobileNavItems = [
    { id: 'dashboard', label: 'Home', icon: Home },
    { id: 'suppliers', label: 'Suppliers', icon: Truck },
    { id: 'creditRequests', label: 'Credits', icon: CreditCard },
    { id: 'loans', label: 'Loans', icon: Wallet },
    { id: 'harvests', label: 'Harvests', icon: Coffee }
  ];

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-10 border-t ${
      darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
    } py-2 px-1 md:hidden`}>
      <div className="flex items-center justify-between">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-md ${
                activeSection === item.id 
                  ? darkMode 
                    ? 'text-white bg-blue-600' 
                    : 'text-blue-600 bg-blue-50' 
                  : darkMode 
                    ? 'text-gray-300' 
                    : 'text-gray-700'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs mt-1">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

MobileNavigation.propTypes = {
  darkMode: PropTypes.bool.isRequired,
  activeSection: PropTypes.string.isRequired,
  setActiveSection: PropTypes.func.isRequired
};

export default MobileNavigation; 