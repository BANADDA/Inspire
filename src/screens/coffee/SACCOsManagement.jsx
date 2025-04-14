import { collection, deleteDoc, doc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import { Banknote, Eye, Filter, Plus, Search, Trash, UserCheck, UserX } from 'lucide-react';
import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { db } from '../../firebase/firebase';

const SACCOsManagement = ({ darkMode, userRole }) => {
  const [saccos, setSaccos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  
  // Fetch SACCOs from Firestore
  useEffect(() => {
    setLoading(true);
    
    let saccosQuery;
    if (filterStatus === 'all') {
      saccosQuery = query(collection(db, 'saccos'));
    } else {
      saccosQuery = query(
        collection(db, 'saccos'), 
        where('kycStatus', '==', filterStatus)
      );
    }
    
    const unsubscribe = onSnapshot(saccosQuery, (snapshot) => {
      const saccosData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSaccos(saccosData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching SACCOs:", error);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [filterStatus]);
  
  // Filter SACCOs based on search term
  const filteredSaccos = saccos.filter(sacco => {
    const searchFields = [
      sacco.name || '',
      sacco.registrationNumber || '',
      sacco.licenseNumber || '',
      sacco.taxId || ''
    ].join(' ').toLowerCase();
    
    return searchFields.includes(searchTerm.toLowerCase());
  });
  
  // KYC status update handler
  const handleUpdateKycStatus = async (saccoId, newStatus) => {
    try {
      const saccoRef = doc(db, 'saccos', saccoId);
      await updateDoc(saccoRef, { 
        kycStatus: newStatus,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error("Error updating SACCO KYC status:", error);
    }
  };
  
  // Delete SACCO handler
  const handleDeleteSacco = async (saccoId) => {
    if (window.confirm("Are you sure you want to delete this SACCO? This action cannot be undone.")) {
      try {
        await deleteDoc(doc(db, 'saccos', saccoId));
      } catch (error) {
        console.error("Error deleting SACCO:", error);
      }
    }
  };

  // Format loan portfolio performance 
  const formatPortfolioPerformance = (sacco) => {
    if (!sacco.financial?.loanPortfolioPerformance) return 'No data';
    
    const portfolio = sacco.financial.loanPortfolioPerformance;
    return `${portfolio.totalLoans || 0} loans, ${(portfolio.defaultRate || 0) * 100}% default rate`;
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          SACCOs Management
        </h1>
        <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          View, verify and manage SACCOs (Savings and Credit Cooperative Organizations) registered in the system
        </p>
      </div>
      
      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
        <div className={`relative max-w-md ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          <input
            type="text"
            placeholder="Search SACCOs by name, registration number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`w-full px-4 py-2 pr-10 rounded-lg border ${
              darkMode 
                ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400' 
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
            }`}
          />
          <Search className={`absolute right-3 top-2.5 h-5 w-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className={`h-5 w-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className={`px-4 py-2 rounded-lg border ${
              darkMode 
                ? 'bg-gray-800 border-gray-700 text-white' 
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          >
            <option value="all">All Status</option>
            <option value="pending">KYC Pending</option>
            <option value="verified">KYC Verified</option>
            <option value="rejected">KYC Rejected</option>
          </select>
          
          {userRole === 'admin' && (
            <button 
              className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                darkMode 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              <Plus className="h-5 w-5" />
              <span className="hidden md:inline-block">Add SACCO</span>
            </button>
          )}
        </div>
      </div>
      
      {/* SACCOs List */}
      <div className={`overflow-x-auto rounded-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className={`${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
            <tr>
              <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>Name</th>
              <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>Registration</th>
              <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>Branches</th>
              <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>Portfolio</th>
              <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>KYC Status</th>
              <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>Actions</th>
            </tr>
          </thead>
          <tbody className={`${darkMode ? 'bg-gray-800 divide-y divide-gray-700' : 'bg-white divide-y divide-gray-200'}`}>
            {loading ? (
              <tr>
                <td colSpan="6" className={`px-6 py-4 text-center ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                  Loading SACCOs...
                </td>
              </tr>
            ) : filteredSaccos.length === 0 ? (
              <tr>
                <td colSpan="6" className={`px-6 py-4 text-center ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                  No SACCOs found.
                </td>
              </tr>
            ) : (
              filteredSaccos.map((sacco) => (
                <tr key={sacco.id} className={darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                  <td className={`px-6 py-4 whitespace-nowrap ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    <div className="flex items-center">
                      <div className={`h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center ${darkMode ? 'text-purple-500' : 'text-purple-700'}`}>
                        <Banknote className="h-5 w-5" />
                      </div>
                      <div className="ml-4">
                        <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{sacco.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                    <div>Reg: {sacco.registrationNumber}</div>
                    <div className="text-sm">License: {sacco.licenseNumber}</div>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                    <div>{(sacco.operations?.branches || []).length} branches</div>
                    <div className="text-sm">{sacco.operations?.clientCount || 0} clients</div>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                    <div>{formatPortfolioPerformance(sacco)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      sacco.kycStatus === 'verified'
                        ? 'bg-green-500/10 text-green-500'
                        : sacco.kycStatus === 'rejected'
                          ? 'bg-red-500/10 text-red-500'
                          : 'bg-yellow-500/10 text-yellow-500'
                    }`}>
                      {sacco.kycStatus === 'verified' 
                        ? 'Verified' 
                        : sacco.kycStatus === 'rejected'
                          ? 'Rejected'
                          : 'Pending'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex space-x-2">
                      <button 
                        className={`p-1 rounded-full ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                        title="View details"
                      >
                        <Eye className={`h-5 w-5 ${darkMode ? 'text-gray-300' : 'text-gray-500'}`} />
                      </button>
                      
                      {userRole === 'admin' && sacco.kycStatus === 'pending' && (
                        <>
                          <button 
                            className={`p-1 rounded-full ${darkMode ? 'hover:bg-green-900/20' : 'hover:bg-green-100'}`}
                            title="Verify KYC"
                            onClick={() => handleUpdateKycStatus(sacco.id, 'verified')}
                          >
                            <UserCheck className="h-5 w-5 text-green-500" />
                          </button>
                          
                          <button 
                            className={`p-1 rounded-full ${darkMode ? 'hover:bg-red-900/20' : 'hover:bg-red-100'}`}
                            title="Reject KYC"
                            onClick={() => handleUpdateKycStatus(sacco.id, 'rejected')}
                          >
                            <UserX className="h-5 w-5 text-red-500" />
                          </button>
                        </>
                      )}
                      
                      {userRole === 'admin' && (
                        <button 
                          className={`p-1 rounded-full ${darkMode ? 'hover:bg-red-900/20' : 'hover:bg-red-100'}`}
                          title="Delete SACCO"
                          onClick={() => handleDeleteSacco(sacco.id)}
                        >
                          <Trash className="h-5 w-5 text-red-500" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

SACCOsManagement.propTypes = {
  darkMode: PropTypes.bool.isRequired,
  userRole: PropTypes.string.isRequired,
};

export default SACCOsManagement; 