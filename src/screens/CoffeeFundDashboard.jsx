import { collection, getCountFromServer, getDocs, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import {
    AlertTriangle,
    BarChart,
    Building,
    Coffee,
    CreditCard,
    Flower,
    Home,
    LogOut,
    Menu,
    Moon,
    RefreshCw,
    Settings,
    Star,
    Sun,
    Truck,
    User,
    Wallet
} from 'lucide-react';
import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase/firebase';

// Import management components
import CreditRequestsManagement from './coffee/CreditRequestsManagement';
import FarmersManagement from './coffee/FarmersManagement';
import HarvestsManagement from './coffee/HarvestsManagement';
import InputOrdersManagement from './coffee/InputOrdersManagement';
import LoansManagement from './coffee/LoansManagement';
import OrganizationsManagement from './coffee/OrganizationsManagement';
import SuppliersManagement from './coffee/SuppliersManagement';
import GradingView from './coffee/transactions/GradingView';
// import SettingsScreen from './coffee/SettingsScreen';
// import AnalyticsScreen from './coffee/AnalyticsScreen';

const CoffeeFundDashboard = ({ darkMode, updateDarkMode }) => {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [menuOpen, setMenuOpen] = useState(true);
  const { user, logout, devModeEnabled } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);

  // Use the role from the authenticated user
  const userRole = user?.role || 'admin';

  // State for dashboard statistics
  const [stats, setStats] = useState({
    farmers: 0,
    cooperatives: 0,
    saccos: 0,
    suppliers: 0,
    activeLoans: 0,
    pendingLoans: 0,
    completedLoans: 0,
    pendingCreditRequests: 0,
    approvedCreditRequests: 0,
    inputOrders: 0,
    pendingOrders: 0,
    processingOrders: 0,
    deliveredOrders: 0,
    totalHarvests: 0,
    totalHarvestedWeight: 0
  });

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Function to format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Function to format date
  const formatDate = (date) => {
    if (!date) return '';
    if (typeof date === 'string') {
      // Try to parse the date string
      return new Date(date).toLocaleDateString();
    }
    // Handle Firestore Timestamp objects
    if (date && typeof date.toDate === 'function') {
      return date.toDate().toLocaleDateString();
    }
    // Fallback for Date objects
    if (date instanceof Date) {
      return date.toLocaleDateString();
    }
    return '';
  };

  // Fetch recent transactions from various collections
  const fetchRecentTransactions = async () => {
    setIsLoadingTransactions(true);
    try {
      // Fetch recent credit requests
      const creditRequestsQuery = query(
        collection(db, 'creditRequests'),
        orderBy('createdAt', 'desc'),
        limit(5)
      );
      const creditRequestsSnapshot = await getDocs(creditRequestsQuery);
      const creditRequests = creditRequestsSnapshot.docs.map(doc => ({
        id: doc.id,
        type: 'Credit Request',
        user: doc.data().farmerName || doc.data().requestorName || 'Unknown',
        amount: doc.data().amount || 0,
        status: doc.data().status || 'pending',
        date: doc.data().createdAt || new Date(),
        rawDate: doc.data().createdAt || new Date()
      }));

      // Fetch recent loans
      const loansQuery = query(
        collection(db, 'loans'),
        orderBy('createdAt', 'desc'),
        limit(5)
      );
      const loansSnapshot = await getDocs(loansQuery);
      const loans = loansSnapshot.docs.map(doc => ({
        id: doc.id,
        type: 'Loan Disbursement',
        user: doc.data().borrowerName || 'Unknown',
        amount: doc.data().amount || 0,
        status: doc.data().status || 'pending',
        date: doc.data().approvalDate || doc.data().createdAt || new Date(),
        rawDate: doc.data().approvalDate || doc.data().createdAt || new Date()
      }));

      // Fetch recent input orders
      const inputOrdersQuery = query(
        collection(db, 'inputOrders'),
        orderBy('orderDate', 'desc'),
        limit(5)
      );
      const inputOrdersSnapshot = await getDocs(inputOrdersQuery);
      const inputOrders = inputOrdersSnapshot.docs.map(doc => ({
        id: doc.id,
        type: 'Input Delivery',
        user: doc.data().farmerName || doc.data().organizationName || 'Unknown',
        amount: doc.data().totalCost || doc.data().totalAmount || 0,
        status: doc.data().status || 'pending',
        date: doc.data().orderDate || new Date(),
        rawDate: doc.data().orderDate || new Date()
      }));

      // Fetch recent harvests
      const harvestsQuery = query(
        collection(db, 'harvests'),
        orderBy('harvestDate', 'desc'),
        limit(5)
      );
      const harvestsSnapshot = await getDocs(harvestsQuery);
      const harvests = harvestsSnapshot.docs.map(doc => ({
        id: doc.id,
        type: 'Harvest Record',
        user: doc.data().farmerName || 'Unknown Farmer',
        amount: `${doc.data().quantity || 0} kg`,
        status: 'recorded',
        date: doc.data().harvestDate || new Date(),
        rawDate: doc.data().harvestDate || new Date()
      }));

      // Combine all transactions and sort by date
      const allTransactions = [...creditRequests, ...loans, ...inputOrders, ...harvests]
        .sort((a, b) => {
          // Handle Firestore timestamps or date objects
          const dateA = a.rawDate && typeof a.rawDate.toDate === 'function' ? a.rawDate.toDate() : new Date(a.rawDate);
          const dateB = b.rawDate && typeof b.rawDate.toDate === 'function' ? b.rawDate.toDate() : new Date(b.rawDate);
          return dateB - dateA; // Sort by most recent first
        })
        .slice(0, 10); // Take the top 10 most recent

      setRecentTransactions(allTransactions);
    } catch (error) {
      console.error('Error fetching recent transactions:', error);
    } finally {
      setIsLoadingTransactions(false);
    }
  };

  // Fetch real-time statistics from Firestore
  useEffect(() => {
    setIsLoading(true);
    
    const fetchStatistics = async () => {
      try {
        // Get farmers count
        const farmersRef = collection(db, 'farmers');
        const farmersSnapshot = await getCountFromServer(farmersRef);
        const farmersCount = farmersSnapshot.data().count;
        
        // Get cooperatives count
        const cooperativesRef = collection(db, 'cooperatives');
        const cooperativesSnapshot = await getCountFromServer(cooperativesRef);
        const cooperativesCount = cooperativesSnapshot.data().count;
        
        // Get SACCOs count
        const saccosRef = collection(db, 'saccos');
        const saccosSnapshot = await getCountFromServer(saccosRef);
        const saccosCount = saccosSnapshot.data().count;
        
        // Get suppliers count
        const suppliersRef = collection(db, 'suppliers');
        const suppliersSnapshot = await getCountFromServer(suppliersRef);
        const suppliersCount = suppliersSnapshot.data().count;
        
        // Get loans counts by status
        const loansRef = collection(db, 'loans');
        
        const activeLoansQuery = query(loansRef, where('status', '==', 'active'));
        const activeLoansSnapshot = await getCountFromServer(activeLoansQuery);
        const activeLoansCount = activeLoansSnapshot.data().count;
        
        const pendingLoansQuery = query(loansRef, where('status', '==', 'pending'));
        const pendingLoansSnapshot = await getCountFromServer(pendingLoansQuery);
        const pendingLoansCount = pendingLoansSnapshot.data().count;
        
        const completedLoansQuery = query(loansRef, where('status', '==', 'completed'));
        const completedLoansSnapshot = await getCountFromServer(completedLoansQuery);
        const completedLoansCount = completedLoansSnapshot.data().count;
        
        // Get credit requests counts
        const creditRequestsRef = collection(db, 'creditRequests');
        
        const pendingRequestsQuery = query(creditRequestsRef, where('status', '==', 'pending'));
        const pendingRequestsSnapshot = await getCountFromServer(pendingRequestsQuery);
        const pendingRequestsCount = pendingRequestsSnapshot.data().count;
        
        const approvedRequestsQuery = query(creditRequestsRef, where('status', '==', 'approved'));
        const approvedRequestsSnapshot = await getCountFromServer(approvedRequestsQuery);
        const approvedRequestsCount = approvedRequestsSnapshot.data().count;
        
        // Get input orders counts by status
        const inputOrdersRef = collection(db, 'inputOrders');
        const inputOrdersSnapshot = await getCountFromServer(inputOrdersRef);
        const inputOrdersCount = inputOrdersSnapshot.data().count;
        
        const pendingOrdersQuery = query(inputOrdersRef, where('status', '==', 'pending'));
        const pendingOrdersSnapshot = await getCountFromServer(pendingOrdersQuery);
        const pendingOrdersCount = pendingOrdersSnapshot.data().count;
        
        const processingOrdersQuery = query(inputOrdersRef, where('status', '==', 'processing'));
        const processingOrdersSnapshot = await getCountFromServer(processingOrdersQuery);
        const processingOrdersCount = processingOrdersSnapshot.data().count;
        
        const deliveredOrdersQuery = query(inputOrdersRef, where('status', '==', 'delivered'));
        const deliveredOrdersSnapshot = await getCountFromServer(deliveredOrdersQuery);
        const deliveredOrdersCount = deliveredOrdersSnapshot.data().count;
        
        // Get total harvests count
        const harvestsRef = collection(db, 'harvests');
        const harvestsSnapshot = await getCountFromServer(harvestsRef);
        const harvestsCount = harvestsSnapshot.data().count;
        
        // Try to get total harvested weight
        let totalHarvestedWeight = 0;
        try {
          const harvestsDataQuery = query(harvestsRef, orderBy('harvestDate', 'desc'), limit(100));
          const harvestsDataSnapshot = await getDocs(harvestsDataQuery);
          harvestsDataSnapshot.forEach(doc => {
            const harvestData = doc.data();
            totalHarvestedWeight += parseFloat(harvestData.quantity || 0);
          });
        } catch (error) {
          console.error("Error calculating harvest weight:", error);
        }
        
        // Update stats state with real data
        setStats({
          farmers: farmersCount,
          cooperatives: cooperativesCount,
          saccos: saccosCount,
          suppliers: suppliersCount,
          activeLoans: activeLoansCount,
          pendingLoans: pendingLoansCount,
          completedLoans: completedLoansCount,
          pendingCreditRequests: pendingRequestsCount,
          approvedCreditRequests: approvedRequestsCount,
          inputOrders: inputOrdersCount,
          pendingOrders: pendingOrdersCount,
          processingOrders: processingOrdersCount,
          deliveredOrders: deliveredOrdersCount,
          totalHarvests: harvestsCount,
          totalHarvestedWeight: totalHarvestedWeight.toFixed(2)
        });
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching statistics:', error);
        setIsLoading(false);
      }
    };
    
    fetchStatistics();
    
    // Set up real-time listeners for critical data
    
    // Active loans listener
    const loansRef = collection(db, 'loans');
    const activeLoansQuery = query(loansRef, where('status', '==', 'active'));
    const loansUnsubscribe = onSnapshot(activeLoansQuery, (snapshot) => {
      setStats(prevStats => ({
        ...prevStats,
        activeLoans: snapshot.size
      }));
    });
    
    // Pending credit requests listener
    const creditRequestsRef = collection(db, 'creditRequests');
    const pendingRequestsQuery = query(creditRequestsRef, where('status', '==', 'pending'));
    const requestsUnsubscribe = onSnapshot(pendingRequestsQuery, (snapshot) => {
      setStats(prevStats => ({
        ...prevStats,
        pendingCreditRequests: snapshot.size
      }));
    });
    
    // Input orders listener
    const inputOrdersRef = collection(db, 'inputOrders');
    const pendingOrdersQuery = query(inputOrdersRef, where('status', '==', 'pending'));
    const ordersUnsubscribe = onSnapshot(pendingOrdersQuery, (snapshot) => {
      setStats(prevStats => ({
        ...prevStats,
        pendingOrders: snapshot.size
      }));
    });
    
    // Also fetch recent transactions
    fetchRecentTransactions();
    
    // Clean up listeners
    return () => {
      loansUnsubscribe();
      requestsUnsubscribe();
      ordersUnsubscribe();
    };
  }, []);

  // Group menu items into logical sections
  const menuSections = [
    {
      title: "Main",
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: Home }
      ]
    },
    {
      title: "User Management",
      items: [
        { id: 'farmers', label: 'Farmers', icon: User },
        { id: 'organizations', label: 'Organizations', icon: Building },
        { id: 'suppliers', label: 'Suppliers', icon: Truck }
      ]
    },
    {
      title: "Transactions",
      items: [
        { id: 'creditRequests', label: 'Credit Requests', icon: CreditCard },
        { id: 'loans', label: 'Loans', icon: Wallet },
        { id: 'inputOrders', label: 'Input Orders', icon: Flower },
        { id: 'harvests', label: 'Harvests', icon: Coffee },
        { id: 'grading', label: 'Coffee Grading', icon: Star }
      ]
    },
    {
      title: "System",
      items: [
        { id: 'analytics', label: 'Analytics', icon: BarChart },
        { id: 'settings', label: 'Settings', icon: Settings }
      ]
    }
  ];

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const toggleTheme = () => {
    updateDarkMode(!darkMode);
  };

  const renderContent = () => {
    switch(activeSection) {
      case 'farmers':
        return <FarmersManagement darkMode={darkMode} userRole={userRole} />;
      case 'organizations':
        return <OrganizationsManagement darkMode={darkMode} userRole={userRole} />;
      case 'suppliers':
        return <SuppliersManagement darkMode={darkMode} userRole={userRole} />;
      case 'creditRequests':
        return <CreditRequestsManagement darkMode={darkMode} userRole={userRole} />;
      case 'loans':
        return <LoansManagement darkMode={darkMode} userRole={userRole} />;
      case 'inputOrders':
        return <InputOrdersManagement darkMode={darkMode} userRole={userRole} />;
      case 'harvests':
        return <HarvestsManagement darkMode={darkMode} userRole={userRole} />;
      case 'grading':
        return <GradingView darkMode={darkMode} userRole={userRole} />;
      // case 'analytics':
      //   return <AnalyticsScreen darkMode={darkMode} stats={stats} />;
      // case 'settings':
      //   return <SettingsScreen darkMode={darkMode} userRole={userRole} />;
      default:
        return renderDashboard();
    }
  };

  // Coffee Fund Dashboard View
  const renderDashboard = () => (
    <div className="p-6">
      {devModeEnabled && (
        <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-500">
          <div className="flex items-start">
            <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-bold text-base">Development Mode Active</h3>
              <p className="mt-1">
                You are using a local-only user account because Firebase Authentication is not properly configured.
              </p>
              <p className="mt-1">
                To enable full functionality, please enable Email/Password authentication in your Firebase Console.
              </p>
              <p className="mt-1">
                <strong>Note:</strong> No data will be synchronized with Firebase Authentication in this mode.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6">
        <h1 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          Inspire Africa Coffee Fund
        </h1>
        <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          Administrative Dashboard - System Overview
        </p>
      </div>

      {/* System-wide Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard 
          title="Farmers" 
          value={isLoading ? '...' : stats.farmers}
          icon={<User className={`h-6 w-6 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />}
          darkMode={darkMode}
          color="green"
          isLoading={isLoading}
        />
        <StatsCard 
          title="Organizations" 
          value={isLoading ? '...' : stats.cooperatives}
          icon={<Building className={`h-6 w-6 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />}
          darkMode={darkMode}
          color="blue"
          isLoading={isLoading}
        />
        <StatsCard 
          title="SACCOs" 
          value={isLoading ? '...' : stats.saccos}
          icon={<Wallet className={`h-6 w-6 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />}
          darkMode={darkMode}
          color="purple"
          isLoading={isLoading}
        />
        <StatsCard 
          title="Suppliers" 
          value={isLoading ? '...' : stats.suppliers}
          icon={<Truck className={`h-6 w-6 ${darkMode ? 'text-amber-400' : 'text-amber-600'}`} />}
          darkMode={darkMode}
          color="amber"
          isLoading={isLoading}
        />
      </div>

      {/* Transaction Metrics */}
      <div className={`p-6 rounded-lg shadow-sm mb-8 ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
        <h2 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          Transaction Overview
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
            <div className="flex items-center justify-between mb-3">
              <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Loans
              </span>
              <Wallet className={`h-5 w-5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
            </div>
            <div className="flex items-end justify-between">
              <span className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                {isLoading ? '...' : stats.activeLoans}
              </span>
              <div className="flex flex-col text-right">
                <span className="text-xs px-2 py-1 rounded-full bg-blue-500/10 text-blue-500 mb-1">
                  {isLoading ? '...' : stats.pendingLoans || 0} Pending
                </span>
                <span className="text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-500">
                  {isLoading ? '...' : stats.completedLoans || 0} Completed
                </span>
              </div>
            </div>
          </div>
          
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
            <div className="flex items-center justify-between mb-3">
              <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Credit Requests
              </span>
              <CreditCard className={`h-5 w-5 ${darkMode ? 'text-orange-400' : 'text-orange-600'}`} />
            </div>
            <div className="flex items-end justify-between">
              <span className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                {isLoading ? '...' : stats.pendingCreditRequests}
              </span>
              <div className="flex flex-col text-right">
                <span className="text-xs px-2 py-1 rounded-full bg-orange-500/10 text-orange-500">
                  Pending
                </span>
                <span className="text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-500 mt-1">
                  {isLoading ? '...' : stats.approvedCreditRequests || 0} Approved
                </span>
              </div>
            </div>
          </div>
          
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
            <div className="flex items-center justify-between mb-3">
              <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Input Orders
              </span>
              <Flower className={`h-5 w-5 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
            </div>
            <div className="flex items-end justify-between">
              <span className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                {isLoading ? '...' : stats.inputOrders}
              </span>
              <div className="flex flex-col text-right">
                <span className="text-xs px-2 py-1 rounded-full bg-yellow-500/10 text-yellow-500 mb-1">
                  {isLoading ? '...' : stats.pendingOrders || 0} Pending
                </span>
                <span className="text-xs px-2 py-1 rounded-full bg-blue-500/10 text-blue-500 mb-1">
                  {isLoading ? '...' : stats.processingOrders || 0} Processing
                </span>
                <span className="text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-500">
                  {isLoading ? '...' : stats.deliveredOrders || 0} Delivered
                </span>
              </div>
            </div>
          </div>
          
          <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
            <div className="flex items-center justify-between mb-3">
              <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Harvests
              </span>
              <Coffee className={`h-5 w-5 ${darkMode ? 'text-amber-400' : 'text-amber-600'}`} />
            </div>
            <div className="flex items-end justify-between">
              <span className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                {isLoading ? '...' : stats.totalHarvests}
              </span>
              <div className="flex flex-col text-right">
                <span className="text-xs px-2 py-1 rounded-full bg-amber-500/10 text-amber-500">
                  {isLoading ? '...' : stats.totalHarvestedWeight || 0} kg
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Admin Actions */}
      <div className={`p-6 rounded-lg shadow-sm mb-8 ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
        <h2 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          Administrative Actions
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <QuickActionButton
            label="Review Credit Requests"
            icon={<CreditCard size={20} />}
            onClick={() => setActiveSection('creditRequests')}
            darkMode={darkMode}
          />
          <QuickActionButton
            label="Manage Farmers"
            icon={<User size={20} />}
            onClick={() => setActiveSection('farmers')}
            darkMode={darkMode}
          />
          <QuickActionButton
            label="Input Delivery"
            icon={<Truck size={20} />}
            onClick={() => setActiveSection('inputOrders')}
            darkMode={darkMode}
          />
          <QuickActionButton
            label="View Analytics"
            icon={<BarChart size={20} />}
            onClick={() => setActiveSection('analytics')}
            darkMode={darkMode}
          />
        </div>
      </div>

      {/* Recent Transactions */}
      <div className={`p-6 rounded-lg shadow-sm mb-8 ${darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'}`}>
        <h2 className={`text-lg font-semibold mb-4 flex items-center justify-between ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          <span>Recent Transactions</span>
          {isLoadingTransactions && <RefreshCw className="h-4 w-4 animate-spin" />}
        </h2>
        <div className={`w-full overflow-x-auto ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          <table className="min-w-full">
            <thead>
              <tr className={`border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <th className="text-left py-3 px-4">Transaction Type</th>
                <th className="text-left py-3 px-4">User</th>
                <th className="text-left py-3 px-4">Amount</th>
                <th className="text-left py-3 px-4">Status</th>
                <th className="text-left py-3 px-4">Date</th>
              </tr>
            </thead>
            <tbody>
              {isLoadingTransactions ? (
                Array(4).fill(0).map((_, index) => (
                  <tr key={index} className={`border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                    <td className="py-3 px-4">
                      <div className={`h-4 w-24 rounded animate-pulse ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
                    </td>
                    <td className="py-3 px-4">
                      <div className={`h-4 w-28 rounded animate-pulse ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
                    </td>
                    <td className="py-3 px-4">
                      <div className={`h-4 w-16 rounded animate-pulse ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
                    </td>
                    <td className="py-3 px-4">
                      <div className={`h-4 w-20 rounded animate-pulse ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
                    </td>
                    <td className="py-3 px-4">
                      <div className={`h-4 w-20 rounded animate-pulse ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
                    </td>
                  </tr>
                ))
              ) : recentTransactions.length > 0 ? (
                recentTransactions.map((transaction, index) => (
                  <tr key={transaction.id || index} className={`border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                    <td className="py-3 px-4">{transaction.type}</td>
                    <td className="py-3 px-4">{transaction.user}</td>
                    <td className="py-3 px-4">
                      {typeof transaction.amount === 'number' ? formatCurrency(transaction.amount) : transaction.amount}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${getTransactionStatusColor(transaction.status)}`}>
                        {transaction.status?.charAt(0).toUpperCase() + transaction.status?.slice(1) || 'Unknown'}
                      </span>
                    </td>
                    <td className="py-3 px-4">{formatDate(transaction.date)}</td>
                  </tr>
                ))
              ) : (
                <tr className={`border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <td colSpan="5" className="py-4 text-center">
                    No recent transactions found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  // Get status color for transaction display
  const getTransactionStatusColor = (status) => {
    const statusMap = {
      pending: darkMode ? 'bg-yellow-500/10 text-yellow-500' : 'bg-yellow-500/10 text-yellow-500',
      active: darkMode ? 'bg-blue-500/10 text-blue-500' : 'bg-blue-500/10 text-blue-500',
      processing: darkMode ? 'bg-blue-500/10 text-blue-500' : 'bg-blue-500/10 text-blue-500',
      approved: darkMode ? 'bg-green-500/10 text-green-500' : 'bg-green-500/10 text-green-500',
      completed: darkMode ? 'bg-green-500/10 text-green-500' : 'bg-green-500/10 text-green-500',
      delivered: darkMode ? 'bg-green-500/10 text-green-500' : 'bg-green-500/10 text-green-500',
      recorded: darkMode ? 'bg-green-500/10 text-green-500' : 'bg-green-500/10 text-green-500',
      rejected: darkMode ? 'bg-red-500/10 text-red-500' : 'bg-red-500/10 text-red-500',
      cancelled: darkMode ? 'bg-red-500/10 text-red-500' : 'bg-red-500/10 text-red-500'
    };
    
    return statusMap[status?.toLowerCase()] || 'bg-gray-500/10 text-gray-500';
  };

  return (
    <div className={`min-h-screen h-full flex flex-col ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900'}`}>
      {/* Header */}
      <header className={`flex justify-between items-center py-4 px-6 ${darkMode ? 'bg-gray-800 border-b border-gray-700' : 'bg-white shadow-sm'}`}>
        <div className="flex items-center">
          <button 
            onClick={toggleMenu} 
            className={`p-2 rounded-md ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
          >
            <Menu className="h-6 w-6" />
          </button>
          <h1 className="text-xl font-bold ml-4">Coffee Fund Admin</h1>
        </div>
        
        <div className="flex items-center space-x-4">
          <button 
            onClick={toggleTheme} 
            className={`p-2 rounded-full ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
          >
            {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          
          <div className="relative">
            <button 
              className={`flex items-center space-x-2 p-2 rounded-full ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
            >
              <div className={`h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center`}>
                <span className="text-white font-medium">{user?.email?.charAt(0).toUpperCase() || 'A'}</span>
              </div>
              <span className="hidden md:inline-block">{user?.email || 'Admin User'}</span>
            </button>
          </div>
          
          <button 
            onClick={handleLogout} 
            className={`p-2 rounded-md ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>
      
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside 
          className={`w-64 shrink-0 transition-all duration-300 ease-in-out overflow-y-auto ${menuOpen ? 'translate-x-0' : '-translate-x-full'} ${darkMode ? 'bg-gray-800 border-r border-gray-700' : 'bg-white border-r border-gray-200'} md:block hidden`}
        >
          <nav className="p-4">
            {menuSections.map((section) => (
              <div key={section.title} className="mb-6">
                <h2 className={`px-4 mb-2 text-xs font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>
                  {section.title}
                </h2>
                <ul>
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    // Only show admin-only items to admins or all items to everyone
                    if (item.adminOnly && userRole !== 'admin') return null;
                    
                    return (
                      <li key={item.id}>
                        <button
                          onClick={() => setActiveSection(item.id)}
                          className={`flex items-center w-full px-4 py-2 mb-1 rounded-md ${
                            activeSection === item.id 
                              ? darkMode 
                                ? 'text-white bg-blue-600' 
                                : 'text-blue-600 bg-blue-50' 
                              : darkMode 
                                ? 'text-gray-300 hover:bg-gray-700' 
                                : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <Icon className="h-5 w-5 mr-3" />
                          <span>{item.label}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </aside>
        
        {/* Mobile Menu Overlay */}
        {menuOpen && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
            onClick={() => setMenuOpen(false)}
          >
            <aside 
              className={`w-64 h-full transition-all duration-300 ease-in-out overflow-y-auto ${
                darkMode ? 'bg-gray-800' : 'bg-white'
              }`}
              onClick={e => e.stopPropagation()}
            >
              <nav className="p-4">
                {menuSections.map((section) => (
                  <div key={section.title} className="mb-6">
                    <h2 className={`px-4 mb-2 text-xs font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>
                      {section.title}
                    </h2>
                    <ul>
                      {section.items.map((item) => {
                        const Icon = item.icon;
                        if (item.adminOnly && userRole !== 'admin') return null;
                        
                        return (
                          <li key={item.id}>
                            <button
                              onClick={() => {
                                setActiveSection(item.id);
                                setMenuOpen(false);
                              }}
                              className={`flex items-center w-full px-4 py-2 mb-1 rounded-md ${
                                activeSection === item.id 
                                  ? darkMode 
                                    ? 'text-white bg-blue-600' 
                                    : 'text-blue-600 bg-blue-50' 
                                  : darkMode 
                                    ? 'text-gray-300 hover:bg-gray-700' 
                                    : 'text-gray-700 hover:bg-gray-100'
                              }`}
                            >
                              <Icon className="h-5 w-5 mr-3" />
                              <span>{item.label}</span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </nav>
            </aside>
          </div>
        )}
        
        {/* Main content */}
        <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
          {renderContent()}
        </main>
      </div>
      
      {/* Mobile Bottom Navigation */}
      <nav className={`md:hidden fixed bottom-0 left-0 right-0 h-16 ${
        darkMode ? 'bg-gray-800 border-t border-gray-700' : 'bg-white border-t border-gray-200'
      } flex items-center justify-around shadow-lg z-10`}>
        <button
          onClick={() => setActiveSection('dashboard')}
          className={`flex flex-col items-center justify-center w-full h-full ${
            activeSection === 'dashboard' 
              ? 'text-blue-600' 
              : darkMode ? 'text-gray-400' : 'text-gray-500'
          }`}
        >
          <Home className="h-5 w-5" />
          <span className="text-xs mt-1">Home</span>
        </button>
        
        <button
          onClick={() => setActiveSection('farmers')}
          className={`flex flex-col items-center justify-center w-full h-full ${
            activeSection === 'farmers' 
              ? 'text-blue-600' 
              : darkMode ? 'text-gray-400' : 'text-gray-500'
          }`}
        >
          <User className="h-5 w-5" />
          <span className="text-xs mt-1">Farmers</span>
        </button>
        
        <button
          onClick={() => setActiveSection('loans')}
          className={`flex flex-col items-center justify-center w-full h-full ${
            activeSection === 'loans' 
              ? 'text-blue-600' 
              : darkMode ? 'text-gray-400' : 'text-gray-500'
          }`}
        >
          <Wallet className="h-5 w-5" />
          <span className="text-xs mt-1">Loans</span>
        </button>
        
        <button
          onClick={() => setActiveSection('harvests')}
          className={`flex flex-col items-center justify-center w-full h-full ${
            activeSection === 'harvests' 
              ? 'text-blue-600' 
              : darkMode ? 'text-gray-400' : 'text-gray-500'
          }`}
        >
          <Coffee className="h-5 w-5" />
          <span className="text-xs mt-1">Harvests</span>
        </button>
      </nav>
    </div>
  );
};

// Stats Card Component
const StatsCard = ({ title, value, icon, darkMode, color, isLoading }) => {
  const getColorClasses = (colorName) => {
    const colorMap = {
      blue: darkMode 
        ? 'bg-blue-900/20 border-blue-800 text-blue-400' 
        : 'bg-blue-50 border-blue-100 text-blue-600',
      green: darkMode 
        ? 'bg-green-900/20 border-green-800 text-green-400' 
        : 'bg-green-50 border-green-100 text-green-600',
      amber: darkMode 
        ? 'bg-amber-900/20 border-amber-800 text-amber-400' 
        : 'bg-amber-50 border-amber-100 text-amber-600',
      purple: darkMode 
        ? 'bg-purple-900/20 border-purple-800 text-purple-400' 
        : 'bg-purple-50 border-purple-100 text-purple-600',
      emerald: darkMode 
        ? 'bg-emerald-900/20 border-emerald-800 text-emerald-400' 
        : 'bg-emerald-50 border-emerald-100 text-emerald-600',
      indigo: darkMode 
        ? 'bg-indigo-900/20 border-indigo-800 text-indigo-400' 
        : 'bg-indigo-50 border-indigo-100 text-indigo-600',
    };
    return colorMap[colorName] || colorMap.blue;
  };

  return (
    <div className={`p-6 rounded-lg border ${getColorClasses(color)}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={`text-lg font-medium ${darkMode ? 'text-gray-200' : 'text-gray-800'}`}>
          {title}
        </h3>
        {icon}
      </div>
      <div className="flex items-center">
        <div className="text-3xl font-bold">
          {isLoading ? (
            <div className={`h-8 w-16 animate-pulse rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
          ) : (
            value
          )}
        </div>
      </div>
    </div>
  );
};

// Quick Action Button Component
const QuickActionButton = ({ label, icon, onClick, darkMode }) => {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center p-4 rounded-lg transition-colors ${
        darkMode 
          ? 'bg-gray-700/50 hover:bg-gray-700 text-gray-200' 
          : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
      }`}
    >
      <div className={`p-3 rounded-full mb-2 ${
        darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-600'
      }`}>
        {icon}
      </div>
      <span className="text-sm font-medium text-center">{label}</span>
    </button>
  );
};

CoffeeFundDashboard.propTypes = {
  darkMode: PropTypes.bool.isRequired,
  updateDarkMode: PropTypes.func.isRequired,
};

StatsCard.propTypes = {
  title: PropTypes.string.isRequired,
  value: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  icon: PropTypes.node.isRequired,
  darkMode: PropTypes.bool.isRequired,
  color: PropTypes.string.isRequired,
  isLoading: PropTypes.bool.isRequired,
};

QuickActionButton.propTypes = {
  label: PropTypes.string.isRequired,
  icon: PropTypes.node.isRequired,
  onClick: PropTypes.func.isRequired,
  darkMode: PropTypes.bool.isRequired,
};

export default CoffeeFundDashboard; 