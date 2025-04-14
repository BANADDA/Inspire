import { collection, doc, getDocs, orderBy, query, updateDoc, where } from 'firebase/firestore';
import {
    Check,
    Clock,
    CreditCard,
    DollarSign,
    Eye,
    Loader2,
    MoreHorizontal,
    Users,
    X
} from 'lucide-react';
import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { db } from '../../../firebase/firebase';

const CreditRequestsView = ({ 
  darkMode, 
  userRole, 
  searchQuery, 
  statusFilter, 
  sortField, 
  sortDirection 
}) => {
  const [creditRequests, setCreditRequests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  
  // Fetch credit requests with applied filters
  useEffect(() => {
    const fetchCreditRequests = async () => {
      setIsLoading(true);
      try {
        let creditRequestsRef = collection(db, 'creditRequests');
        let creditRequestsQuery = query(creditRequestsRef);
        
        // Apply status filter if not 'all'
        if (statusFilter !== 'all') {
          creditRequestsQuery = query(creditRequestsQuery, where('status', '==', statusFilter));
        }
        
        // Apply sort
        creditRequestsQuery = query(creditRequestsQuery, orderBy(sortField, sortDirection));
        
        const querySnapshot = await getDocs(creditRequestsQuery);
        
        let requests = [];
        querySnapshot.forEach((doc) => {
          requests.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        // Apply search filter (client-side)
        if (searchQuery) {
          const searchLower = searchQuery.toLowerCase();
          requests = requests.filter(request => 
            request.farmerName?.toLowerCase().includes(searchLower) ||
            request.farmerID?.toLowerCase().includes(searchLower) ||
            request.organization?.toLowerCase().includes(searchLower) ||
            request.description?.toLowerCase().includes(searchLower)
          );
        }
        
        setCreditRequests(requests);
      } catch (error) {
        console.error("Error fetching credit requests:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCreditRequests();
  }, [searchQuery, statusFilter, sortField, sortDirection]);
  
  // Update request status
  const updateRequestStatus = async (requestId, newStatus) => {
    try {
      const requestRef = doc(db, 'creditRequests', requestId);
      await updateDoc(requestRef, { 
        status: newStatus,
        updatedAt: new Date()
      });
      
      // Update local state
      setCreditRequests(prev => 
        prev.map(req => 
          req.id === requestId 
            ? { ...req, status: newStatus, updatedAt: new Date() } 
            : req
        )
      );
      
      // Close details modal if open
      if (showDetailsModal) {
        setShowDetailsModal(false);
      }
    } catch (error) {
      console.error("Error updating credit request:", error);
    }
  };
  
  // View details of a specific request
  const handleViewDetails = (request) => {
    setSelectedRequest(request);
    setShowDetailsModal(true);
  };
  
  // Format date for display
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'KES'
    }).format(amount || 0);
  };
  
  // Render status badge
  const renderStatusBadge = (status) => {
    let bgColor, textColor, icon;
    
    switch (status) {
      case 'pending':
        bgColor = darkMode ? 'bg-yellow-900' : 'bg-yellow-100';
        textColor = darkMode ? 'text-yellow-300' : 'text-yellow-800';
        icon = <Clock className="h-3 w-3 mr-1" />;
        break;
      case 'approved':
        bgColor = darkMode ? 'bg-green-900' : 'bg-green-100';
        textColor = darkMode ? 'text-green-300' : 'text-green-800';
        icon = <Check className="h-3 w-3 mr-1" />;
        break;
      case 'rejected':
        bgColor = darkMode ? 'bg-red-900' : 'bg-red-100';
        textColor = darkMode ? 'text-red-300' : 'text-red-800';
        icon = <X className="h-3 w-3 mr-1" />;
        break;
      case 'disbursed':
        bgColor = darkMode ? 'bg-blue-900' : 'bg-blue-100';
        textColor = darkMode ? 'text-blue-300' : 'text-blue-800';
        icon = <DollarSign className="h-3 w-3 mr-1" />;
        break;
      default:
        bgColor = darkMode ? 'bg-gray-800' : 'bg-gray-200';
        textColor = darkMode ? 'text-gray-300' : 'text-gray-800';
        icon = <MoreHorizontal className="h-3 w-3 mr-1" />;
    }
    
    return (
      <span className={`flex items-center px-2 py-1 rounded-full text-xs ${bgColor} ${textColor}`}>
        {icon} {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };
  
  // Details modal
  const renderDetailsModal = () => {
    if (!selectedRequest || !showDetailsModal) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className={`w-full max-w-2xl rounded-lg shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} p-6`}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold">Credit Request Details</h3>
            <button 
              onClick={() => setShowDetailsModal(false)}
              className={`p-1 rounded-full ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Status</p>
              <div className="mt-1">{renderStatusBadge(selectedRequest.status)}</div>
            </div>
            
            <div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Request ID</p>
              <p className="font-medium">{selectedRequest.id}</p>
            </div>
            
            <div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Farmer</p>
              <p className="font-medium flex items-center">
                <Users className="h-4 w-4 mr-1" />
                {selectedRequest.farmerName} ({selectedRequest.farmerID})
              </p>
            </div>
            
            <div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Organization</p>
              <p className="font-medium">{selectedRequest.organization || 'N/A'}</p>
            </div>
            
            <div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Amount</p>
              <p className="font-medium text-lg">{formatCurrency(selectedRequest.amount)}</p>
            </div>
            
            <div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Request Date</p>
              <p className="font-medium">{formatDate(selectedRequest.createdAt)}</p>
            </div>
          </div>
          
          <div className="mb-6">
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Purpose</p>
            <p className={`p-3 rounded-md ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} mt-1`}>
              {selectedRequest.description || 'No description provided.'}
            </p>
          </div>
          
          {userRole === 'admin' && selectedRequest.status === 'pending' && (
            <div className="flex justify-end gap-3">
              <button
                onClick={() => updateRequestStatus(selectedRequest.id, 'rejected')}
                className={`px-4 py-2 rounded-md flex items-center ${
                  darkMode 
                    ? 'bg-red-900 text-red-100 hover:bg-red-800' 
                    : 'bg-red-100 text-red-800 hover:bg-red-200'
                }`}
              >
                <X className="h-4 w-4 mr-2" />
                Reject
              </button>
              
              <button
                onClick={() => updateRequestStatus(selectedRequest.id, 'approved')}
                className={`px-4 py-2 rounded-md flex items-center ${
                  darkMode 
                    ? 'bg-green-900 text-green-100 hover:bg-green-800' 
                    : 'bg-green-100 text-green-800 hover:bg-green-200'
                }`}
              >
                <Check className="h-4 w-4 mr-2" />
                Approve
              </button>
            </div>
          )}
          
          {userRole === 'admin' && selectedRequest.status === 'approved' && (
            <div className="flex justify-end gap-3">
              <button
                onClick={() => updateRequestStatus(selectedRequest.id, 'disbursed')}
                className={`px-4 py-2 rounded-md flex items-center ${
                  darkMode 
                    ? 'bg-blue-900 text-blue-100 hover:bg-blue-800' 
                    : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                }`}
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Mark as Disbursed
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className={`h-10 w-10 animate-spin ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
        <p className="mt-4">Loading credit requests...</p>
      </div>
    );
  }
  
  // Empty state
  if (creditRequests.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center h-64 border rounded-lg ${
        darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
      }`}>
        <CreditCard className={`h-12 w-12 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
        <p className="mt-4 text-lg font-medium">No credit requests found</p>
        <p className={`mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          {searchQuery || statusFilter !== 'all' 
            ? 'Try adjusting your search or filters' 
            : 'When farmers submit credit requests, they will appear here'}
        </p>
      </div>
    );
  }
  
  return (
    <>
      <div className={`rounded-lg border ${
        darkMode ? 'border-gray-700' : 'border-gray-200'
      } overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className={darkMode ? 'bg-gray-800' : 'bg-gray-50'}>
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Farmer
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Organization
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Amount
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Request Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Status
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
              {creditRequests.map((request) => (
                <tr key={request.id} className={darkMode ? 'bg-gray-900' : 'bg-white'}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium">{request.farmerName}</div>
                    <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      ID: {request.farmerID}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">{request.organization || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium">{formatCurrency(request.amount)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">{formatDate(request.createdAt)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {renderStatusBadge(request.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                    <div className="flex justify-end space-x-2">
                      <button 
                        onClick={() => handleViewDetails(request)}
                        className={`p-1 rounded-full ${
                          darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
                        }`}
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      
                      {userRole === 'admin' && request.status === 'pending' && (
                        <>
                          <button 
                            onClick={() => updateRequestStatus(request.id, 'approved')}
                            className={`p-1 rounded-full ${
                              darkMode ? 'hover:bg-green-900 text-green-400' : 'hover:bg-green-100 text-green-600'
                            }`}
                            title="Approve"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          
                          <button 
                            onClick={() => updateRequestStatus(request.id, 'rejected')}
                            className={`p-1 rounded-full ${
                              darkMode ? 'hover:bg-red-900 text-red-400' : 'hover:bg-red-100 text-red-600'
                            }`}
                            title="Reject"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      )}
                      
                      {userRole === 'admin' && request.status === 'approved' && (
                        <button 
                          onClick={() => updateRequestStatus(request.id, 'disbursed')}
                          className={`p-1 rounded-full ${
                            darkMode ? 'hover:bg-blue-900 text-blue-400' : 'hover:bg-blue-100 text-blue-600'
                          }`}
                          title="Mark as Disbursed"
                        >
                          <DollarSign className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {renderDetailsModal()}
    </>
  );
};

CreditRequestsView.propTypes = {
  darkMode: PropTypes.bool.isRequired,
  userRole: PropTypes.string.isRequired,
  searchQuery: PropTypes.string.isRequired,
  statusFilter: PropTypes.string.isRequired,
  sortField: PropTypes.string.isRequired,
  sortDirection: PropTypes.string.isRequired
};

export default CreditRequestsView; 