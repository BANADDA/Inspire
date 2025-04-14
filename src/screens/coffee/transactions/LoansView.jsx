import { collection, doc, getDocs, orderBy, query, Timestamp, updateDoc, where } from 'firebase/firestore';
import {
    BanknoteIcon,
    Calendar,
    Check,
    DollarSign,
    Eye,
    Loader2,
    RefreshCw,
    Users,
    X
} from 'lucide-react';
import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { db } from '../../../firebase/firebase';

const LoansView = ({ 
  darkMode, 
  userRole, 
  searchQuery, 
  statusFilter, 
  sortField, 
  sortDirection 
}) => {
  const [loans, setLoans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  
  // Fetch loans with applied filters
  useEffect(() => {
    const fetchLoans = async () => {
      setIsLoading(true);
      try {
        let loansRef = collection(db, 'loans');
        let loansQuery = query(loansRef);
        
        // Apply status filter if not 'all'
        if (statusFilter !== 'all') {
          loansQuery = query(loansQuery, where('status', '==', statusFilter));
        }
        
        // Apply sort
        loansQuery = query(loansQuery, orderBy(sortField, sortDirection));
        
        const querySnapshot = await getDocs(loansQuery);
        
        let fetchedLoans = [];
        querySnapshot.forEach((doc) => {
          fetchedLoans.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        // Apply search filter (client-side)
        if (searchQuery) {
          const searchLower = searchQuery.toLowerCase();
          fetchedLoans = fetchedLoans.filter(loan => 
            loan.farmerName?.toLowerCase().includes(searchLower) ||
            loan.farmerID?.toLowerCase().includes(searchLower) ||
            loan.organization?.toLowerCase().includes(searchLower) ||
            loan.purpose?.toLowerCase().includes(searchLower)
          );
        }
        
        setLoans(fetchedLoans);
      } catch (error) {
        console.error("Error fetching loans:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchLoans();
  }, [searchQuery, statusFilter, sortField, sortDirection]);
  
  // Update loan status
  const updateLoanStatus = async (loanId, newStatus, additionalData = {}) => {
    try {
      const loanRef = doc(db, 'loans', loanId);
      
      const updateData = { 
        status: newStatus,
        updatedAt: Timestamp.now(),
        ...additionalData
      };
      
      // If marking as repaid, add repayment date
      if (newStatus === 'repaid') {
        updateData.repaidAt = Timestamp.now();
      }
      
      await updateDoc(loanRef, updateData);
      
      // Update local state
      setLoans(prev => 
        prev.map(loan => 
          loan.id === loanId 
            ? { ...loan, ...updateData } 
            : loan
        )
      );
      
      // Close details modal if open
      if (showDetailsModal) {
        setShowDetailsModal(false);
      }
    } catch (error) {
      console.error("Error updating loan:", error);
    }
  };
  
  // Record a payment
  const recordPayment = async (loanId, paymentAmount) => {
    try {
      const loanRef = doc(db, 'loans', loanId);
      const loan = loans.find(l => l.id === loanId);
      
      if (!loan) return;
      
      const payments = loan.payments || [];
      const newPayment = {
        amount: parseFloat(paymentAmount),
        date: Timestamp.now(),
        recordedBy: "admin" // Should be dynamic based on current user
      };
      
      const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0) + newPayment.amount;
      const remainingAmount = loan.amount - totalPaid;
      
      // Determine if loan is fully repaid
      const newStatus = remainingAmount <= 0 ? 'repaid' : 'active';
      
      await updateDoc(loanRef, {
        payments: [...payments, newPayment],
        amountPaid: totalPaid,
        remainingAmount: Math.max(0, remainingAmount),
        status: newStatus,
        updatedAt: Timestamp.now(),
        repaidAt: newStatus === 'repaid' ? Timestamp.now() : null
      });
      
      // Update local state
      setLoans(prev => 
        prev.map(l => 
          l.id === loanId 
            ? { 
                ...l, 
                payments: [...(l.payments || []), newPayment],
                amountPaid: totalPaid,
                remainingAmount: Math.max(0, remainingAmount),
                status: newStatus,
                updatedAt: Timestamp.now(),
                repaidAt: newStatus === 'repaid' ? Timestamp.now() : null
              } 
            : l
        )
      );
      
      // Update the selected loan if details modal is open
      if (showDetailsModal && selectedLoan && selectedLoan.id === loanId) {
        setSelectedLoan(prev => ({
          ...prev,
          payments: [...(prev.payments || []), newPayment],
          amountPaid: totalPaid,
          remainingAmount: Math.max(0, remainingAmount),
          status: newStatus,
          updatedAt: Timestamp.now(),
          repaidAt: newStatus === 'repaid' ? Timestamp.now() : null
        }));
      }
      
    } catch (error) {
      console.error("Error recording payment:", error);
    }
  };
  
  // View details of a specific loan
  const handleViewDetails = (loan) => {
    setSelectedLoan(loan);
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
  
  // Calculate progress percentage
  const calculateProgress = (loan) => {
    if (!loan.amount) return 0;
    const amountPaid = loan.amountPaid || 0;
    return Math.min(100, Math.round((amountPaid / loan.amount) * 100));
  };
  
  // Render status badge
  const renderStatusBadge = (status) => {
    let bgColor, textColor, icon;
    
    switch (status) {
      case 'pending':
        bgColor = darkMode ? 'bg-yellow-900' : 'bg-yellow-100';
        textColor = darkMode ? 'text-yellow-300' : 'text-yellow-800';
        icon = <RefreshCw className="h-3 w-3 mr-1" />;
        break;
      case 'active':
        bgColor = darkMode ? 'bg-blue-900' : 'bg-blue-100';
        textColor = darkMode ? 'text-blue-300' : 'text-blue-800';
        icon = <DollarSign className="h-3 w-3 mr-1" />;
        break;
      case 'repaid':
        bgColor = darkMode ? 'bg-green-900' : 'bg-green-100';
        textColor = darkMode ? 'text-green-300' : 'text-green-800';
        icon = <Check className="h-3 w-3 mr-1" />;
        break;
      case 'defaulted':
        bgColor = darkMode ? 'bg-red-900' : 'bg-red-100';
        textColor = darkMode ? 'text-red-300' : 'text-red-800';
        icon = <X className="h-3 w-3 mr-1" />;
        break;
      default:
        bgColor = darkMode ? 'bg-gray-800' : 'bg-gray-200';
        textColor = darkMode ? 'text-gray-300' : 'text-gray-800';
        icon = <Calendar className="h-3 w-3 mr-1" />;
    }
    
    return (
      <span className={`flex items-center px-2 py-1 rounded-full text-xs ${bgColor} ${textColor}`}>
        {icon} {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };
  
  // Details modal with payment recording functionality
  const renderDetailsModal = () => {
    if (!selectedLoan || !showDetailsModal) return null;
    
    const progress = calculateProgress(selectedLoan);
    
    const handlePaymentSubmit = (e) => {
      e.preventDefault();
      if (!paymentAmount || isNaN(parseFloat(paymentAmount)) || parseFloat(paymentAmount) <= 0) {
        return;
      }
      
      recordPayment(selectedLoan.id, paymentAmount);
      setPaymentAmount('');
    };
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className={`w-full max-w-3xl rounded-lg shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} p-6 max-h-[90vh] overflow-y-auto`}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold">Loan Details</h3>
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
              <div className="mt-1">{renderStatusBadge(selectedLoan.status)}</div>
            </div>
            
            <div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Loan ID</p>
              <p className="font-medium">{selectedLoan.id}</p>
            </div>
            
            <div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Farmer</p>
              <p className="font-medium flex items-center">
                <Users className="h-4 w-4 mr-1" />
                {selectedLoan.farmerName} ({selectedLoan.farmerID})
              </p>
            </div>
            
            <div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Organization</p>
              <p className="font-medium">{selectedLoan.organization || 'N/A'}</p>
            </div>
            
            <div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total Amount</p>
              <p className="font-medium text-lg">{formatCurrency(selectedLoan.amount)}</p>
            </div>
            
            <div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Disbursement Date</p>
              <p className="font-medium">{formatDate(selectedLoan.startDate)}</p>
            </div>
            
            <div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Due Date</p>
              <p className="font-medium">{formatDate(selectedLoan.dueDate)}</p>
            </div>
            
            <div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Interest Rate</p>
              <p className="font-medium">{selectedLoan.interestRate || 0}%</p>
            </div>
          </div>
          
          <div className="mb-6">
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Purpose</p>
            <p className={`p-3 rounded-md ${darkMode ? 'bg-gray-700' : 'bg-gray-100'} mt-1`}>
              {selectedLoan.purpose || 'No purpose provided.'}
            </p>
          </div>
          
          <div className="mb-6">
            <div className="flex justify-between items-center mb-1">
              <p className={`text-sm font-medium`}>Repayment Progress</p>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {formatCurrency(selectedLoan.amountPaid || 0)} of {formatCurrency(selectedLoan.amount)}
              </p>
            </div>
            <div className={`h-2 w-full rounded-full ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}>
              <div 
                className={`h-2 rounded-full ${progress === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {progress}% repaid
            </p>
          </div>
          
          {(selectedLoan.payments?.length > 0) && (
            <div className="mb-6">
              <h4 className="font-medium mb-2">Payment History</h4>
              <div className={`rounded-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'} overflow-hidden`}>
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className={darkMode ? 'bg-gray-800' : 'bg-gray-50'}>
                    <tr>
                      <th scope="col" className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider">
                        Date
                      </th>
                      <th scope="col" className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider">
                        Amount
                      </th>
                      <th scope="col" className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider">
                        Recorded By
                      </th>
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                    {[...(selectedLoan.payments || [])].reverse().map((payment, index) => (
                      <tr key={index} className={darkMode ? 'bg-gray-900' : 'bg-white'}>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">
                          {formatDate(payment.date)}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">
                          {formatCurrency(payment.amount)}
                        </td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm">
                          {payment.recordedBy}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {userRole === 'admin' && selectedLoan.status === 'active' && (
            <div className="mb-6">
              <h4 className="font-medium mb-2">Record Payment</h4>
              <form onSubmit={handlePaymentSubmit} className="flex gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>KES</span>
                  </div>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    min="0.01"
                    max={selectedLoan.remainingAmount}
                    className={`block w-full pl-12 pr-3 py-2 rounded-md ${
                      darkMode 
                        ? 'bg-gray-700 border-gray-600 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    } border focus:outline-none focus:ring-2 focus:ring-blue-500`}
                    required
                  />
                </div>
                <button
                  type="submit"
                  className={`px-4 py-2 rounded-md flex items-center ${
                    darkMode 
                      ? 'bg-blue-900 text-blue-100 hover:bg-blue-800' 
                      : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                  }`}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Record Payment
                </button>
              </form>
            </div>
          )}
          
          {userRole === 'admin' && selectedLoan.status === 'active' && (
            <div className="flex justify-end gap-3">
              <button
                onClick={() => updateLoanStatus(selectedLoan.id, 'defaulted')}
                className={`px-4 py-2 rounded-md flex items-center ${
                  darkMode 
                    ? 'bg-red-900 text-red-100 hover:bg-red-800' 
                    : 'bg-red-100 text-red-800 hover:bg-red-200'
                }`}
              >
                <X className="h-4 w-4 mr-2" />
                Mark as Defaulted
              </button>
              
              <button
                onClick={() => updateLoanStatus(selectedLoan.id, 'repaid', {
                  repaidAt: Timestamp.now(),
                  amountPaid: selectedLoan.amount,
                  remainingAmount: 0
                })}
                className={`px-4 py-2 rounded-md flex items-center ${
                  darkMode 
                    ? 'bg-green-900 text-green-100 hover:bg-green-800' 
                    : 'bg-green-100 text-green-800 hover:bg-green-200'
                }`}
              >
                <Check className="h-4 w-4 mr-2" />
                Mark as Fully Repaid
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
        <p className="mt-4">Loading loans...</p>
      </div>
    );
  }
  
  // Empty state
  if (loans.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center h-64 border rounded-lg ${
        darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-gray-50'
      }`}>
        <BanknoteIcon className={`h-12 w-12 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
        <p className="mt-4 text-lg font-medium">No loans found</p>
        <p className={`mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          {searchQuery || statusFilter !== 'all' 
            ? 'Try adjusting your search or filters' 
            : 'When loans are disbursed, they will appear here'}
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
                  Amount
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Start Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Due Date
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Progress
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
              {loans.map((loan) => {
                const progress = calculateProgress(loan);
                
                return (
                  <tr key={loan.id} className={darkMode ? 'bg-gray-900' : 'bg-white'}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium">{loan.farmerName}</div>
                      <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        ID: {loan.farmerID}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium">{formatCurrency(loan.amount)}</div>
                      {loan.interestRate && (
                        <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {loan.interestRate}% interest
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">{formatDate(loan.startDate)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">{formatDate(loan.dueDate)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mr-2">
                          <div 
                            className={`${progress === 100 ? 'bg-green-500' : 'bg-blue-500'} h-2 rounded-full`} 
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-xs">{progress}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {renderStatusBadge(loan.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <div className="flex justify-end space-x-2">
                        <button 
                          onClick={() => handleViewDetails(loan)}
                          className={`p-1 rounded-full ${
                            darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'
                          }`}
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        
                        {userRole === 'admin' && loan.status === 'active' && (
                          <>
                            <button 
                              onClick={() => handleViewDetails(loan)}
                              className={`p-1 rounded-full ${
                                darkMode ? 'hover:bg-blue-900 text-blue-400' : 'hover:bg-blue-100 text-blue-600'
                              }`}
                              title="Record Payment"
                            >
                              <DollarSign className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      
      {renderDetailsModal()}
    </>
  );
};

LoansView.propTypes = {
  darkMode: PropTypes.bool.isRequired,
  userRole: PropTypes.string.isRequired,
  searchQuery: PropTypes.string.isRequired,
  statusFilter: PropTypes.string.isRequired,
  sortField: PropTypes.string.isRequired,
  sortDirection: PropTypes.string.isRequired
};

export default LoansView; 