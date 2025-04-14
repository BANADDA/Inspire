import { addDoc, collection, doc, onSnapshot, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { ClipboardCheck, Clock, CreditCard, DollarSign, Eye, FileText, Filter, Plus, Search, User, X } from 'lucide-react';
import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { db } from '../../firebase/firebase';

const CreditRequestsManagement = ({ darkMode, userRole }) => {
  const [creditRequests, setCreditRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [farmers, setFarmers] = useState([]);
  const [loadingFarmers, setLoadingFarmers] = useState(false);
  const [newRequest, setNewRequest] = useState({
    farmerId: '',
    amountRequested: '',
    purpose: '',
    inputs: []
  });
  const [currentInput, setCurrentInput] = useState({
    type: '',
    quantity: '',
    unit: 'kg',
    estimatedCost: ''
  });
  const [isReviewStepModalOpen, setIsReviewStepModalOpen] = useState(false);
  const [isDisbursementModalOpen, setIsDisbursementModalOpen] = useState(false);
  
  // Fetch credit requests from Firestore
  useEffect(() => {
    setLoading(true);
    
    let requestsQuery;
    if (filterStatus === 'all') {
      requestsQuery = query(collection(db, 'creditRequests'));
    } else {
      requestsQuery = query(
        collection(db, 'creditRequests'), 
        where('status', '==', filterStatus)
      );
    }
    
    const unsubscribe = onSnapshot(requestsQuery, async (snapshot) => {
      // Get all documents
      let requestsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // For each request, fetch the farmer's name
      const farmerPromises = requestsData.map(async (request) => {
        // Make sure to handle the case where farmerId might not exist
        if (!request.farmerId) return request;
        
        try {
          const farmerDoc = await doc(db, 'farmers', request.farmerId).get();
          if (farmerDoc.exists()) {
            return {
              ...request,
              farmerName: farmerDoc.data().fullName || 'Unknown'
            };
          }
          return request;
        } catch (error) {
          console.error("Error fetching farmer details:", error);
          return request;
        }
      });
      
      // Wait for all farmer data to be fetched
      requestsData = await Promise.all(farmerPromises);
      
      setCreditRequests(requestsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching credit requests:", error);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [filterStatus]);
  
  // Fetch farmers for the create form
  useEffect(() => {
    if (isCreateModalOpen) {
      setLoadingFarmers(true);
      const farmersQuery = query(collection(db, 'farmers'), where('isActive', '==', true));
      
      const unsubscribe = onSnapshot(farmersQuery, (snapshot) => {
        const farmersData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setFarmers(farmersData);
        setLoadingFarmers(false);
      }, (error) => {
        console.error("Error fetching farmers:", error);
        setLoadingFarmers(false);
      });
      
      return () => unsubscribe();
    }
  }, [isCreateModalOpen]);
  
  // Filter credit requests based on search term
  const filteredRequests = creditRequests.filter(request => {
    const farmerName = request.farmerName || '';
    const farmerId = request.farmerId || '';
    const purpose = request.purpose || '';
    
    const searchFields = [farmerName, farmerId, purpose].join(' ').toLowerCase();
    return searchFields.includes(searchTerm.toLowerCase());
  });
  
  // Open modal to review a credit request
  const handleOpenReviewModal = (request) => {
    setSelectedRequest(request);
    setIsReviewModalOpen(true);
  };
  
  // Close review modal
  const handleCloseReviewModal = () => {
    setIsReviewModalOpen(false);
    setSelectedRequest(null);
  };
  
  // Update credit request status
  const handleUpdateRequestStatus = async (requestId, newStatus, approvedAmount = null, interestRate = null, notes = '') => {
    try {
      const requestRef = doc(db, 'creditRequests', requestId);
      
      // Get the notes from the form when approving/rejecting
      const assessmentNotes = document.querySelector('textarea[name="assessmentNotes"]')?.value || '';
      
      const updateData = {
        status: newStatus,
        'decisionData.decision': newStatus === 'approved' ? 'approved' : 'rejected',
        'decisionData.decisionDate': new Date(),
        'decisionData.decisionBy': 'admin', // You would use actual user ID here
        'decisionData.notes': assessmentNotes || notes
      };
      
      // Add approved amount and interest rate if available
      if (newStatus === 'approved' && approvedAmount !== null) {
        updateData['decisionData.approvedAmount'] = approvedAmount;
      }
      
      if (newStatus === 'approved' && interestRate !== null) {
        updateData['decisionData.interestRate'] = interestRate;
      }
      
      await updateDoc(requestRef, updateData);
      
      // Close the modal after update
      handleCloseReviewModal();
    } catch (error) {
      console.error("Error updating credit request status:", error);
    }
  };
  
  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };
  
  // Format date
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };
  
  // Handle Create Modal
  const handleOpenCreateModal = () => {
    setIsCreateModalOpen(true);
  };
  
  const handleCloseCreateModal = () => {
    setIsCreateModalOpen(false);
    setNewRequest({
      farmerId: '',
      amountRequested: '',
      purpose: '',
      inputs: [],
      creditType: 'inputs',
      repaymentPeriod: '6months',
      farmLocation: '',
      organizationType: '',
      organizationId: '',
      organizationName: ''
    });
  };
  
  // Handle form changes
  const handleNewRequestChange = async (e) => {
    const { name, value } = e.target;
    
    // Special case for farmer selection
    if (name === 'farmerId' && value) {
      // Temporarily show loading state
      setLoadingFarmers(true);
      
      // First update just the farmer ID to show selection
      setNewRequest(prev => ({
        ...prev,
        [name]: value
      }));
      
      // Then fetch details
      const farmerDetails = await fetchFarmerDetails(value);
      
      if (farmerDetails) {
        // Update with full farmer details
        setNewRequest(prev => ({
          ...prev,
          ...farmerDetails
        }));
      }
      
      setLoadingFarmers(false);
    } else {
      // For all other fields
      setNewRequest(prev => ({
        ...prev,
        [name]: name === 'amountRequested' ? parseFloat(value) || '' : value
      }));
    }
  };
  
  // Handle current input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCurrentInput({
      ...currentInput,
      [name]: ['quantity', 'estimatedCost'].includes(name) ? parseFloat(value) || '' : value
    });
  };
  
  // Add input to the request
  const handleAddInput = () => {
    if (currentInput.type && currentInput.quantity && currentInput.estimatedCost) {
      setNewRequest({
        ...newRequest,
        inputs: [...newRequest.inputs, { ...currentInput }]
      });
      setCurrentInput({
        type: '',
        quantity: '',
        unit: 'kg',
        estimatedCost: ''
      });
    }
  };
  
  // Remove input from request
  const handleRemoveInput = (index) => {
    setNewRequest({
      ...newRequest,
      inputs: newRequest.inputs.filter((_, i) => i !== index)
    });
  };
  
  // Submit new credit request
  const handleSubmitRequest = async () => {
    try {
      if (!newRequest.farmerId || !newRequest.amountRequested || !newRequest.purpose) {
        alert('Please fill in all required fields.');
        return;
      }
      
      const farmer = farmers.find(f => f.id === newRequest.farmerId);
      const requestData = {
        farmerId: newRequest.farmerId,
        farmerName: farmer ? (farmer.fullName || `${farmer.firstName || ''} ${farmer.lastName || ''}`.trim()) : 'Unknown',
        amountRequested: parseFloat(newRequest.amountRequested),
        purpose: newRequest.purpose,
        inputs: newRequest.inputs,
        status: 'pending',
        requestDate: serverTimestamp(),
        createdBy: 'admin' // You would use actual user ID here
      };
      
      await addDoc(collection(db, 'creditRequests'), requestData);
      
      handleCloseCreateModal();
    } catch (error) {
      console.error("Error creating credit request:", error);
    }
  };
  
  // Add functions to handle review step modal
  const handleOpenReviewStepModal = (request) => {
    setSelectedRequest(request);
    setIsReviewStepModalOpen(true);
  };
  
  const handleCloseReviewStepModal = () => {
    setIsReviewStepModalOpen(false);
  };
  
  // Add functions to handle disbursement modal
  const handleOpenDisbursementModal = (request) => {
    setSelectedRequest(request);
    setIsDisbursementModalOpen(true);
  };
  
  const handleCloseDisbursementModal = () => {
    setIsDisbursementModalOpen(false);
  };
  
  // Improve farmer selection to immediately update location and organization
  // Enhanced farmer selection with immediate data update
  const fetchFarmerDetails = async (farmerId) => {
    try {
      // First check if we already have the farmer in our farmers array
      let selectedFarmer = farmers.find(f => f.id === farmerId);
      
      if (!selectedFarmer) {
        // If not found in our array (which might happen in some cases), fetch directly
        const farmerDoc = await doc(db, 'farmers', farmerId).get();
        if (farmerDoc.exists()) {
          selectedFarmer = {
            id: farmerDoc.id,
            ...farmerDoc.data()
          };
        }
      }
      
      if (selectedFarmer) {
        return {
          farmLocation: selectedFarmer.location?.address || selectedFarmer.district || '',
          organizationType: selectedFarmer.organization?.type || 'independent',
          organizationId: selectedFarmer.organization?.id || '',
          organizationName: selectedFarmer.organization?.name || ''
        };
      }
      
      return null;
    } catch (error) {
      console.error("Error fetching farmer details:", error);
      return null;
    }
  };
  
  // Enhanced close modal function with keyboard support
  useEffect(() => {
    const handleEscKey = (event) => {
      if (event.key === 'Escape') {
        // Close any open modals
        if (isCreateModalOpen) handleCloseCreateModal();
        if (isReviewModalOpen) handleCloseReviewModal();
        if (isReviewStepModalOpen) handleCloseReviewStepModal();
        if (isDisbursementModalOpen) handleCloseDisbursementModal();
      }
    };
  
    // Add event listener
    document.addEventListener('keydown', handleEscKey);
  
    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [isCreateModalOpen, isReviewModalOpen, isReviewStepModalOpen, isDisbursementModalOpen]);
  
  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            Credit Requests Management
          </h1>
          <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Review, approve or reject farmer credit requests
          </p>
        </div>
        
        {/* Add Create Request Button */}
        <button 
          onClick={handleOpenCreateModal}
          className={`inline-flex items-center px-4 py-2 rounded-lg ${
            darkMode 
              ? 'bg-indigo-600 hover:bg-indigo-700 text-white' 
              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
          }`}
        >
          <Plus className="h-5 w-5 mr-2" /> 
          <span>Create Request</span>
        </button>
      </div>
      
      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
        <div className={`relative max-w-md ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          <input
            type="text"
            placeholder="Search by farmer name, purpose..."
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
            <option value="all">All Requests</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="disbursed">Disbursed</option>
          </select>
        </div>
      </div>
      
      {/* Credit Requests List */}
      <div className={`overflow-x-auto rounded-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className={`${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
            <tr>
              <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>Request ID</th>
              <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>Farmer</th>
              <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>Amount</th>
              <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>Purpose</th>
              <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>Request Date</th>
              <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>Status</th>
              <th scope="col" className={`px-6 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'} uppercase tracking-wider`}>Actions</th>
            </tr>
          </thead>
          <tbody className={`${darkMode ? 'bg-gray-800 divide-y divide-gray-700' : 'bg-white divide-y divide-gray-200'}`}>
            {loading ? (
              <tr>
                <td colSpan="7" className={`px-6 py-4 text-center ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                  Loading credit requests...
                </td>
              </tr>
            ) : filteredRequests.length === 0 ? (
              <tr>
                <td colSpan="7" className={`px-6 py-4 text-center ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                  No credit requests found.
                </td>
              </tr>
            ) : (
              filteredRequests.map((request) => (
                <tr key={request.id} className={darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                  <td className={`px-6 py-4 whitespace-nowrap ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 mr-2" />
                      <span>{request.id.substring(0, 8)}...</span>
                    </div>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    <div className="flex items-center">
                      <User className="h-4 w-4 mr-2" />
                      <span>{request.farmerName || 'Unknown'}</span>
                    </div>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    <div className="flex items-center">
                      <DollarSign className="h-4 w-4 mr-1" />
                      <span>{formatCurrency(request.amountRequested || 0)}</span>
                    </div>
                  </td>
                  <td className={`px-6 py-4 ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                    <div className="truncate max-w-xs">
                      {request.purpose || 'Not specified'}
                    </div>
                  </td>
                  <td className={`px-6 py-4 whitespace-nowrap ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2" />
                      <span>{formatDate(request.requestDate)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      request.status === 'approved'
                        ? 'bg-green-500/10 text-green-500'
                        : request.status === 'rejected'
                          ? 'bg-red-500/10 text-red-500'
                          : request.status === 'disbursed'
                            ? 'bg-blue-500/10 text-blue-500'
                            : 'bg-yellow-500/10 text-yellow-500'
                    }`}>
                      {request.status === 'approved' 
                        ? 'Approved' 
                        : request.status === 'rejected'
                          ? 'Rejected'
                          : request.status === 'disbursed'
                            ? 'Disbursed'
                            : 'Pending'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex space-x-2">
                      <button 
                        className={`p-1 rounded-full ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                        title="View details"
                        onClick={() => handleOpenReviewModal(request)}
                      >
                        <Eye className={`h-5 w-5 ${darkMode ? 'text-gray-300' : 'text-gray-500'}`} />
                      </button>
                      
                      {userRole === 'admin' && request.status === 'pending' && (
                        <>
                          <button 
                            className={`p-1 rounded-full ${darkMode ? 'hover:bg-green-900/20' : 'hover:bg-green-100'}`}
                            title="Review request"
                            onClick={() => handleOpenReviewStepModal(request)}
                          >
                            <ClipboardCheck className="h-5 w-5 text-green-500" />
                          </button>
                        </>
                      )}
                      
                      {userRole === 'admin' && request.status === 'approved' && (
                        <button 
                          className={`p-1 rounded-full ${darkMode ? 'hover:bg-blue-900/20' : 'hover:bg-blue-100'}`}
                          title="Disburse credit"
                          onClick={() => handleOpenDisbursementModal(request)}
                        >
                          <CreditCard className="h-5 w-5 text-blue-500" />
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
      
      {/* MODALS - Each as a separate, independent component */}
      
      {/* Modal 1: Create Credit Request - Only shown when creating a new request */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div 
            className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                handleCloseCreateModal();
              }
            }}
          >
            <div className="fixed inset-0 transition-opacity">
              <div className={`absolute inset-0 ${darkMode ? 'bg-gray-900' : 'bg-gray-500'} opacity-75`}></div>
            </div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            
            <div className={`inline-block align-bottom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              {/* Header */}
              <div className={`px-6 py-4 border-b flex justify-between items-center ${darkMode ? 'bg-indigo-900/30 border-indigo-800/30 text-white' : 'bg-indigo-50 border-indigo-100 text-indigo-700'}`}>
                <div className="flex justify-between items-center flex-1">
                  <h3 className="text-lg font-medium">Credit Request Application</h3>
                  <span className={`px-3 py-1 rounded-full text-xs ${darkMode ? 'bg-indigo-800/50 text-indigo-300' : 'bg-indigo-100 text-indigo-700'}`}>New Credit Request</span>
                </div>
                <button
                  onClick={handleCloseCreateModal}
                  className={`ml-4 p-1 rounded-full ${darkMode ? 'hover:bg-indigo-800 text-gray-200' : 'hover:bg-indigo-100 text-gray-600'}`}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              {/* Form content */}
              <div className={`px-6 py-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                <form>
                  {/* Farmer Selection Section */}
                  <div className="mb-6">
                    <h4 className={`text-lg font-medium mb-4 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Farmer Information</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="col-span-2">
                        <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          Select Farmer *
                        </label>
                        {loadingFarmers ? (
                          <div className={`flex items-center space-x-2 py-2 px-3 border rounded-md ${
                            darkMode ? 'bg-gray-700 border-gray-600 text-gray-300' : 'bg-gray-100 border-gray-300 text-gray-500'
                          }`}>
                            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-indigo-500"></div>
                            <span>Loading farmers...</span>
                          </div>
                        ) : (
                          <select
                            name="farmerId"
                            value={newRequest.farmerId}
                            onChange={handleNewRequestChange}
                            className={`w-full rounded-md border px-3 py-2 ${
                              darkMode 
                                ? 'bg-gray-700 border-gray-600 text-white' 
                                : 'bg-white border-gray-300 text-gray-700'
                            }`}
                            required
                          >
                            <option value="">Select a farmer</option>
                            {farmers.map(farmer => (
                              <option key={farmer.id} value={farmer.id}>
                                {farmer.fullName || `${farmer.firstName || ''} ${farmer.lastName || ''}`.trim()}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                      
                      {newRequest.farmerId && (
                        <>
                          <div>
                            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                              Farm Location
                            </label>
                            <input
                              type="text"
                              value={newRequest.farmLocation || ''}
                              readOnly
                              className={`w-full rounded-md border px-3 py-2 bg-opacity-50 ${
                                darkMode 
                                  ? 'bg-gray-800 border-gray-600 text-gray-300' 
                                  : 'bg-gray-100 border-gray-300 text-gray-500'
                              }`}
                            />
                          </div>
                          
                          <div>
                            <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                              Organization
                            </label>
                            <input
                              type="text"
                              value={newRequest.organizationName || 'Independent'}
                              readOnly
                              className={`w-full rounded-md border px-3 py-2 bg-opacity-50 ${
                                darkMode 
                                  ? 'bg-gray-800 border-gray-600 text-gray-300' 
                                  : 'bg-gray-100 border-gray-300 text-gray-500'
                              }`}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* Credit Request Details */}
                  <div className="mb-6">
                    <h4 className={`text-lg font-medium mb-4 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Credit Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          Amount Requested (UGX) *
                        </label>
                        <div className="relative">
                          <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            <DollarSign className="h-4 w-4" />
                          </div>
                          <input
                            type="number"
                            name="amountRequested"
                            value={newRequest.amountRequested}
                            onChange={handleNewRequestChange}
                            placeholder="0.00"
                            min="0"
                            step="0.01"
                            className={`w-full rounded-md border pl-10 px-3 py-2 ${
                              darkMode 
                                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                                : 'bg-white border-gray-300 text-gray-700 placeholder-gray-400'
                            }`}
                            required
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          Purpose *
                        </label>
                        <select
                          name="purpose"
                          value={newRequest.purpose}
                          onChange={handleNewRequestChange}
                          className={`w-full rounded-md border px-3 py-2 ${
                            darkMode 
                              ? 'bg-gray-700 border-gray-600 text-white' 
                              : 'bg-white border-gray-300 text-gray-700'
                          }`}
                          required
                        >
                          <option value="">Select purpose</option>
                          <option value="Farm Inputs">Farm Inputs</option>
                          <option value="Equipment">Equipment</option>
                          <option value="Processing">Processing</option>
                          <option value="Transportation">Transportation</option>
                          <option value="Marketing">Marketing</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      
                      <div className="col-span-2">
                        <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          Additional Notes
                        </label>
                        <textarea
                          name="notes"
                          value={newRequest.notes || ''}
                          onChange={handleNewRequestChange}
                          rows="3"
                          className={`w-full rounded-md border px-3 py-2 ${
                            darkMode 
                              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                              : 'bg-white border-gray-300 text-gray-700 placeholder-gray-400'
                          }`}
                          placeholder="Enter any additional information about this credit request"
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Input Items Section (if relevant) */}
                  {newRequest.purpose === 'Farm Inputs' && (
                    <div className="mb-6">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className={`text-lg font-medium ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Input Items</h4>
                        <button
                          type="button"
                          onClick={handleAddInput}
                          className={`px-3 py-1 rounded-md text-sm ${
                            darkMode 
                              ? 'bg-indigo-600 hover:bg-indigo-700 text-white' 
                              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                          }`}
                        >
                          Add Item
                        </button>
                      </div>
                      
                      {/* Current input form */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                        <div>
                          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            Input Type
                          </label>
                          <input
                            type="text"
                            name="type"
                            value={currentInput.type}
                            onChange={handleInputChange}
                            placeholder="e.g. Fertilizer, Seeds"
                            className={`w-full rounded-md border px-3 py-2 ${
                              darkMode 
                                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                                : 'bg-white border-gray-300 text-gray-700 placeholder-gray-400'
                            }`}
                          />
                        </div>
                        
                        <div>
                          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            Quantity
                          </label>
                          <input
                            type="number"
                            name="quantity"
                            value={currentInput.quantity}
                            onChange={handleInputChange}
                            placeholder="Quantity"
                            min="1"
                            className={`w-full rounded-md border px-3 py-2 ${
                              darkMode 
                                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                                : 'bg-white border-gray-300 text-gray-700 placeholder-gray-400'
                            }`}
                          />
                        </div>
                        
                        <div>
                          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            Unit
                          </label>
                          <select
                            name="unit"
                            value={currentInput.unit}
                            onChange={handleInputChange}
                            className={`w-full rounded-md border px-3 py-2 ${
                              darkMode 
                                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                                : 'bg-white border-gray-300 text-gray-700 placeholder-gray-400'
                            }`}
                          >
                            <option value="kg">Kilograms (kg)</option>
                            <option value="g">Grams (g)</option>
                            <option value="l">Liters (l)</option>
                            <option value="ml">Milliliters (ml)</option>
                            <option value="bags">Bags</option>
                            <option value="sacks">Sacks</option>
                            <option value="pieces">Pieces</option>
                            <option value="units">Units</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            Estimated Cost (UGX)
                          </label>
                          <input
                            type="number"
                            name="estimatedCost"
                            value={currentInput.estimatedCost}
                            onChange={handleInputChange}
                            placeholder="0.00"
                            min="0"
                            step="0.01"
                            className={`w-full rounded-md border px-3 py-2 ${
                              darkMode 
                                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                                : 'bg-white border-gray-300 text-gray-700 placeholder-gray-400'
                            }`}
                          />
                        </div>
                      </div>
                      
                      {/* List of added inputs */}
                      {newRequest.inputs.length > 0 && (
                        <div className={`rounded-md border ${darkMode ? 'border-gray-700' : 'border-gray-200'} overflow-hidden`}>
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className={darkMode ? 'bg-gray-700' : 'bg-gray-50'}>
                              <tr>
                                <th className={`px-4 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                                  Input Type
                                </th>
                                <th className={`px-4 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                                  Quantity
                                </th>
                                <th className={`px-4 py-3 text-left text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                                  Cost
                                </th>
                                <th className={`px-4 py-3 text-right text-xs font-medium ${darkMode ? 'text-gray-300' : 'text-gray-500'} uppercase tracking-wider`}>
                                  Actions
                                </th>
                              </tr>
                            </thead>
                            <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                              {newRequest.inputs.map((input, index) => (
                                <tr key={index} className={darkMode ? 'bg-gray-800' : 'bg-white'}>
                                  <td className={`px-4 py-3 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                                    {input.type}
                                  </td>
                                  <td className={`px-4 py-3 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                                    {input.quantity} {input.unit}
                                  </td>
                                  <td className={`px-4 py-3 text-sm ${darkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                                    {formatCurrency(input.estimatedCost)}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-right">
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveInput(index)}
                                      className={`text-sm text-red-500 hover:text-red-700`}
                                    >
                                      Remove
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </form>
              </div>
              
              {/* Footer with action buttons */}
              <div className={`px-6 py-4 border-t flex justify-end gap-3 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                <button
                  type="button"
                  onClick={handleCloseCreateModal}
                  className={`px-4 py-2 rounded-md text-sm ${
                    darkMode 
                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSubmitRequest}
                  className={`px-4 py-2 rounded-md text-sm ${
                    darkMode 
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white' 
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                >
                  Submit Request
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal 2: Review Step Modal */}
      {isReviewStepModalOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div 
            className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                handleCloseReviewStepModal();
              }
            }}
          >
            <div className="fixed inset-0 transition-opacity">
              <div className={`absolute inset-0 ${darkMode ? 'bg-gray-900' : 'bg-gray-500'} opacity-75`}></div>
            </div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            
            <div className={`inline-block align-bottom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              {/* Header */}
              <div className={`px-6 py-4 border-b flex justify-between items-center ${darkMode ? 'bg-indigo-900/30 border-indigo-800/30 text-white' : 'bg-indigo-50 border-indigo-100 text-indigo-700'}`}>
                <div className="flex justify-between items-center flex-1">
                  <h3 className="text-lg font-medium">Credit Request Review</h3>
                  <span className={`px-3 py-1 rounded-full text-xs ${darkMode ? 'bg-indigo-800/50 text-indigo-300' : 'bg-indigo-100 text-indigo-700'}`}>Credit Assessment</span>
                </div>
                <button
                  onClick={handleCloseReviewStepModal}
                  className={`ml-4 p-1 rounded-full ${darkMode ? 'hover:bg-indigo-800 text-gray-200' : 'hover:bg-indigo-100 text-gray-600'}`}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              {/* Request details and assessment form */}
              <div className={`px-6 py-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                {/* Request Summary */}
                <div className="mb-6">
                  <h4 className={`text-lg font-medium mb-4 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Request Summary</h4>
                  <div className={`rounded-md border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'} p-4`}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Farmer</p>
                        <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>{selectedRequest.farmerName}</p>
                      </div>
                      <div>
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Amount Requested</p>
                        <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>{formatCurrency(selectedRequest.amountRequested)}</p>
                      </div>
                      <div>
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Purpose</p>
                        <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>{selectedRequest.purpose}</p>
                      </div>
                      <div>
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Request Date</p>
                        <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>{formatDate(selectedRequest.requestDate)}</p>
                      </div>
                      
                      {/* Show notes if available */}
                      {selectedRequest.notes && (
                        <div className="col-span-2">
                          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Additional Notes</p>
                          <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>{selectedRequest.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Assessment Form */}
                <div className="mb-6">
                  <h4 className={`text-lg font-medium mb-4 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Credit Assessment</h4>
                  <form>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          Approved Amount (UGX)
                        </label>
                        <div className="relative">
                          <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            <DollarSign className="h-4 w-4" />
                          </div>
                          <input
                            type="number"
                            name="approvedAmount"
                            defaultValue={selectedRequest.amountRequested}
                            min="0"
                            step="0.01"
                            className={`w-full rounded-md border pl-10 px-3 py-2 ${
                              darkMode 
                                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                                : 'bg-white border-gray-300 text-gray-700 placeholder-gray-400'
                            }`}
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          Interest Rate (%)
                        </label>
                        <input
                          type="number"
                          name="interestRate"
                          defaultValue="5"
                          min="0"
                          max="20"
                          step="0.1"
                          className={`w-full rounded-md border px-3 py-2 ${
                            darkMode 
                              ? 'bg-gray-700 border-gray-600 text-white' 
                              : 'bg-white border-gray-300 text-gray-700'
                          }`}
                        />
                      </div>
                      
                      <div className="col-span-2">
                        <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          Assessment Notes
                        </label>
                        <textarea
                          name="assessmentNotes"
                          rows="3"
                          className={`w-full rounded-md border px-3 py-2 ${
                            darkMode 
                              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                              : 'bg-white border-gray-300 text-gray-700 placeholder-gray-400'
                          }`}
                          placeholder="Enter your assessment notes and justification"
                        />
                      </div>
                    </div>
                  </form>
                </div>
              </div>
              
              {/* Footer with action buttons */}
              <div className={`px-6 py-4 border-t flex justify-end gap-3 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                <button
                  type="button"
                  onClick={() => handleUpdateRequestStatus(selectedRequest.id, 'rejected')}
                  className={`px-4 py-2 rounded-md text-sm ${
                    darkMode 
                      ? 'bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30' 
                      : 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-200'
                  }`}
                >
                  Reject Request
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateRequestStatus(selectedRequest.id, 'approved')}
                  className={`px-4 py-2 rounded-md text-sm ${
                    darkMode 
                      ? 'bg-green-500/20 hover:bg-green-500/30 text-green-300 border border-green-500/30' 
                      : 'bg-green-50 hover:bg-green-100 text-green-600 border border-green-200'
                  }`}
                >
                  Approve Request
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal 3: Disbursement Modal */}
      {isDisbursementModalOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div 
            className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                handleCloseDisbursementModal();
              }
            }}
          >
            <div className="fixed inset-0 transition-opacity">
              <div className={`absolute inset-0 ${darkMode ? 'bg-gray-900' : 'bg-gray-500'} opacity-75`}></div>
            </div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            
            <div className={`inline-block align-bottom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
              {/* Header */}
              <div className={`px-6 py-4 border-b flex justify-between items-center ${darkMode ? 'bg-indigo-900/30 border-indigo-800/30 text-white' : 'bg-indigo-50 border-indigo-100 text-indigo-700'}`}>
                <div className="flex justify-between items-center flex-1">
                  <h3 className="text-lg font-medium">Credit Disbursement</h3>
                  <span className={`px-3 py-1 rounded-full text-xs ${darkMode ? 'bg-indigo-800/50 text-indigo-300' : 'bg-indigo-100 text-indigo-700'}`}>Payment Processing</span>
                </div>
                <button
                  onClick={handleCloseDisbursementModal}
                  className={`ml-4 p-1 rounded-full ${darkMode ? 'hover:bg-indigo-800 text-gray-200' : 'hover:bg-indigo-100 text-gray-600'}`}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              {/* Disbursement content */}
              <div className={`px-6 py-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                {/* Approved credit summary */}
                <div className="mb-6">
                  <h4 className={`text-lg font-medium mb-4 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Approved Credit Summary</h4>
                  <div className={`rounded-md border ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-200'} p-4`}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Farmer</p>
                        <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>{selectedRequest.farmerName}</p>
                      </div>
                      <div>
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Approved Amount</p>
                        <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                          {formatCurrency(selectedRequest.decisionData?.approvedAmount || selectedRequest.amountRequested)}
                        </p>
                      </div>
                      <div>
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Purpose</p>
                        <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>{selectedRequest.purpose}</p>
                      </div>
                      <div>
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Interest Rate</p>
                        <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                          {selectedRequest.decisionData?.interestRate || 5}%
                        </p>
                      </div>
                      
                      {/* Display request notes if available */}
                      {selectedRequest.notes && (
                        <div className="col-span-2">
                          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Request Notes</p>
                          <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>{selectedRequest.notes}</p>
                        </div>
                      )}
                      
                      {/* Display assessment notes if available */}
                      {selectedRequest.decisionData?.notes && (
                        <div className="col-span-2">
                          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Assessment Notes</p>
                          <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>{selectedRequest.decisionData.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Disbursement Form */}
                <div className="mb-6">
                  <h4 className={`text-lg font-medium mb-4 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Payment Details</h4>
                  <form>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          Payment Method
                        </label>
                        <select
                          name="paymentMethod"
                          className={`w-full rounded-md border px-3 py-2 ${
                            darkMode 
                              ? 'bg-gray-700 border-gray-600 text-white' 
                              : 'bg-white border-gray-300 text-gray-700'
                          }`}
                        >
                          <option value="bank_transfer">Bank Transfer</option>
                          <option value="mobile_money">Mobile Money</option>
                          <option value="cash">Cash</option>
                          <option value="cheque">Cheque</option>
                        </select>
                      </div>
                      
                      <div>
                        <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          Disbursement Date
                        </label>
                        <input
                          type="date"
                          name="disbursementDate"
                          defaultValue={new Date().toISOString().split('T')[0]}
                          className={`w-full rounded-md border px-3 py-2 ${
                            darkMode 
                              ? 'bg-gray-700 border-gray-600 text-white' 
                              : 'bg-white border-gray-300 text-gray-700'
                          }`}
                        />
                      </div>
                      
                      <div className="col-span-2">
                        <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          Transaction Details
                        </label>
                        <input
                          type="text"
                          name="transactionId"
                          placeholder="Enter transaction reference, cheque number, etc."
                          className={`w-full rounded-md border px-3 py-2 ${
                            darkMode 
                              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                              : 'bg-white border-gray-300 text-gray-700 placeholder-gray-400'
                          }`}
                        />
                      </div>
                      
                      <div className="col-span-2">
                        <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                          Disbursement Notes
                        </label>
                        <textarea
                          name="disbursementNotes"
                          rows="3"
                          className={`w-full rounded-md border px-3 py-2 ${
                            darkMode 
                              ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                              : 'bg-white border-gray-300 text-gray-700 placeholder-gray-400'
                          }`}
                          placeholder="Enter any notes about this disbursement"
                        />
                      </div>
                    </div>
                  </form>
                </div>
              </div>
              
              {/* Footer with action buttons */}
              <div className={`px-6 py-4 border-t flex justify-end gap-3 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'}`}>
                <button
                  type="button"
                  onClick={handleCloseDisbursementModal}
                  className={`px-4 py-2 rounded-md text-sm ${
                    darkMode 
                      ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdateRequestStatus(selectedRequest.id, 'disbursed')}
                  className={`px-4 py-2 rounded-md text-sm ${
                    darkMode 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                      : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  Complete Disbursement
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

CreditRequestsManagement.propTypes = {
  darkMode: PropTypes.bool.isRequired,
  userRole: PropTypes.string.isRequired,
};

export default CreditRequestsManagement; 