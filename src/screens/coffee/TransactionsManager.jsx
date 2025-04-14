import { collection, getDocs, limit, orderBy, query, where } from 'firebase/firestore';
import {
    ArrowUpDown,
    Coffee,
    CreditCard,
    Download,
    Filter,
    Flower,
    Layers,
    Search,
    Star,
    Wallet
} from 'lucide-react';
import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { db } from '../../firebase/firebase';

// Import sub-components for transaction types
import CreditRequestsView from './transactions/CreditRequestsView';
import GradingView from './transactions/GradingView';
import HarvestsView from './transactions/HarvestsView';
import InputOrdersView from './transactions/InputOrdersView';
import LoansView from './transactions/LoansView';

const TransactionsManager = ({ darkMode, userRole }) => {
  // State for active transaction type
  const [activeTab, setActiveTab] = useState('creditRequests');
  
  // Common state for all transaction types
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState('createdAt');
  const [sortDirection, setSortDirection] = useState('desc');
  
  // Transaction counts for dashboard
  const [transactionCounts, setTransactionCounts] = useState({
    creditRequests: { total: 0, pending: 0 },
    loans: { total: 0, active: 0 },
    inputOrders: { total: 0, pending: 0 },
    harvests: { total: 0, recent: 0 },
    grading: { total: 0 }
  });

  // Fetch transaction counts
  useEffect(() => {
    const fetchTransactionCounts = async () => {
      try {
        // Credit requests counts
        const creditRequestsRef = collection(db, 'creditRequests');
        const creditRequestsQuery = await getDocs(creditRequestsRef);
        const pendingCreditRequestsQuery = await getDocs(
          query(creditRequestsRef, where('status', '==', 'pending'))
        );
        
        // Loans counts
        const loansRef = collection(db, 'loans');
        const loansQuery = await getDocs(loansRef);
        const activeLoansQuery = await getDocs(
          query(loansRef, where('status', '==', 'active'))
        );
        
        // Input orders counts
        const inputOrdersRef = collection(db, 'inputOrders');
        const inputOrdersQuery = await getDocs(inputOrdersRef);
        const pendingInputOrdersQuery = await getDocs(
          query(inputOrdersRef, where('status', '==', 'pending'))
        );
        
        // Harvests counts
        const harvestsRef = collection(db, 'harvests');
        const harvestsQuery = await getDocs(harvestsRef);
        const recentHarvestsQuery = await getDocs(
          query(harvestsRef, orderBy('harvestDate', 'desc'), limit(10))
        );
        
        // Grading counts
        const gradesRef = collection(db, 'coffeeGrades');
        const gradesQuery = await getDocs(gradesRef);
        
        setTransactionCounts({
          creditRequests: { 
            total: creditRequestsQuery.size, 
            pending: pendingCreditRequestsQuery.size 
          },
          loans: { 
            total: loansQuery.size, 
            active: activeLoansQuery.size 
          },
          inputOrders: { 
            total: inputOrdersQuery.size, 
            pending: pendingInputOrdersQuery.size 
          },
          harvests: { 
            total: harvestsQuery.size, 
            recent: recentHarvestsQuery.size 
          },
          grading: {
            total: gradesQuery.size
          }
        });
      } catch (error) {
        console.error("Error fetching transaction counts:", error);
      }
    };
    
    fetchTransactionCounts();
  }, []);
  
  // Render transaction tab buttons
  const renderTabButtons = () => (
    <div className="flex flex-wrap mb-6 border-b border-gray-200 dark:border-gray-700">
      <button
        className={`flex items-center px-4 py-2 mr-2 ${
          activeTab === 'creditRequests'
            ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-500 dark:border-blue-500'
            : `${darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`
        }`}
        onClick={() => setActiveTab('creditRequests')}
      >
        <CreditCard className="h-4 w-4 mr-2" />
        Credit Requests
        <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
          darkMode ? 'bg-gray-800' : 'bg-gray-200'
        }`}>
          {transactionCounts.creditRequests.total}
        </span>
      </button>
      
      <button
        className={`flex items-center px-4 py-2 mr-2 ${
          activeTab === 'loans'
            ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-500 dark:border-blue-500'
            : `${darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`
        }`}
        onClick={() => setActiveTab('loans')}
      >
        <Wallet className="h-4 w-4 mr-2" />
        Loans
        <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
          darkMode ? 'bg-gray-800' : 'bg-gray-200'
        }`}>
          {transactionCounts.loans.total}
        </span>
      </button>
      
      <button
        className={`flex items-center px-4 py-2 mr-2 ${
          activeTab === 'inputOrders'
            ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-500 dark:border-blue-500'
            : `${darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`
        }`}
        onClick={() => setActiveTab('inputOrders')}
      >
        <Flower className="h-4 w-4 mr-2" />
        Input Orders
        <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
          darkMode ? 'bg-gray-800' : 'bg-gray-200'
        }`}>
          {transactionCounts.inputOrders.total}
        </span>
      </button>
      
      <button
        className={`flex items-center px-4 py-2 mr-2 ${
          activeTab === 'harvests'
            ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-500 dark:border-blue-500'
            : `${darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`
        }`}
        onClick={() => setActiveTab('harvests')}
      >
        <Coffee className="h-4 w-4 mr-2" />
        Harvests
        <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
          darkMode ? 'bg-gray-800' : 'bg-gray-200'
        }`}>
          {transactionCounts.harvests.total}
        </span>
      </button>
      
      <button
        className={`flex items-center px-4 py-2 mr-2 ${
          activeTab === 'grading'
            ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-500 dark:border-blue-500'
            : `${darkMode ? 'text-gray-400 hover:text-gray-300' : 'text-gray-500 hover:text-gray-700'}`
        }`}
        onClick={() => setActiveTab('grading')}
      >
        <Star className="h-4 w-4 mr-2" />
        Grading
        <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
          darkMode ? 'bg-gray-800' : 'bg-gray-200'
        }`}>
          {transactionCounts.grading?.total || 0}
        </span>
      </button>
    </div>
  );
  
  // Common search and filter controls
  const renderSearchAndFilter = () => (
    <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
      <div className={`relative max-w-md ${darkMode ? 'text-white' : 'text-gray-900'}`}>
        <input
          type="text"
          placeholder="Search transactions..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className={`w-full px-4 py-2 pr-10 rounded-lg border ${
            darkMode 
              ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400' 
              : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
          }`}
        />
        <Search className={`absolute right-3 top-2.5 h-5 w-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
      </div>
      
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
            darkMode 
              ? 'bg-gray-800 border-gray-700 hover:bg-gray-700 text-white' 
              : 'bg-white border-gray-300 hover:bg-gray-100 text-gray-900'
          }`}
        >
          <Filter className="h-4 w-4" />
          <span>Filters</span>
          {statusFilter !== 'all' && (
            <span className={`px-2 py-0.5 text-xs rounded-full ${
              darkMode ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-800'
            }`}>
              1
            </span>
          )}
        </button>
        
        <button
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
            darkMode 
              ? 'bg-gray-800 border-gray-700 hover:bg-gray-700 text-white' 
              : 'bg-white border-gray-300 hover:bg-gray-100 text-gray-900'
          }`}
        >
          <Download className="h-4 w-4" />
          <span>Export</span>
        </button>
      </div>
    </div>
  );
  
  // Render active tab content
  const renderActiveTabContent = () => {
    switch (activeTab) {
      case 'creditRequests':
        return (
          <CreditRequestsView 
            darkMode={darkMode}
            userRole={userRole}
            searchQuery={searchQuery}
            statusFilter={statusFilter}
            sortField={sortField}
            sortDirection={sortDirection}
          />
        );
      case 'loans':
        return (
          <LoansView 
            darkMode={darkMode}
            userRole={userRole}
            searchQuery={searchQuery}
            statusFilter={statusFilter}
            sortField={sortField}
            sortDirection={sortDirection}
          />
        );
      case 'inputOrders':
        return (
          <InputOrdersView 
            darkMode={darkMode}
            userRole={userRole}
            searchQuery={searchQuery}
            statusFilter={statusFilter}
            sortField={sortField}
            sortDirection={sortDirection}
          />
        );
      case 'harvests':
        return (
          <HarvestsView 
            darkMode={darkMode}
            userRole={userRole}
            searchQuery={searchQuery}
            statusFilter={statusFilter}
            sortField={sortField}
            sortDirection={sortDirection}
          />
        );
      case 'grading':
        return (
          <GradingView 
            darkMode={darkMode}
            userRole={userRole}
            searchQuery={searchQuery}
            statusFilter={statusFilter}
            sortField={sortField}
            sortDirection={sortDirection}
          />
        );
      default:
        return <div>Select a transaction type</div>;
    }
  };
  
  // Filter panel (collapsible)
  const renderFilterPanel = () => (
    showFilters && (
      <div className={`mb-6 p-4 rounded-lg border ${
        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
      }`}>
        <h3 className="font-medium mb-3">Filter Options</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${
              darkMode ? 'text-gray-400' : 'text-gray-700'
            }`}>
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`w-full px-3 py-2 rounded-md border ${
                darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="disbursed">Disbursed</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="delivered">Delivered</option>
            </select>
          </div>
          
          <div>
            <label className={`block text-sm font-medium mb-1 ${
              darkMode ? 'text-gray-400' : 'text-gray-700'
            }`}>
              Sort By
            </label>
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value)}
              className={`w-full px-3 py-2 rounded-md border ${
                darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="createdAt">Date Created</option>
              <option value="updatedAt">Last Updated</option>
              <option value="amount">Amount</option>
              <option value="farmerName">Farmer Name</option>
            </select>
          </div>
          
          <div>
            <label className={`block text-sm font-medium mb-1 ${
              darkMode ? 'text-gray-400' : 'text-gray-700'
            }`}>
              Sort Direction
            </label>
            <button
              onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
              className={`w-full flex items-center justify-between px-3 py-2 border rounded-md ${
                darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <span>{sortDirection === 'asc' ? 'Ascending' : 'Descending'}</span>
              <ArrowUpDown className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    )
  );
  
  return (
    <div className={`w-full h-full p-6 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className="flex items-center mb-6">
        <Layers className="mr-2 h-6 w-6 text-blue-500" />
        <h1 className="text-2xl font-bold">Transactions Management</h1>
      </div>
      
      {renderTabButtons()}
      {renderSearchAndFilter()}
      {renderFilterPanel()}
      {renderActiveTabContent()}
    </div>
  );
};

TransactionsManager.propTypes = {
  darkMode: PropTypes.bool.isRequired,
  userRole: PropTypes.string.isRequired
};

export default TransactionsManager; 