import { Coffee, CreditCard, Home, User, Wallet } from 'lucide-react';
import PropTypes from 'prop-types';
import { useNavigate } from 'react-router-dom';

const BottomNavbar = ({ darkMode, activeSection }) => {
  const navigate = useNavigate();

  // Navigation items with their routes and icons
  const navItems = [
    { id: 'dashboard', label: 'Home', icon: Home, route: '/dashboard' },
    { id: 'farmers', label: 'Farmers', icon: User, route: '/dashboard?section=farmers' },
    { id: 'loans', label: 'Loans', icon: Wallet, route: '/dashboard?section=loans' },
    { id: 'creditRequests', label: 'Credit', icon: CreditCard, route: '/dashboard?section=creditRequests' },
    { id: 'harvests', label: 'Harvests', icon: Coffee, route: '/dashboard?section=harvests' },
  ];

  // Handle navigation
  const handleNavigation = (route) => {
    if (route) {
      navigate(route);
    }
  };

  return (
    <nav className={`md:hidden fixed bottom-0 left-0 right-0 h-16 ${
      darkMode ? 'bg-gray-800 border-t border-gray-700' : 'bg-white border-t border-gray-200'
    } flex items-center justify-around shadow-lg z-10`}>
      {navItems.map((item) => (
        <button
          key={item.id}
          onClick={() => handleNavigation(item.route)}
          className={`flex flex-col items-center justify-center w-full h-full ${
            activeSection === item.id 
              ? 'text-blue-600' 
              : darkMode ? 'text-gray-400' : 'text-gray-500'
          }`}
        >
          {item.icon && <item.icon className="h-5 w-5" />}
          <span className="text-xs mt-1">{item.label}</span>
        </button>
      ))}
    </nav>
  );
};

BottomNavbar.propTypes = {
  darkMode: PropTypes.bool.isRequired,
  activeSection: PropTypes.string,
};

export default BottomNavbar; 