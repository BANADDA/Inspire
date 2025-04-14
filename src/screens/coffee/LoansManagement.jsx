import { addDoc, collection, doc, getDocs, orderBy, query, updateDoc, where } from 'firebase/firestore';
import {
  AlertCircle,
  Building,
  Calendar,
  Check,
  ChevronDown,
  Clock,
  CreditCard,
  DollarSign,
  Download,
  FileText,
  Filter,
  Phone,
  PieChart,
  Plus,
  RefreshCw,
  Search,
  User,
  Wallet,
  X
} from 'lucide-react';
import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase/firebase';

const LoansManagement = ({ darkMode, userRole }) => {
  const { user } = useAuth();
  const [loans, setLoans] = useState([]);
  const [filteredLoans, setFilteredLoans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortField, setSortField] = useState('requestDate');
  const [sortDirection, setSortDirection] = useState('desc');
  const [farmers, setFarmers] = useState([]);
  const [cooperatives, setCooperatives] = useState([]);
  const [isLoadingOrganizations, setIsLoadingOrganizations] = useState(false);
  
  // Stats
  const [stats, setStats] = useState({
    totalLoans: 0,
    activeLoans: 0,
    totalAmount: 0,
    totalDisbursed: 0,
    totalRepaid: 0,
    averageInterestRate: 0,
    defaultRate: 0
  });

  // Add new state variables for modals and selected loan
  const [showLoanDetailsModal, setShowLoanDetailsModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentNote, setPaymentNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add a new state variable for the new loan modal
  const [showNewLoanModal, setShowNewLoanModal] = useState(false);
  const [newLoan, setNewLoan] = useState({
    borrowerId: '',
    borrowerType: 'farmer',
    amount: '',
    interestRate: '5',
    purpose: '',
    otherPurpose: '',
    dueDate: new Date(new Date().setMonth(new Date().getMonth() + 6)).toISOString().split('T')[0],
    notes: ''
  });

  // Add fields for approval details
  const [approvalDetails, setApprovalDetails] = useState({
    disbursementMethod: 'bank_transfer',
    accountDetails: '',
    disbursementNotes: ''
  });

  // Fetch loans data
  const fetchLoans = async () => {
    setIsLoading(true);
    try {
      let q = query(collection(db, "loans"), orderBy(sortField, sortDirection));
      
      if (statusFilter !== 'all') {
        q = query(collection(db, "loans"), where("status", "==", statusFilter), orderBy(sortField, sortDirection));
      }
      
      const querySnapshot = await getDocs(q);
      const loansData = [];
      querySnapshot.forEach((doc) => {
        loansData.push({ id: doc.id, ...doc.data() });
      });
      
      // Calculate stats
      const totalLoans = loansData.length;
      const activeLoans = loansData.filter(loan => loan.status === 'active').length;
      const totalAmount = loansData.reduce((sum, loan) => sum + (loan.amount || 0), 0);
      const totalDisbursed = loansData.reduce((sum, loan) => sum + (loan.disbursedAmount || 0), 0);
      const totalRepaid = loansData.reduce((sum, loan) => sum + (loan.repaidAmount || 0), 0);
      
      // Calculate average interest rate
      const totalInterestRate = loansData.reduce((sum, loan) => sum + (loan.interestRate || 0), 0);
      const averageInterestRate = totalLoans > 0 ? totalInterestRate / totalLoans : 0;
      
      // Calculate default rate
      const defaultedLoans = loansData.filter(loan => loan.status === 'defaulted').length;
      const defaultRate = totalLoans > 0 ? (defaultedLoans / totalLoans) * 100 : 0;
      
      setStats({
        totalLoans,
        activeLoans,
        totalAmount,
        totalDisbursed,
        totalRepaid,
        averageInterestRate,
        defaultRate
      });
      
      setLoans(loansData);
      setFilteredLoans(loansData);
    } catch (error) {
      console.error("Error fetching loans:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch farmers and organizations for reference
  const fetchFarmersAndCooperatives = async () => {
    try {
      // Fetch farmers
      const farmersSnapshot = await getDocs(collection(db, "farmers"));
      const farmersData = [];
      farmersSnapshot.forEach((doc) => {
        farmersData.push({ id: doc.id, ...doc.data() });
      });
      setFarmers(farmersData);
      
      // Fetch organizations (default - no filter)
      await fetchOrganizations();
    } catch (error) {
      console.error("Error fetching farmers and organizations:", error);
    }
  };
  
  // Fetch organizations with optional filtering
  const fetchOrganizations = async (filterByCurrentUser = false) => {
    setIsLoadingOrganizations(true);
    try {
      // Create queries for both collections based on filter criteria
      let coopsQuery, saccosQuery;
      
      if (filterByCurrentUser && user) {
        // Filter organizations created by the current user
        coopsQuery = query(
          collection(db, "cooperatives"),
          where("createdBy", "==", user.uid),
          orderBy("name", "asc")
        );
        
        saccosQuery = query(
          collection(db, "saccos"),
          where("createdBy", "==", user.uid),
          orderBy("name", "asc")
        );
      } else {
        // Get all organizations
        coopsQuery = query(
          collection(db, "cooperatives"),
          orderBy("name", "asc")
        );
        
        saccosQuery = query(
          collection(db, "saccos"),
          orderBy("name", "asc")
        );
      }
      
      // Fetch cooperatives
      const coopsSnapshot = await getDocs(coopsQuery);
      const coopsData = coopsSnapshot.docs.map(doc => ({
        id: doc.id,
        type: 'cooperative',
        ...doc.data()
      }));
      
      // Fetch SACCOs
      const saccosSnapshot = await getDocs(saccosQuery);
      const saccosData = saccosSnapshot.docs.map(doc => ({
        id: doc.id,
        type: 'sacco',
        ...doc.data()
      }));
      
      // Combine both types of organizations
      const organizationsData = [...coopsData, ...saccosData];
      
      setCooperatives(organizationsData);
    } catch (error) {
      console.error("Error fetching organizations:", error);
    } finally {
      setIsLoadingOrganizations(false);
    }
  };

  useEffect(() => {
    fetchLoans();
    fetchFarmersAndCooperatives();
  }, [sortField, sortDirection, statusFilter]);

  // Filter loans based on search query
  useEffect(() => {
    if (loans.length === 0) return;

    let filtered = [...loans];
    
    if (searchQuery.trim() !== '') {
      filtered = filtered.filter(loan => 
        loan.loanId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        loan.borrowerId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        loan.borrowerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        loan.creditOfficer?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    setFilteredLoans(filtered);
  }, [searchQuery, loans]);

  // Handle sort change
  const handleSort = (field) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount || 0);
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

  // Calculate loan progress
  const calculateProgress = (loan) => {
    if (!loan.amount || loan.amount === 0) return 0;
    return (loan.repaidAmount || 0) / loan.amount * 100;
  };

  // Get the borrower name from the ID
  const getBorrowerName = (borrowerId, borrowerType) => {
    if (borrowerType === 'farmer') {
      const farmer = farmers.find(f => f.id === borrowerId);
      return farmer ? `${farmer.firstName} ${farmer.lastName}` : 'Unknown Farmer';
    } else if (borrowerType === 'organization') {
      const organization = cooperatives.find(c => c.id === borrowerId);
      return organization ? organization.name : 'Unknown Organization';
    }
    return 'Unknown';
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'defaulted':
        return 'bg-red-100 text-red-800';
      case 'denied':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <Check className="h-4 w-4 text-green-500" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'completed':
        return <Check className="h-4 w-4 text-blue-500" />;
      case 'defaulted':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'denied':
        return <X className="h-4 w-4 text-gray-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  // Get borrower type icon
  const getBorrowerTypeIcon = (type) => {
    return type === 'farmer' 
      ? <User className="h-4 w-4 text-blue-500" /> 
      : <Building className="h-4 w-4 text-purple-500" />;
  };

  // Handle view loan details
  const handleViewLoanDetails = (loan) => {
    setSelectedLoan(loan);
    setShowLoanDetailsModal(true);
  };
  
  // Handle open payment modal
  const handleOpenPaymentModal = (loan) => {
    setSelectedLoan(loan);
    setPaymentAmount('');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentMethod('cash');
    setPaymentNote('');
    setShowPaymentModal(true);
  };
  
  // Handle open approval modal
  const handleOpenApprovalModal = (loan) => {
    setSelectedLoan(loan);
    setShowApprovalModal(true);
  };
  
  // Handle record payment
  const handleRecordPayment = async () => {
    if (!selectedLoan || !paymentAmount || parseFloat(paymentAmount) <= 0) {
      alert('Please enter a valid payment amount');
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Calculate new repaid amount
      const amountPaid = parseFloat(paymentAmount);
      const newRepaidAmount = (selectedLoan.repaidAmount || 0) + amountPaid;
      const newStatus = newRepaidAmount >= selectedLoan.amount ? 'completed' : 'active';
      
      // Create payment record
      const paymentRecord = {
        loanId: selectedLoan.id,
        amount: amountPaid,
        date: new Date(paymentDate),
        method: paymentMethod,
        note: paymentNote,
        recordedBy: 'admin', // Replace with actual user ID
        timestamp: new Date()
      };
      
      // Add payment to payments collection
      await addDoc(collection(db, 'payments'), paymentRecord);
      
      // Update loan document
      await updateDoc(doc(db, 'loans', selectedLoan.id), {
        repaidAmount: newRepaidAmount,
        status: newStatus,
        lastPaymentDate: new Date(paymentDate),
        lastPaymentAmount: amountPaid,
        updatedAt: new Date()
      });
      
      // Close modal and refresh loans
      setShowPaymentModal(false);
      fetchLoans();
      
      alert('Payment recorded successfully!');
    } catch (error) {
      console.error('Error recording payment:', error);
      alert('Failed to record payment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle approve loan
  const handleApproveLoan = async () => {
    if (!selectedLoan) return;
    
    // Validate disbursement details
    if (!approvalDetails.accountDetails.trim()) {
      alert('Please enter account details for disbursement');
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Update loan status to active with disbursement details
      await updateDoc(doc(db, 'loans', selectedLoan.id), {
        status: 'active',
        approvalDate: new Date(),
        approvedBy: user?.uid || 'admin', // Use current user ID
        disbursementMethod: approvalDetails.disbursementMethod,
        accountDetails: approvalDetails.accountDetails,
        disbursementNotes: approvalDetails.disbursementNotes,
        updatedAt: new Date()
      });
      
      // Close modal and refresh loans
      setShowApprovalModal(false);
      // Reset approval details
      setApprovalDetails({
        disbursementMethod: 'bank_transfer',
        accountDetails: '',
        disbursementNotes: ''
      });
      fetchLoans();
      
      alert('Loan approved successfully!');
    } catch (error) {
      console.error('Error approving loan:', error);
      alert('Failed to approve loan. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle update loan status
  const handleUpdateLoanStatus = async (loanId, newStatus) => {
    if (!loanId || !newStatus) return;
    
    try {
      // Update loan status
      await updateDoc(doc(db, 'loans', loanId), {
        status: newStatus,
        updatedAt: new Date()
      });
      
      // Refresh loans
      fetchLoans();
      
      alert(`Loan status updated to ${newStatus} successfully!`);
    } catch (error) {
      console.error('Error updating loan status:', error);
      alert('Failed to update loan status. Please try again.');
    }
  };

  // Add a handler for opening the new loan modal after the getBorrowerTypeIcon function
  const handleOpenNewLoanModal = () => {
    setNewLoan({
      borrowerId: '',
      borrowerType: 'farmer',
      amount: '',
      interestRate: '5',
      purpose: '',
      otherPurpose: '',
      dueDate: new Date(new Date().setMonth(new Date().getMonth() + 6)).toISOString().split('T')[0],
      notes: ''
    });
    setShowNewLoanModal(true);
  };
  
  // Handle borrower type change
  const handleBorrowerTypeChange = (e) => {
    const newBorrowerType = e.target.value;
    
    // If switching to organization type, fetch user's organizations
    if (newBorrowerType === 'organization') {
      fetchOrganizations(true); // Filter by current user
    }
    
    // Update the borrower type in the form
    setNewLoan(prev => ({
      ...prev,
      borrowerType: newBorrowerType,
      borrowerId: '' // Reset the borrower ID when changing type
    }));
  };
  
  // Handle new loan input changes
  const handleNewLoanChange = (e) => {
    const { name, value } = e.target;
    
    // Special handling for borrower type
    if (name === 'borrowerType') {
      handleBorrowerTypeChange(e);
      return;
    }
    
    setNewLoan(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle submitting a new loan
  const handleSubmitNewLoan = async () => {
    if (!newLoan.borrowerId || !newLoan.amount || parseFloat(newLoan.amount) <= 0) {
      alert('Please select a borrower and enter a valid amount');
      return;
    }
    
    // Validate purpose if "Other" is selected
    if (newLoan.purpose === 'Other' && !newLoan.otherPurpose.trim()) {
      alert('Please specify the purpose of the loan');
      return;
    }
    
    setIsSubmitting(true);
    try {
      // Generate a unique loan ID
      const loanId = `LOAN-${Date.now().toString().slice(-6)}`;
      
      // Get borrower name based on borrower type
      let borrowerName = '';
      if (newLoan.borrowerType === 'farmer') {
        const farmer = farmers.find(f => f.id === newLoan.borrowerId);
        borrowerName = farmer ? (farmer.fullName || `${farmer.firstName || ''} ${farmer.lastName || ''}`.trim()) : 'Unknown Farmer';
      } else {
        const organization = cooperatives.find(c => c.id === newLoan.borrowerId);
        borrowerName = organization ? organization.name : 'Unknown Organization';
      }
      
      // Determine the final purpose value
      const finalPurpose = newLoan.purpose === 'Other' ? newLoan.otherPurpose : newLoan.purpose;
      
      // Create loan document
      const loanData = {
        loanId,
        borrowerId: newLoan.borrowerId,
        borrowerType: newLoan.borrowerType,
        borrowerName,
        amount: parseFloat(newLoan.amount),
        interestRate: parseFloat(newLoan.interestRate),
        purpose: finalPurpose,
        requestDate: new Date(),
        dueDate: new Date(newLoan.dueDate),
        status: 'pending',
        repaidAmount: 0,
        notes: newLoan.notes,
        createdBy: 'admin', // Replace with actual user ID
        createdAt: new Date()
      };
      
      // Add to Firestore
      await addDoc(collection(db, 'loans'), loanData);
      
      // Close modal and refresh loans
      setShowNewLoanModal(false);
      fetchLoans();
      
      alert('Loan created successfully!');
    } catch (error) {
      console.error('Error creating loan:', error);
      alert('Failed to create loan. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`w-full h-full p-6 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className="flex flex-col h-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div className="flex items-center mb-4 md:mb-0">
            <Wallet className="mr-2 h-6 w-6 text-blue-500" />
            <h1 className="text-2xl font-bold">Coffee Loans Management</h1>
          </div>
          
          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
            <div className={`relative flex-grow md:w-64 ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-md`}>
              <input
                type="text"
                placeholder="Search loans..."
                className={`w-full pl-10 pr-4 py-2 rounded-md border ${
                  darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                }`}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={fetchLoans}
                className={`flex items-center px-3 py-2 rounded-md ${
                  darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-100'
                } border ${darkMode ? 'border-gray-700' : 'border-gray-300'}`}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                <span>Refresh</span>
              </button>
              
              <button 
                className={`flex items-center px-3 py-2 rounded-md ${
                  darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-100'
                } border ${darkMode ? 'border-gray-700' : 'border-gray-300'}`}
              >
                <Download className="h-4 w-4 mr-2" />
                <span>Export</span>
              </button>
              
              {userRole === 'admin' && (
                <button 
                  className={`flex items-center px-3 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white`}
                  onClick={handleOpenNewLoanModal}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  <span>New Loan</span>
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className={`p-4 rounded-lg border ${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-500">Total Loans</h3>
              <Wallet className="h-5 w-5 text-blue-500" />
            </div>
            <p className="text-2xl font-bold">{stats.totalLoans}</p>
            <p className="text-sm text-gray-500">
              {stats.activeLoans} active
            </p>
          </div>
          
          <div className={`p-4 rounded-lg border ${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-500">Total Amount</h3>
              <DollarSign className="h-5 w-5 text-green-500" />
            </div>
            <p className="text-2xl font-bold">{formatCurrency(stats.totalAmount)}</p>
            <p className="text-sm text-gray-500">
              {formatCurrency(stats.totalDisbursed)} disbursed
            </p>
          </div>
          
          <div className={`p-4 rounded-lg border ${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-500">Repayment Rate</h3>
              <PieChart className="h-5 w-5 text-purple-500" />
            </div>
            <p className="text-2xl font-bold">
              {stats.totalAmount > 0 
                ? ((stats.totalRepaid / stats.totalAmount) * 100).toFixed(1) + '%' 
                : '0%'}
            </p>
            <p className="text-sm text-gray-500">
              {formatCurrency(stats.totalRepaid)} repaid
            </p>
          </div>
          
          <div className={`p-4 rounded-lg border ${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-500">Default Rate</h3>
              <AlertCircle className="h-5 w-5 text-red-500" />
            </div>
            <p className="text-2xl font-bold">{stats.defaultRate.toFixed(1)}%</p>
            <p className="text-sm text-gray-500">
              Avg. interest: {stats.averageInterestRate.toFixed(1)}%
            </p>
          </div>
        </div>
        
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="relative">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center px-3 py-2 rounded-md ${
                darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-100'
              } border ${darkMode ? 'border-gray-700' : 'border-gray-300'}`}
            >
              <Filter className="h-4 w-4 mr-2" />
              <span>Filters</span>
              <ChevronDown className="h-4 w-4 ml-2" />
            </button>
            
            {showFilters && (
              <div className={`absolute top-12 left-0 w-64 p-4 rounded-md shadow-lg z-10 ${
                darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              } border`}>
                <h3 className="font-medium mb-2">Loan Status</h3>
                <div className="space-y-2">
                  <button 
                    onClick={() => setStatusFilter('all')}
                    className={`flex items-center w-full px-2 py-1 rounded ${
                      statusFilter === 'all' ? 'bg-blue-100 text-blue-700' : ''
                    }`}
                  >
                    <span>All Statuses</span>
                  </button>
                  <button 
                    onClick={() => setStatusFilter('active')}
                    className={`flex items-center w-full px-2 py-1 rounded ${
                      statusFilter === 'active' ? 'bg-blue-100 text-blue-700' : ''
                    }`}
                  >
                    <Check className="h-4 w-4 mr-2 text-green-500" />
                    <span>Active</span>
                  </button>
                  <button 
                    onClick={() => setStatusFilter('pending')}
                    className={`flex items-center w-full px-2 py-1 rounded ${
                      statusFilter === 'pending' ? 'bg-blue-100 text-blue-700' : ''
                    }`}
                  >
                    <Clock className="h-4 w-4 mr-2 text-yellow-500" />
                    <span>Pending</span>
                  </button>
                  <button 
                    onClick={() => setStatusFilter('completed')}
                    className={`flex items-center w-full px-2 py-1 rounded ${
                      statusFilter === 'completed' ? 'bg-blue-100 text-blue-700' : ''
                    }`}
                  >
                    <Check className="h-4 w-4 mr-2 text-blue-500" />
                    <span>Completed</span>
                  </button>
                  <button 
                    onClick={() => setStatusFilter('defaulted')}
                    className={`flex items-center w-full px-2 py-1 rounded ${
                      statusFilter === 'defaulted' ? 'bg-blue-100 text-blue-700' : ''
                    }`}
                  >
                    <AlertCircle className="h-4 w-4 mr-2 text-red-500" />
                    <span>Defaulted</span>
                  </button>
                </div>
                
                <h3 className="font-medium mb-2 mt-4">Sort by</h3>
                <div className="space-y-2">
                  <button 
                    onClick={() => handleSort('requestDate')}
                    className={`flex items-center justify-between w-full px-2 py-1 rounded ${
                      sortField === 'requestDate' ? 'bg-blue-100 text-blue-700' : ''
                    }`}
                  >
                    <span>Request Date</span>
                    {sortField === 'requestDate' && (
                      <ChevronDown className={`h-4 w-4 ${sortDirection === 'desc' ? 'transform rotate-180' : ''}`} />
                    )}
                  </button>
                  <button 
                    onClick={() => handleSort('amount')}
                    className={`flex items-center justify-between w-full px-2 py-1 rounded ${
                      sortField === 'amount' ? 'bg-blue-100 text-blue-700' : ''
                    }`}
                  >
                    <span>Amount</span>
                    {sortField === 'amount' && (
                      <ChevronDown className={`h-4 w-4 ${sortDirection === 'desc' ? 'transform rotate-180' : ''}`} />
                    )}
                  </button>
                  <button 
                    onClick={() => handleSort('dueDate')}
                    className={`flex items-center justify-between w-full px-2 py-1 rounded ${
                      sortField === 'dueDate' ? 'bg-blue-100 text-blue-700' : ''
                    }`}
                  >
                    <span>Due Date</span>
                    {sortField === 'dueDate' && (
                      <ChevronDown className={`h-4 w-4 ${sortDirection === 'desc' ? 'transform rotate-180' : ''}`} />
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <div className={`flex items-center gap-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            {statusFilter !== 'all' && (
              <p>Status: <span className="font-medium">{statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}</span></p>
            )}
            <p>Sort: <span className="font-medium">
              {sortField === 'requestDate' ? 'Request Date' : 
               sortField === 'amount' ? 'Amount' : 
               'Due Date'} ({sortDirection === 'asc' ? 'Oldest First' : 'Newest First'})
            </span></p>
          </div>
        </div>
        
        <div className="flex-grow overflow-auto">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
            </div>
          ) : filteredLoans.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64">
              <Wallet className="h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500 text-lg">No loans found</p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="mt-2 text-blue-500 hover:underline"
                >
                  Clear search
                </button>
              )}
              {statusFilter !== 'all' && (
                <button
                  onClick={() => setStatusFilter('all')}
                  className="mt-2 text-blue-500 hover:underline"
                >
                  View all statuses
                </button>
              )}
            </div>
          ) : (
            <div className={`rounded-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'} overflow-hidden`}>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className={darkMode ? 'bg-gray-800' : 'bg-gray-100'}>
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Loan ID
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Borrower
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Amount
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Dates
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Repayment
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${darkMode ? 'divide-gray-700 bg-gray-800' : 'divide-gray-200 bg-white'}`}>
                  {filteredLoans.map((loan) => (
                    <tr key={loan.id} className={darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <CreditCard className="h-4 w-4 mr-2 text-blue-500" />
                          <span>{loan.loanId || loan.id.substring(0, 8)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {getBorrowerTypeIcon(loan.borrowerType)}
                          <div className="ml-2">
                            <div className="text-sm font-medium">
                              {loan.borrowerName || getBorrowerName(loan.borrowerId, loan.borrowerType)}
                            </div>
                            <div className="text-xs text-gray-500">
                              {loan.borrowerType === 'farmer' ? 'Individual Farmer' : 'Cooperative'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium">{formatCurrency(loan.amount)}</div>
                        <div className="text-xs text-gray-500">
                          {loan.interestRate}% interest
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center text-xs text-gray-500">
                          <Calendar className="h-3 w-3 mr-1" />
                          <span>Start: {formatDate(loan.startDate || loan.approvalDate || loan.requestDate)}</span>
                        </div>
                        <div className="flex items-center text-xs text-gray-500 mt-1">
                          <Calendar className="h-3 w-3 mr-1" />
                          <span>Due: {formatDate(loan.dueDate)}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(loan.status)}`}>
                          <span className="flex items-center">
                            {getStatusIcon(loan.status)}
                            <span className="ml-1">{loan.status}</span>
                          </span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="w-full bg-gray-200 rounded-full h-2.5 mb-1">
                          <div 
                            className="bg-blue-600 h-2.5 rounded-full" 
                            style={{ width: `${calculateProgress(loan)}%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatCurrency(loan.repaidAmount || 0)} of {formatCurrency(loan.amount || 0)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex space-x-2">
                          <button className="text-blue-600 hover:text-blue-800" onClick={() => handleViewLoanDetails(loan)}>
                            <FileText className="h-4 w-4" />
                          </button>
                          {userRole === 'admin' && (
                            <>
                              <button 
                                className="text-green-600 hover:text-green-800"
                                onClick={() => handleOpenPaymentModal(loan)}
                                disabled={loan.status !== 'active' && loan.status !== 'pending'}
                              >
                                <DollarSign className="h-4 w-4" />
                              </button>
                              {loan.status === 'pending' && (
                                <button 
                                  className="text-blue-600 hover:text-blue-800"
                                  onClick={() => handleOpenApprovalModal(loan)}
                                >
                                  <Check className="h-4 w-4" />
                                </button>
                              )}
                              {loan.status === 'active' && (
                                <button 
                                  className="text-red-600 hover:text-red-800"
                                  onClick={() => {
                                    if (window.confirm('Mark this loan as defaulted?')) {
                                      handleUpdateLoanStatus(loan.id, 'defaulted');
                                    }
                                  }}
                                >
                                  <AlertCircle className="h-4 w-4" />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
      
      {/* Loan Details Modal */}
      {showLoanDetailsModal && selectedLoan && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity">
              <div className={`absolute inset-0 ${darkMode ? 'bg-gray-900' : 'bg-gray-500'} opacity-75`}></div>
            </div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            
            <div className={`inline-block align-bottom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}>
              <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Loan Details</h3>
                  <button
                    onClick={() => setShowLoanDetailsModal(false)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              
              <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Loan ID</p>
                    <p className="font-medium">{selectedLoan.loanId || selectedLoan.id}</p>
                  </div>
                  <div>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Status</p>
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(selectedLoan.status)}`}>
                      <span className="flex items-center">
                        {getStatusIcon(selectedLoan.status)}
                        <span className="ml-1 capitalize">{selectedLoan.status}</span>
                      </span>
                    </span>
                  </div>
                  <div>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Borrower</p>
                    <p className="font-medium">{selectedLoan.borrowerName || getBorrowerName(selectedLoan.borrowerId, selectedLoan.borrowerType)}</p>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {selectedLoan.borrowerType === 'farmer' ? 'Individual Farmer' : 'Cooperative'}
                    </p>
                  </div>
                  <div>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Loan Amount</p>
                    <p className="font-medium">{formatCurrency(selectedLoan.amount)}</p>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Interest Rate: {selectedLoan.interestRate}%
                    </p>
                  </div>
                  
                  {/* Display disbursement information if available */}
                  {selectedLoan.disbursementMethod && selectedLoan.accountDetails && (
                    <>
                      <div>
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Disbursement Method</p>
                        <p className="font-medium capitalize">{selectedLoan.disbursementMethod.replace('_', ' ')}</p>
                      </div>
                      <div>
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Account Details</p>
                        <p className="font-medium">{selectedLoan.accountDetails}</p>
                      </div>
                      {selectedLoan.disbursementNotes && (
                        <div className="col-span-2">
                          <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Disbursement Notes</p>
                          <p className="font-medium">{selectedLoan.disbursementNotes}</p>
                        </div>
                      )}
                    </>
                  )}
                  
                  {/* Dates */}
                  <div>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Request Date</p>
                    <p className="font-medium">{formatDate(selectedLoan.requestDate)}</p>
                  </div>
                  <div>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Approval Date</p>
                    <p className="font-medium">{selectedLoan.approvalDate ? formatDate(selectedLoan.approvalDate) : 'Not yet approved'}</p>
                  </div>
                  <div>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Start Date</p>
                    <p className="font-medium">{selectedLoan.startDate ? formatDate(selectedLoan.startDate) : 'Not started'}</p>
                  </div>
                  <div>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Due Date</p>
                    <p className="font-medium">{selectedLoan.dueDate ? formatDate(selectedLoan.dueDate) : 'Not set'}</p>
                  </div>
                  
                  {/* Repayment */}
                  <div className="col-span-2">
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Repayment Progress</p>
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2 mt-1">
                      <div 
                        className="bg-blue-600 h-2.5 rounded-full" 
                        style={{ width: `${calculateProgress(selectedLoan)}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between">
                      <p className="text-sm">
                        {formatCurrency(selectedLoan.repaidAmount || 0)} of {formatCurrency(selectedLoan.amount || 0)}
                      </p>
                      <p className="text-sm font-medium">
                        {calculateProgress(selectedLoan).toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  
                  {/* Last Payment */}
                  {selectedLoan.lastPaymentDate && (
                    <div className="col-span-2">
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Last Payment</p>
                      <p className="font-medium">
                        {formatCurrency(selectedLoan.lastPaymentAmount)} on {formatDate(selectedLoan.lastPaymentDate)}
                      </p>
                    </div>
                  )}
                  
                  {/* Purpose */}
                  {selectedLoan.purpose && (
                    <div className="col-span-2">
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Loan Purpose</p>
                      <p className="font-medium">{selectedLoan.purpose}</p>
                    </div>
                  )}
                  
                  {/* Notes */}
                  {selectedLoan.notes && (
                    <div className="col-span-2">
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Notes</p>
                      <p className="font-medium">{selectedLoan.notes}</p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className={`px-6 py-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex justify-end`}>
                <button
                  onClick={() => setShowLoanDetailsModal(false)}
                  className={`px-4 py-2 rounded ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
                >
                  Close
                </button>
                
                {userRole === 'admin' && selectedLoan.status === 'active' && (
                  <button
                    onClick={() => {
                      setShowLoanDetailsModal(false);
                      handleOpenPaymentModal(selectedLoan);
                    }}
                    className="ml-3 px-4 py-2 rounded bg-green-600 hover:bg-green-700 text-white"
                  >
                    Record Payment
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Payment Modal */}
      {showPaymentModal && selectedLoan && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity">
              <div className={`absolute inset-0 ${darkMode ? 'bg-gray-900' : 'bg-gray-500'} opacity-75`}></div>
            </div>
            
            <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>
            
            <div className={`inline-block align-bottom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}>
              <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">Record Loan Payment</h3>
                  <button
                    onClick={() => setShowPaymentModal(false)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              
              <div className="px-6 py-4">
                <div className="mb-4">
                  <h4 className="text-sm font-medium mb-2">Loan Information</h4>
                  <div className={`p-3 rounded ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                    <div className="flex justify-between mb-1">
                      <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Borrower:</span>
                      <span>{selectedLoan.borrowerName || getBorrowerName(selectedLoan.borrowerId, selectedLoan.borrowerType)}</span>
                    </div>
                    <div className="flex justify-between mb-1">
                      <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Loan Amount:</span>
                      <span>{formatCurrency(selectedLoan.amount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Amount Due:</span>
                      <span>{formatCurrency((selectedLoan.amount || 0) - (selectedLoan.repaidAmount || 0))}</span>
                    </div>
                  </div>
                </div>
                
                <form className="space-y-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Payment Amount (UGX)*
                    </label>
                    <div className="relative">
                      <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        <DollarSign className="h-4 w-4" />
                      </div>
                      <input
                        type="number"
                        value={paymentAmount}
                        onChange={(e) => setPaymentAmount(e.target.value)}
                        placeholder="0.00"
                        className={`block w-full pl-10 pr-3 py-2 rounded-md ${
                          darkMode 
                            ? 'bg-gray-700 border-gray-600 placeholder-gray-400' 
                            : 'border-gray-300 placeholder-gray-400'
                        } border`}
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Payment Date
                    </label>
                    <input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className={`block w-full px-3 py-2 rounded-md ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600' 
                          : 'border-gray-300'
                      } border`}
                    />
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Payment Method
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className={`block w-full px-3 py-2 rounded-md ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600' 
                          : 'border-gray-300'
                      } border`}
                    >
                      <option value="cash">Cash</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="mobile_money">Mobile Money</option>
                      <option value="harvest_offset">Harvest Offset</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Note
                    </label>
                    <textarea
                      value={paymentNote}
                      onChange={(e) => setPaymentNote(e.target.value)}
                      rows="2"
                      className={`block w-full px-3 py-2 rounded-md ${
                        darkMode 
                          ? 'bg-gray-700 border-gray-600 placeholder-gray-400' 
                          : 'border-gray-300 placeholder-gray-400'
                      } border`}
                      placeholder="Optional payment note"
                    />
                  </div>
                </form>
              </div>
              
              <div className={`px-6 py-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex justify-end`}>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className={`px-4 py-2 rounded ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'}`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleRecordPayment}
                  disabled={isSubmitting || !paymentAmount || parseFloat(paymentAmount) <= 0}
                  className={`ml-3 px-4 py-2 rounded bg-green-600 hover:bg-green-700 text-white ${
                    (isSubmitting || !paymentAmount || parseFloat(paymentAmount) <= 0) ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  {isSubmitting ? 'Recording...' : 'Record Payment'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Loan Approval Modal */}
      {showApprovalModal && selectedLoan && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 backdrop-blur-sm transition-opacity">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div className={`relative max-w-xl w-full rounded-xl shadow-2xl transform transition-all ${
              darkMode 
                ? 'bg-gray-800 text-white border border-gray-700' 
                : 'bg-white text-gray-900 border border-gray-200'
            }`}>
              <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Check className="h-5 w-5 text-green-500 mr-2" />
                    <h3 className="text-xl font-medium">Approve Loan</h3>
                  </div>
                  <button
                    onClick={() => setShowApprovalModal(false)}
                    className={`rounded-full p-1 ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} transition-colors`}
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              
              <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">
                <div className="mb-5">
                  <h4 className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Loan Information</h4>
                  <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                    <div className="flex justify-between mb-2">
                      <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Borrower:</span>
                      <span className="font-medium">{selectedLoan.borrowerName || getBorrowerName(selectedLoan.borrowerId, selectedLoan.borrowerType)}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Loan ID:</span>
                      <span className="font-medium">{selectedLoan.loanId || selectedLoan.id.substring(0, 8)}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Loan Amount:</span>
                      <span className="font-medium">{formatCurrency(selectedLoan.amount)}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Interest Rate:</span>
                      <span className="font-medium">{selectedLoan.interestRate}%</span>
                    </div>
                    {selectedLoan.purpose && (
                      <div className="flex justify-between mb-2">
                        <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Purpose:</span>
                        <span className="font-medium">{selectedLoan.purpose}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Due Date:</span>
                      <span className="font-medium">{formatDate(selectedLoan.dueDate)}</span>
                    </div>
                  </div>
                </div>
                
                <div className="mb-5">
                  <h4 className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Disbursement Details</h4>
                  
                  <div className="space-y-4">
                    {/* Disbursement Method */}
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Disbursement Method*
                      </label>
                      <div className="relative rounded-md shadow-sm">
                        <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          <Wallet className="h-4 w-4 text-green-500" />
                        </div>
                        <select
                          value={approvalDetails.disbursementMethod}
                          onChange={(e) => setApprovalDetails({...approvalDetails, disbursementMethod: e.target.value})}
                          className={`block w-full pl-10 pr-3 py-2.5 rounded-md ${
                            darkMode 
                              ? 'bg-gray-700 border-gray-600 focus:ring-blue-500 focus:border-blue-500' 
                              : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                          } border text-sm transition-colors`}
                        >
                          <option value="bank_transfer">Bank Transfer</option>
                          <option value="mobile_money">Mobile Money</option>
                          <option value="cash">Cash</option>
                          <option value="cheque">Cheque</option>
                          <option value="input_voucher">Input Voucher</option>
                        </select>
                      </div>
                    </div>
                    
                    {/* Account Details */}
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Account Details* {approvalDetails.disbursementMethod === 'bank_transfer' ? '(Bank Account Number)' : 
                                        approvalDetails.disbursementMethod === 'mobile_money' ? '(Mobile Number)' : 
                                        '(Recipient Details)'}
                      </label>
                      <div className="relative rounded-md shadow-sm">
                        <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {approvalDetails.disbursementMethod === 'bank_transfer' ? 
                            <Building className="h-4 w-4 text-blue-500" /> : 
                            approvalDetails.disbursementMethod === 'mobile_money' ? 
                            <Phone className="h-4 w-4 text-purple-500" /> : 
                            <User className="h-4 w-4 text-amber-500" />}
                        </div>
                        <input
                          type="text"
                          value={approvalDetails.accountDetails}
                          onChange={(e) => setApprovalDetails({...approvalDetails, accountDetails: e.target.value})}
                          placeholder={approvalDetails.disbursementMethod === 'bank_transfer' ? 'Enter bank account number' : 
                                      approvalDetails.disbursementMethod === 'mobile_money' ? 'Enter mobile number' : 
                                      'Enter recipient details'}
                          className={`block w-full pl-10 pr-3 py-2.5 rounded-md ${
                            darkMode 
                              ? 'bg-gray-700 border-gray-600 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500' 
                              : 'border-gray-300 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500'
                          } border text-sm transition-colors`}
                          required
                        />
                      </div>
                    </div>
                    
                    {/* Disbursement Notes */}
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Additional Notes
                      </label>
                      <div className="relative rounded-md shadow-sm">
                        <textarea
                          value={approvalDetails.disbursementNotes}
                          onChange={(e) => setApprovalDetails({...approvalDetails, disbursementNotes: e.target.value})}
                          rows="2"
                          placeholder="Any additional notes about disbursement"
                          className={`block w-full px-3 py-2.5 rounded-md ${
                            darkMode 
                              ? 'bg-gray-700 border-gray-600 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500' 
                              : 'border-gray-300 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500'
                          } border text-sm transition-colors`}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className={`p-4 rounded-lg ${darkMode ? 'bg-blue-900/20 border border-blue-800/30' : 'bg-blue-50 border border-blue-100'}`}>
                  <p className={`text-sm ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                    Approving this loan will mark it as active and record the disbursement details for processing.
                  </p>
                </div>
              </div>
              
              <div className={`px-6 py-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex justify-end items-center gap-3`}>
                <button
                  onClick={() => setShowApprovalModal(false)}
                  className={`px-4 py-2 rounded-md ${
                    darkMode 
                      ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                  } transition-colors text-sm font-medium`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleApproveLoan}
                  disabled={isSubmitting || !approvalDetails.accountDetails.trim()}
                  className={`px-4 py-2 rounded-md flex items-center ${
                    (isSubmitting || !approvalDetails.accountDetails.trim()) 
                      ? 'bg-blue-500 opacity-50 cursor-not-allowed' 
                      : 'bg-blue-600 hover:bg-blue-700'
                  } text-white transition-colors text-sm font-medium`}
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Approving...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Approve Loan
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Loan Modal */}
      {showNewLoanModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 backdrop-blur-sm transition-opacity">
          <div className="flex items-center justify-center min-h-screen p-4">
            <div 
              className={`relative max-w-xl w-full rounded-xl shadow-2xl transform transition-all ${
                darkMode 
                  ? 'bg-gray-800 text-white border border-gray-700' 
                  : 'bg-white text-gray-900 border border-gray-200'
              }`}
            >
              {/* Header */}
              <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <CreditCard className="h-5 w-5 text-blue-500 mr-2" />
                    <h3 className="text-xl font-medium">Create New Loan</h3>
                  </div>
                  <button
                    onClick={() => setShowNewLoanModal(false)}
                    className={`rounded-full p-1 ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'} transition-colors`}
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
              
              {/* Body */}
              <div className="px-6 py-5 max-h-[70vh] overflow-y-auto">
                <form className="space-y-5">
                  {/* Borrower Type */}
                  <div className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700/50' : 'bg-gray-50'}`}>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Borrower Type*
                    </label>
                    <div className="flex space-x-6">
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          name="borrowerType"
                          value="farmer"
                          checked={newLoan.borrowerType === 'farmer'}
                          onChange={handleNewLoanChange}
                          className={`h-4 w-4 ${darkMode ? 'text-blue-500' : 'text-blue-600'}`}
                        />
                        <span className="ml-2 flex items-center">
                          <User className="h-4 w-4 mr-1 text-blue-500" />
                          Farmer
                        </span>
                      </label>
                      <label className="inline-flex items-center">
                        <input
                          type="radio"
                          name="borrowerType"
                          value="organization"
                          checked={newLoan.borrowerType === 'organization'}
                          onChange={handleNewLoanChange}
                          className={`h-4 w-4 ${darkMode ? 'text-blue-500' : 'text-blue-600'}`}
                        />
                        <span className="ml-2 flex items-center">
                          <Building className="h-4 w-4 mr-1 text-purple-500" />
                          Organization
                        </span>
                      </label>
                    </div>
                  </div>
                  
                  {/* Borrower Selection */}
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Borrower*
                    </label>
                    <div className={`relative rounded-md shadow-sm`}>
                      <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none`}>
                        {newLoan.borrowerType === 'farmer' 
                          ? <User className="h-4 w-4 text-blue-500" /> 
                          : <Building className="h-4 w-4 text-purple-500" />}
                      </div>
                      {isLoadingOrganizations && newLoan.borrowerType === 'organization' ? (
                        <div className={`block w-full pl-10 pr-3 py-2.5 rounded-md ${
                          darkMode 
                            ? 'bg-gray-700 border-gray-600' 
                            : 'border-gray-300'
                        } border text-sm flex items-center`}>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          <span>Loading your organizations...</span>
                        </div>
                      ) : (
                        <select
                          name="borrowerId"
                          value={newLoan.borrowerId}
                          onChange={handleNewLoanChange}
                          className={`block w-full pl-10 pr-3 py-2.5 rounded-md ${
                            darkMode 
                              ? 'bg-gray-700 border-gray-600 focus:ring-blue-500 focus:border-blue-500' 
                              : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                          } border text-sm transition-colors`}
                          required
                        >
                          <option value="">Select a {newLoan.borrowerType}</option>
                          {newLoan.borrowerType === 'farmer' ? (
                            farmers.map(farmer => (
                              <option key={farmer.id} value={farmer.id}>
                                {farmer.fullName || `${farmer.firstName || ''} ${farmer.lastName || ''}`.trim()}
                              </option>
                            ))
                          ) : (
                            cooperatives.length > 0 ? (
                              cooperatives.map(org => (
                                <option key={org.id} value={org.id}>
                                  {org.name}
                                </option>
                              ))
                            ) : (
                              <option value="" disabled>No organizations found</option>
                            )
                          )}
                        </select>
                      )}
                    </div>
                    {newLoan.borrowerType === 'organization' && cooperatives.length === 0 && !isLoadingOrganizations && (
                      <p className={`mt-2 text-sm ${darkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                        No organizations found. Please register an organization first.
                      </p>
                    )}
                  </div>
                  
                  {/* Loan Amount */}
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Loan Amount (UGX)*
                    </label>
                    <div className="relative rounded-md shadow-sm">
                      <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        <DollarSign className="h-4 w-4 text-green-500" />
                      </div>
                      <input
                        type="number"
                        name="amount"
                        value={newLoan.amount}
                        onChange={handleNewLoanChange}
                        placeholder="0.00"
                        className={`block w-full pl-10 pr-3 py-2.5 rounded-md ${
                          darkMode 
                            ? 'bg-gray-700 border-gray-600 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500' 
                            : 'border-gray-300 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500'
                        } border text-sm transition-colors`}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Interest Rate */}
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Interest Rate (%)
                      </label>
                      <div className="relative rounded-md shadow-sm">
                        <input
                          type="number"
                          name="interestRate"
                          value={newLoan.interestRate}
                          onChange={handleNewLoanChange}
                          min="0"
                          max="100"
                          step="0.1"
                          className={`block w-full px-3 py-2.5 rounded-md ${
                            darkMode 
                              ? 'bg-gray-700 border-gray-600 focus:ring-blue-500 focus:border-blue-500' 
                              : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                          } border text-sm transition-colors`}
                        />
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                          <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>%</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Due Date */}
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Due Date
                      </label>
                      <div className="relative rounded-md shadow-sm">
                        <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          <Calendar className="h-4 w-4 text-blue-500" />
                        </div>
                        <input
                          type="date"
                          name="dueDate"
                          value={newLoan.dueDate}
                          onChange={handleNewLoanChange}
                          className={`block w-full pl-10 pr-3 py-2.5 rounded-md ${
                            darkMode 
                              ? 'bg-gray-700 border-gray-600 focus:ring-blue-500 focus:border-blue-500' 
                              : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                          } border text-sm transition-colors`}
                        />
                      </div>
                    </div>
                  </div>
                  
                  {/* Purpose */}
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Purpose
                    </label>
                    <div className="relative rounded-md shadow-sm">
                      <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        <FileText className="h-4 w-4 text-blue-500" />
                      </div>
                      <select
                        name="purpose"
                        value={newLoan.purpose}
                        onChange={handleNewLoanChange}
                        className={`block w-full pl-10 pr-3 py-2.5 rounded-md ${
                          darkMode 
                            ? 'bg-gray-700 border-gray-600 focus:ring-blue-500 focus:border-blue-500' 
                            : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                        } border text-sm transition-colors`}
                      >
                        <option value="">Select purpose (optional)</option>
                        <option value="Farm Inputs">Farm Inputs</option>
                        <option value="Equipment Purchase">Equipment Purchase</option>
                        <option value="Processing">Processing</option>
                        <option value="Expansion">Farm Expansion</option>
                        <option value="Working Capital">Working Capital</option>
                        <option value="Transportation">Transportation</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                  
                  {/* Custom Purpose Field (shown only when "Other" is selected) */}
                  {newLoan.purpose === 'Other' && (
                    <div>
                      <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Specify Purpose*
                      </label>
                      <div className="relative rounded-md shadow-sm">
                        <div className={`absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          <FileText className="h-4 w-4 text-amber-500" />
                        </div>
                        <input
                          type="text"
                          name="otherPurpose"
                          value={newLoan.otherPurpose}
                          onChange={handleNewLoanChange}
                          placeholder="Please specify the purpose of the loan"
                          className={`block w-full pl-10 pr-3 py-2.5 rounded-md ${
                            darkMode 
                              ? 'bg-gray-700 border-gray-600 placeholder-gray-400 focus:ring-amber-500 focus:border-amber-500' 
                              : 'border-gray-300 placeholder-gray-400 focus:ring-amber-500 focus:border-amber-500'
                          } border text-sm transition-colors`}
                          required
                        />
                      </div>
                    </div>
                  )}
                  
                  {/* Notes */}
                  <div>
                    <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Notes
                    </label>
                    <div className="relative rounded-md shadow-sm">
                      <textarea
                        name="notes"
                        value={newLoan.notes}
                        onChange={handleNewLoanChange}
                        rows="3"
                        className={`block w-full px-3 py-2.5 rounded-md ${
                          darkMode 
                            ? 'bg-gray-700 border-gray-600 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500' 
                            : 'border-gray-300 placeholder-gray-400 focus:ring-blue-500 focus:border-blue-500'
                        } border text-sm transition-colors`}
                        placeholder="Additional notes about this loan"
                      />
                    </div>
                  </div>
                </form>
              </div>
              
              {/* Footer */}
              <div className={`px-6 py-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex justify-end items-center gap-3`}>
                <button
                  onClick={() => setShowNewLoanModal(false)}
                  className={`px-4 py-2 rounded-md ${
                    darkMode 
                      ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                  } transition-colors text-sm font-medium`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitNewLoan}
                  disabled={isSubmitting || !newLoan.borrowerId || !newLoan.amount || parseFloat(newLoan.amount) <= 0}
                  className={`px-4 py-2 rounded-md flex items-center ${
                    (isSubmitting || !newLoan.borrowerId || !newLoan.amount || parseFloat(newLoan.amount) <= 0) 
                      ? 'bg-blue-500 opacity-50 cursor-not-allowed' 
                      : 'bg-blue-600 hover:bg-blue-700'
                  } text-white transition-colors text-sm font-medium`}
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Create Loan
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

LoansManagement.propTypes = {
  darkMode: PropTypes.bool.isRequired,
  userRole: PropTypes.string.isRequired
};

export default LoansManagement; 