import { collection, deleteDoc, doc, onSnapshot, query, updateDoc, where } from 'firebase/firestore';
import { Building, Eye, Filter, Plus, Search, Trash, UserCheck, UserX } from 'lucide-react';
import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { db } from '../../firebase/firebase';

const CooperativesManagement = ({ darkMode, userRole }) => {
  const [cooperatives, setCooperatives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  
  // Fetch cooperatives from Firestore
  useEffect(() => {
    setLoading(true);
    
    let coopsQuery;
    if (filterStatus === 'all') {
      coopsQuery = query(collection(db, 'cooperatives'));
    } else {
      coopsQuery = query(
        collection(db, 'cooperatives'), 
        where('kycStatus', '==', filterStatus)
      );
    }
    
    const unsubscribe = onSnapshot(coopsQuery, (snapshot) => {
      const coopsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setCooperatives(coopsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching cooperatives:", error);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [filterStatus]);
  
  // Filter cooperatives based on search term
  const filteredCooperatives = cooperatives.filter(coop => {
    const searchFields = [
      coop.name || '',
      coop.registrationNumber || '',
      coop.operations?.location || '',
      coop.taxId || ''
    ].join(' ').toLowerCase();
    
    return searchFields.includes(searchTerm.toLowerCase());
  });
  
  // KYC status update handler
  const handleUpdateKycStatus = async (cooperativeId, newStatus) => {
    try {
      const coopRef = doc(db, 'cooperatives', cooperativeId);
      await updateDoc(coopRef, { 
        kycStatus: newStatus,
        updatedAt: new Date()
      });
    } catch (error) {
      console.error("Error updating cooperative KYC status:", error);
    }
  };
  
  // Delete cooperative handler
  const handleDeleteCooperative = async (cooperativeId) => {
    if (window.confirm("Are you sure you want to delete this cooperative? This action cannot be undone.")) {
      try {
        await deleteDoc(doc(db, 'cooperatives', cooperativeId));
      } catch (error) {
        console.error("Error deleting cooperative:", error);
      }
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          Cooperatives Management
        </h1>
        <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          View, verify and manage coffee farmer cooperatives registered in the system
        </p>
      </div>
      
      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
        <div className={`relative max-w-md ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          <input
            type="text"
            placeholder="Search cooperatives by name, registration number..."
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
              <span className="hidden md:inline-block">Add Cooperative</span>
            </button>
          )}
        </div>
      </div>
      
      {/* Cooperatives List */}
      <div className={`overflow-x-auto rounded-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className={`${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
            <tr>
              <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>Name</th>
              <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>Registration</th>
              <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>Location</th>
              <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>Farmers</th>
              <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>KYC Status</th>
              <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>Actions</th>
            </tr>
          </thead>
          <tbody className={`${darkMode ? 'bg-gray-800 divide-y divide-gray-700' : 'bg-white divide-y divide-gray-200'}`}>
            {loading ? (
              <tr>
                <td colSpan="6" className={`px-6 py-4 text-center ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                  Loading cooperatives...
                </td>
              </tr>
            ) : filteredCooperatives.length === 0 ? (
              <tr>
                <td colSpan="6" className={`px-6 py-4 text-center ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                  No cooperatives found.
                </td>
              </tr>
            ) : (
              filteredCooperatives.map((coop) => (
                <tr key={coop.id} className={darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                  <td className={`px-6 py-4 whitespace-nowrap ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    <div className="flex items-center">
                      <div className={`h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center ${darkMode ? 'text-blue-500' : 'text-blue-700'}`}>
                        <Building className="h-5 w-5" />
                      </div>
                      <div className="ml-4">
                        <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{coop.name}</div>
                      </div>
                    </div>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                    <div>{coop.registrationNumber}</div>
                    <div className="text-sm">Tax ID: {coop.taxId}</div>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                    <div>{coop.operations?.location}</div>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                    <div>{coop.operations?.farmerCount || 0} farmers</div>
                    <div className="text-sm">Est. {coop.yearEstablished}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      coop.kycStatus === 'verified'
                        ? 'bg-green-500/10 text-green-500'
                        : coop.kycStatus === 'rejected'
                          ? 'bg-red-500/10 text-red-500'
                          : 'bg-yellow-500/10 text-yellow-500'
                    }`}>
                      {coop.kycStatus === 'verified' 
                        ? 'Verified' 
                        : coop.kycStatus === 'rejected'
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
                      
                      {userRole === 'admin' && coop.kycStatus === 'pending' && (
                        <>
                          <button 
                            className={`p-1 rounded-full ${darkMode ? 'hover:bg-green-900/20' : 'hover:bg-green-100'}`}
                            title="Verify KYC"
                            onClick={() => handleUpdateKycStatus(coop.id, 'verified')}
                          >
                            <UserCheck className="h-5 w-5 text-green-500" />
                          </button>
                          
                          <button 
                            className={`p-1 rounded-full ${darkMode ? 'hover:bg-red-900/20' : 'hover:bg-red-100'}`}
                            title="Reject KYC"
                            onClick={() => handleUpdateKycStatus(coop.id, 'rejected')}
                          >
                            <UserX className="h-5 w-5 text-red-500" />
                          </button>
                        </>
                      )}
                      
                      {userRole === 'admin' && (
                        <button 
                          className={`p-1 rounded-full ${darkMode ? 'hover:bg-red-900/20' : 'hover:bg-red-100'}`}
                          title="Delete cooperative"
                          onClick={() => handleDeleteCooperative(coop.id)}
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

CooperativesManagement.propTypes = {
  darkMode: PropTypes.bool.isRequired,
  userRole: PropTypes.string.isRequired,
};

export default CooperativesManagement; 