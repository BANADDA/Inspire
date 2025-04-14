import { addDoc, collection, doc, getDocs, orderBy, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import {
  ArrowUpDown,
  CheckCircle,
  ChevronDown,
  Clock,
  Coffee,
  DollarSign,
  Download,
  FileText,
  Filter,
  Plus,
  RefreshCw,
  Search,
  User,
  X
} from 'lucide-react';
import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { db } from '../../firebase/firebase';

const HarvestsManagement = ({ darkMode, userRole }) => {
  const [harvests, setHarvests] = useState([]);
  const [filteredHarvests, setFilteredHarvests] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [seasonFilter, setSeasonFilter] = useState('all');
  const [sortField, setSortField] = useState('harvestDate');
  const [sortDirection, setSortDirection] = useState('desc');
  
  // Record Harvest modal state
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [farmers, setFarmers] = useState([]);
  const [loadingFarmers, setLoadingFarmers] = useState(false);
  const [newHarvest, setNewHarvest] = useState({
    farmerId: '',
    farmerName: '',
    coffeeType: 'Arabica',
    weight: '',
    harvestDate: new Date().toISOString().split('T')[0],
    farmLocation: '',
    season: new Date().getFullYear() + '-main',
    moisture: '',
    processingMethod: 'wet',
    status: 'pending',
    grade: '',
    pricePerKg: '',
    totalValue: 0,
    notes: ''
  });

  // Add these new states for view/edit modals
  const [showViewModal, setShowViewModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedHarvest, setSelectedHarvest] = useState(null);

  // Fetch farmers for dropdown
  useEffect(() => {
    const fetchFarmers = async () => {
      setLoadingFarmers(true);
      try {
        const farmersRef = collection(db, 'farmers');
        const farmersQuery = query(farmersRef, orderBy('fullName', 'asc'));
        const querySnapshot = await getDocs(farmersQuery);
        
        const farmersData = [];
        querySnapshot.forEach((doc) => {
          farmersData.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        setFarmers(farmersData);
      } catch (error) {
        console.error("Error fetching farmers:", error);
        toast.error("Failed to load farmers list");
      } finally {
        setLoadingFarmers(false);
      }
    };
    
    // Only fetch farmers when modal is shown
    if (showRecordModal) {
      fetchFarmers();
    }
  }, [showRecordModal]);

  // Fetch harvests
  const fetchHarvests = async () => {
    setIsLoading(true);
    try {
      let q = query(collection(db, "harvests"), orderBy(sortField, sortDirection));
      
      if (statusFilter !== 'all') {
        q = query(collection(db, "harvests"), where("status", "==", statusFilter), orderBy(sortField, sortDirection));
      }
      
      if (seasonFilter !== 'all') {
        q = query(collection(db, "harvests"), where("season", "==", seasonFilter), orderBy(sortField, sortDirection));
      }
      
      const querySnapshot = await getDocs(q);
      const harvestsData = [];
      querySnapshot.forEach((doc) => {
        harvestsData.push({ id: doc.id, ...doc.data() });
      });
      setHarvests(harvestsData);
      setFilteredHarvests(harvestsData);
    } catch (error) {
      console.error("Error fetching harvests:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHarvests();
  }, [sortField, sortDirection, statusFilter, seasonFilter]);

  // Filter harvests based on search query
  useEffect(() => {
    if (harvests.length === 0) return;

    let filtered = [...harvests];
    
    if (searchQuery.trim() !== '') {
      filtered = filtered.filter(harvest => 
        harvest.farmerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        harvest.harvestId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        harvest.farmLocation?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    setFilteredHarvests(filtered);
  }, [searchQuery, harvests]);

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
      currency: 'UGX',
      minimumFractionDigits: 0
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
  
  // Get status badge
  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return { icon: <Clock className="h-4 w-4 mr-1" />, class: 'bg-yellow-100 text-yellow-800' };
      case 'graded':
        return { icon: <ArrowUpDown className="h-4 w-4 mr-1" />, class: 'bg-blue-100 text-blue-800' };
      case 'paid':
        return { icon: <CheckCircle className="h-4 w-4 mr-1" />, class: 'bg-green-100 text-green-800' };
      default:
        return { icon: <Clock className="h-4 w-4 mr-1" />, class: 'bg-gray-100 text-gray-800' };
    }
  };
  
  // Get grade class
  const getGradeClass = (grade) => {
    switch (grade) {
      case 'A':
        return 'text-green-600 font-bold';
      case 'B':
        return 'text-blue-600 font-bold';
      case 'C':
        return 'text-yellow-600 font-bold';
      default:
        return 'text-gray-600';
    }
  };
  
  // Get summary stats
  const getHarvestStats = () => {
    let totalHarvests = harvests.length;
    let totalWeight = harvests.reduce((sum, harvest) => sum + (Number(harvest.weight) || 0), 0);
    let totalValue = harvests.reduce((sum, harvest) => sum + (Number(harvest.totalValue) || 0), 0);
    let pendingPayments = harvests.filter(harvest => harvest.status !== 'paid').reduce((sum, harvest) => sum + (Number(harvest.totalValue) || 0), 0);
    
    return { totalHarvests, totalWeight, totalValue, pendingPayments };
  };
  
  const stats = getHarvestStats();
  
  // Calculate progress toward loan repayment
  const calculateRepaymentProgress = (harvest) => {
    if (!harvest.loanAmount || harvest.loanAmount <= 0) return 100;
    const totalRepaid = harvest.totalValue || 0;
    const progress = Math.min(100, Math.round((totalRepaid / harvest.loanAmount) * 100));
    return progress;
  };

  // Handle farmer selection
  const handleFarmerSelect = (farmerId) => {
    const selectedFarmer = farmers.find(farmer => farmer.id === farmerId);
    
    if (selectedFarmer) {
      setNewHarvest(prev => ({
        ...prev,
        farmerId: selectedFarmer.id,
        farmerName: selectedFarmer.fullName || `${selectedFarmer.firstName || ''} ${selectedFarmer.lastName || ''}`.trim(),
        farmLocation: selectedFarmer.location?.address || selectedFarmer.district || ''
      }));
    }
  };

  // Handle form field changes
  const handleHarvestFormChange = (field, value) => {
    setNewHarvest(prev => {
      const updated = { ...prev, [field]: value };
      
      // Automatically calculate total value if both weight and price are present
      if ((field === 'weight' || field === 'pricePerKg') && updated.weight && updated.pricePerKg) {
        const weight = parseFloat(updated.weight) || 0;
        const price = parseFloat(updated.pricePerKg) || 0;
        updated.totalValue = weight * price;
      }
      
      return updated;
    });
  };

  // Save new harvest record
  const handleSaveHarvest = async () => {
    try {
      // Validate required fields
      if (!newHarvest.farmerId || !newHarvest.weight || !newHarvest.harvestDate) {
        toast.error("Please fill in all required fields");
        return;
      }
      
      // Create harvest record
      const harvestData = {
        ...newHarvest,
        weight: parseFloat(newHarvest.weight) || 0,
        moisture: parseFloat(newHarvest.moisture) || 0,
        pricePerKg: parseFloat(newHarvest.pricePerKg) || 0,
        totalValue: parseFloat(newHarvest.totalValue) || 0,
        harvestDate: new Date(newHarvest.harvestDate),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      // Add to Firestore
      await addDoc(collection(db, 'harvests'), harvestData);
      
      // Success message
      toast.success("Harvest record added successfully");
      
      // Reset form and close modal
      setNewHarvest({
        farmerId: '',
        farmerName: '',
        coffeeType: 'Arabica',
        weight: '',
        harvestDate: new Date().toISOString().split('T')[0],
        farmLocation: '',
        season: new Date().getFullYear() + '-main',
        moisture: '',
        processingMethod: 'wet',
        status: 'pending',
        grade: '',
        pricePerKg: '',
        totalValue: 0,
        notes: ''
      });
      setShowRecordModal(false);
      
      // Refresh harvests list
      fetchHarvests();
      
    } catch (error) {
      console.error("Error saving harvest:", error);
      toast.error("Failed to save harvest record");
    }
  };

  // Handle View button click
  const handleViewHarvest = (harvest) => {
    setSelectedHarvest(harvest);
    setShowViewModal(true);
  };

  // Handle Update button click
  const handleUpdateHarvest = (harvest) => {
    setSelectedHarvest({...harvest});
    setShowUpdateModal(true);
  };

  // Update harvest
  const handleUpdateHarvestSave = async () => {
    try {
      if (!selectedHarvest || !selectedHarvest.id) {
        toast.error("Invalid harvest record");
        return;
      }

      // Update Firestore document
      const harvestRef = doc(db, 'harvests', selectedHarvest.id);
      await updateDoc(harvestRef, {
        ...selectedHarvest,
        weight: parseFloat(selectedHarvest.weight) || 0,
        moisture: parseFloat(selectedHarvest.moisture) || 0,
        pricePerKg: parseFloat(selectedHarvest.pricePerKg) || 0,
        totalValue: parseFloat(selectedHarvest.totalValue) || 0,
        updatedAt: serverTimestamp()
      });

      toast.success("Harvest updated successfully");
      setShowUpdateModal(false);
      fetchHarvests(); // Refresh the list
    } catch (error) {
      console.error("Error updating harvest:", error);
      toast.error("Failed to update harvest");
    }
  };

  return (
    <div className={`w-full h-full p-6 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className="flex flex-col h-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div className="flex items-center mb-4 md:mb-0">
            <Coffee className="mr-2 h-6 w-6 text-green-500" />
            <h1 className="text-2xl font-bold">Coffee Harvests Management</h1>
          </div>
          
          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
            <div className={`relative flex-grow md:w-64 ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-md`}>
              <input
                type="text"
                placeholder="Search harvests..."
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
                onClick={fetchHarvests}
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
                  onClick={() => setShowRecordModal(true)}
                  className={`flex items-center px-3 py-2 rounded-md bg-green-600 hover:bg-green-700 text-white`}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  <span>Record Harvest</span>
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* Harvest Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className={`p-4 rounded-lg border ${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center mb-2">
              <Coffee className="h-5 w-5 text-green-500 mr-2" />
              <h3 className="font-medium">Total Harvests</h3>
            </div>
            <p className="text-2xl font-bold">{stats.totalHarvests}</p>
          </div>
          
          <div className={`p-4 rounded-lg border ${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center mb-2">
              <ArrowUpDown className="h-5 w-5 text-blue-500 mr-2" />
              <h3 className="font-medium">Total Weight</h3>
            </div>
            <p className="text-2xl font-bold">{stats.totalWeight.toLocaleString()} kg</p>
          </div>
          
          <div className={`p-4 rounded-lg border ${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center mb-2">
              <DollarSign className="h-5 w-5 text-green-500 mr-2" />
              <h3 className="font-medium">Total Value</h3>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(stats.totalValue)}</p>
          </div>
          
          <div className={`p-4 rounded-lg border ${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          }`}>
            <div className="flex items-center mb-2">
              <FileText className="h-5 w-5 text-yellow-500 mr-2" />
              <h3 className="font-medium">Pending Payments</h3>
            </div>
            <p className="text-2xl font-bold">{formatCurrency(stats.pendingPayments)}</p>
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
                <h3 className="font-medium mb-2">Payment Status</h3>
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
                    onClick={() => setStatusFilter('pending')}
                    className={`flex items-center w-full px-2 py-1 rounded ${
                      statusFilter === 'pending' ? 'bg-blue-100 text-blue-700' : ''
                    }`}
                  >
                    <span>Pending</span>
                  </button>
                  <button 
                    onClick={() => setStatusFilter('graded')}
                    className={`flex items-center w-full px-2 py-1 rounded ${
                      statusFilter === 'graded' ? 'bg-blue-100 text-blue-700' : ''
                    }`}
                  >
                    <span>Graded</span>
                  </button>
                  <button 
                    onClick={() => setStatusFilter('paid')}
                    className={`flex items-center w-full px-2 py-1 rounded ${
                      statusFilter === 'paid' ? 'bg-blue-100 text-blue-700' : ''
                    }`}
                  >
                    <span>Paid</span>
                  </button>
                </div>
                
                <h3 className="font-medium mb-2 mt-4">Season</h3>
                <div className="space-y-2">
                  <button 
                    onClick={() => setSeasonFilter('all')}
                    className={`flex items-center w-full px-2 py-1 rounded ${
                      seasonFilter === 'all' ? 'bg-blue-100 text-blue-700' : ''
                    }`}
                  >
                    <span>All Seasons</span>
                  </button>
                  <button 
                    onClick={() => setSeasonFilter('2023-main')}
                    className={`flex items-center w-full px-2 py-1 rounded ${
                      seasonFilter === '2023-main' ? 'bg-blue-100 text-blue-700' : ''
                    }`}
                  >
                    <span>2023 Main</span>
                  </button>
                  <button 
                    onClick={() => setSeasonFilter('2023-fly')}
                    className={`flex items-center w-full px-2 py-1 rounded ${
                      seasonFilter === '2023-fly' ? 'bg-blue-100 text-blue-700' : ''
                    }`}
                  >
                    <span>2023 Fly</span>
                  </button>
                  <button 
                    onClick={() => setSeasonFilter('2024-main')}
                    className={`flex items-center w-full px-2 py-1 rounded ${
                      seasonFilter === '2024-main' ? 'bg-blue-100 text-blue-700' : ''
                    }`}
                  >
                    <span>2024 Main</span>
                  </button>
                </div>
                
                <h3 className="font-medium mb-2 mt-4">Sort by</h3>
                <div className="space-y-2">
                  <button 
                    onClick={() => handleSort('harvestDate')}
                    className={`flex items-center justify-between w-full px-2 py-1 rounded ${
                      sortField === 'harvestDate' ? 'bg-blue-100 text-blue-700' : ''
                    }`}
                  >
                    <span>Harvest Date</span>
                    {sortField === 'harvestDate' && (
                      <ChevronDown className={`h-4 w-4 ${sortDirection === 'desc' ? 'transform rotate-180' : ''}`} />
                    )}
                  </button>
                  <button 
                    onClick={() => handleSort('weight')}
                    className={`flex items-center justify-between w-full px-2 py-1 rounded ${
                      sortField === 'weight' ? 'bg-blue-100 text-blue-700' : ''
                    }`}
                  >
                    <span>Weight</span>
                    {sortField === 'weight' && (
                      <ChevronDown className={`h-4 w-4 ${sortDirection === 'desc' ? 'transform rotate-180' : ''}`} />
                    )}
                  </button>
                  <button 
                    onClick={() => handleSort('totalValue')}
                    className={`flex items-center justify-between w-full px-2 py-1 rounded ${
                      sortField === 'totalValue' ? 'bg-blue-100 text-blue-700' : ''
                    }`}
                  >
                    <span>Value</span>
                    {sortField === 'totalValue' && (
                      <ChevronDown className={`h-4 w-4 ${sortDirection === 'desc' ? 'transform rotate-180' : ''}`} />
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <div className={`flex items-center gap-3 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            <p>Status: <span className="font-medium">{statusFilter === 'all' ? 'All Statuses' : `${statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}`}</span></p>
            {seasonFilter !== 'all' && (
              <p>Season: <span className="font-medium">{seasonFilter}</span></p>
            )}
            <p>Sort: <span className="font-medium">
              {sortField === 'harvestDate' ? 'Harvest Date' : 
               sortField === 'weight' ? 'Weight' : 
               'Value'} ({sortDirection === 'asc' ? 'Ascending' : 'Descending'})
            </span></p>
          </div>
        </div>
        
        <div className="flex-grow overflow-auto">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <RefreshCw className="h-8 w-8 text-green-500 animate-spin" />
            </div>
          ) : filteredHarvests.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64">
              <Coffee className="h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500 text-lg">No harvests found</p>
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
              {seasonFilter !== 'all' && (
                <button
                  onClick={() => setSeasonFilter('all')}
                  className="mt-2 text-blue-500 hover:underline"
                >
                  View all seasons
                </button>
              )}
            </div>
          ) : (
            <div className={`rounded-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'} overflow-hidden`}>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className={darkMode ? 'bg-gray-800' : 'bg-gray-100'}>
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Harvest ID
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Farmer
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Season/Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Weight
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Grade
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Value
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Loan Repayment
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className={`divide-y ${darkMode ? 'divide-gray-700 bg-gray-800' : 'divide-gray-200 bg-white'}`}>
                  {filteredHarvests.map((harvest) => {
                    const statusBadge = getStatusBadge(harvest.status);
                    const repaymentProgress = calculateRepaymentProgress(harvest);
                    
                    return (
                      <tr key={harvest.id} className={darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {harvest.harvestId || harvest.id.substring(0, 8)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            {harvest.farmerName}
                          </div>
                          <div className="text-xs text-gray-500">
                            {harvest.farmLocation || 'Unknown location'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>{harvest.season || 'Unknown season'}</div>
                          <div className="text-xs text-gray-500">
                            {formatDate(harvest.harvestDate)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {harvest.weight?.toLocaleString() || 0} kg
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={getGradeClass(harvest.grade)}>
                            {harvest.grade || 'Not graded'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap font-medium">
                          {formatCurrency(harvest.totalValue)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium inline-flex items-center ${statusBadge.class}`}>
                            {statusBadge.icon}
                            {harvest.status.charAt(0).toUpperCase() + harvest.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {harvest.loanAmount ? (
                            <div>
                              <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
                                <div 
                                  className="bg-green-600 h-2 rounded-full" 
                                  style={{ width: `${repaymentProgress}%` }}
                                ></div>
                              </div>
                              <div className="text-xs">
                                {formatCurrency(harvest.totalValue || 0)} / {formatCurrency(harvest.loanAmount)} ({repaymentProgress}%)
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs">No loan</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button 
                            className="text-blue-600 hover:text-blue-800 mr-2"
                            onClick={() => handleViewHarvest(harvest)}
                          >
                            View
                          </button>
                          {userRole === 'admin' && harvest.status !== 'paid' && (
                            <button 
                              className="text-blue-600 hover:text-blue-800"
                              onClick={() => handleUpdateHarvest(harvest)}
                            >
                              Update
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Record Harvest Modal */}
        {showRecordModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className={`w-full max-w-2xl rounded-lg shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} p-6 overflow-y-auto max-h-[90vh]`}>
              <div className="flex justify-between items-center mb-6">
                <h3 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  Record New Harvest
                </h3>
                <button 
                  onClick={() => setShowRecordModal(false)}
                  className={`p-1 rounded-full ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* Farmer Information */}
                <div className="col-span-2">
                  <h4 className={`font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Farmer Information</h4>
                </div>
                
                <div className="md:col-span-2">
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Farmer*
                  </label>
                  {loadingFarmers ? (
                    <div className="flex items-center space-x-2">
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Loading farmers...</span>
                    </div>
                  ) : (
                    <div className="relative">
                      <select
                        value={newHarvest.farmerId}
                        onChange={(e) => handleFarmerSelect(e.target.value)}
                        className={`w-full px-3 py-2 rounded-md border appearance-none ${
                          darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
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
                      <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                        <User className="h-4 w-4" />
                      </div>
                    </div>
                  )}
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Farm Location
                  </label>
                  <input
                    type="text"
                    value={newHarvest.farmLocation}
                    onChange={(e) => handleHarvestFormChange('farmLocation', e.target.value)}
                    className={`w-full px-3 py-2 rounded-md border ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    placeholder="Farm location/district"
                  />
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Season
                  </label>
                  <select
                    value={newHarvest.season}
                    onChange={(e) => handleHarvestFormChange('season', e.target.value)}
                    className={`w-full px-3 py-2 rounded-md border ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value={`${new Date().getFullYear()}-main`}>{new Date().getFullYear()} Main</option>
                    <option value={`${new Date().getFullYear()}-fly`}>{new Date().getFullYear()} Fly</option>
                    <option value={`${new Date().getFullYear() - 1}-main`}>{new Date().getFullYear() - 1} Main</option>
                    <option value={`${new Date().getFullYear() - 1}-fly`}>{new Date().getFullYear() - 1} Fly</option>
                  </select>
                </div>
                
                {/* Harvest Details */}
                <div className="col-span-2 mt-4">
                  <h4 className={`font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Harvest Details</h4>
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Harvest Date*
                  </label>
                  <input
                    type="date"
                    value={newHarvest.harvestDate}
                    onChange={(e) => handleHarvestFormChange('harvestDate', e.target.value)}
                    className={`w-full px-3 py-2 rounded-md border ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    required
                  />
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Coffee Type
                  </label>
                  <select
                    value={newHarvest.coffeeType}
                    onChange={(e) => handleHarvestFormChange('coffeeType', e.target.value)}
                    className={`w-full px-3 py-2 rounded-md border ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="Arabica">Arabica</option>
                    <option value="Robusta">Robusta</option>
                    <option value="Mixed">Mixed</option>
                  </select>
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Weight (kg)*
                  </label>
                  <input
                    type="number"
                    value={newHarvest.weight}
                    onChange={(e) => handleHarvestFormChange('weight', e.target.value)}
                    className={`w-full px-3 py-2 rounded-md border ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    step="0.1"
                    min="0"
                    required
                  />
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Moisture Content (%)
                  </label>
                  <input
                    type="number"
                    value={newHarvest.moisture}
                    onChange={(e) => handleHarvestFormChange('moisture', e.target.value)}
                    className={`w-full px-3 py-2 rounded-md border ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    step="0.1"
                    min="0"
                    max="100"
                  />
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Processing Method
                  </label>
                  <select
                    value={newHarvest.processingMethod}
                    onChange={(e) => handleHarvestFormChange('processingMethod', e.target.value)}
                    className={`w-full px-3 py-2 rounded-md border ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="wet">Wet Process</option>
                    <option value="dry">Dry Process</option>
                    <option value="honey">Honey Process</option>
                    <option value="natural">Natural Process</option>
                  </select>
                </div>
                
                {/* Payment Details */}
                <div className="col-span-2 mt-4">
                  <h4 className={`font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Payment Details</h4>
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Price per kg (UGX)
                  </label>
                  <input
                    type="number"
                    value={newHarvest.pricePerKg}
                    onChange={(e) => handleHarvestFormChange('pricePerKg', e.target.value)}
                    className={`w-full px-3 py-2 rounded-md border ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    step="100"
                    min="0"
                  />
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Total Value (UGX)
                  </label>
                  <input
                    type="number"
                    value={newHarvest.totalValue}
                    readOnly
                    className={`w-full px-3 py-2 rounded-md border ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white bg-gray-800' : 'bg-gray-100 border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
                
                {/* Notes */}
                <div className="col-span-2 mt-4">
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Notes
                  </label>
                  <textarea
                    value={newHarvest.notes}
                    onChange={(e) => handleHarvestFormChange('notes', e.target.value)}
                    className={`w-full px-3 py-2 rounded-md border ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    rows="3"
                    placeholder="Additional notes about the harvest"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setShowRecordModal(false)}
                  className={`px-4 py-2 rounded-md ${
                    darkMode 
                      ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                      : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveHarvest}
                  className={`px-4 py-2 rounded-md flex items-center space-x-1 ${
                    darkMode ? 'bg-green-600 hover:bg-green-700' : 'bg-green-600 hover:bg-green-700'
                  } text-white`}
                >
                  <Coffee className="h-4 w-4" />
                  <span>Save Harvest</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* View Harvest Modal */}
        {showViewModal && selectedHarvest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className={`w-full max-w-2xl rounded-lg shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} p-6 overflow-y-auto max-h-[90vh]`}>
              <div className="flex justify-between items-center mb-6">
                <h3 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  Harvest Details
                </h3>
                <button 
                  onClick={() => setShowViewModal(false)}
                  className={`p-1 rounded-full ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Harvest ID</p>
                  <p className="font-medium">{selectedHarvest.harvestId || selectedHarvest.id.substring(0, 8)}</p>
                </div>
                
                <div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Status</p>
                  <div className="flex items-center">
                    {getStatusBadge(selectedHarvest.status).icon}
                    <span className={`ml-1 ${getStatusBadge(selectedHarvest.status).class} px-2 py-1 rounded-full`}>
                      {selectedHarvest.status.charAt(0).toUpperCase() + selectedHarvest.status.slice(1)}
                    </span>
                  </div>
                </div>
                
                <div className="col-span-2 mt-2">
                  <h4 className={`font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Farmer Information</h4>
                </div>
                
                <div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Farmer</p>
                  <p className="font-medium">{selectedHarvest.farmerName}</p>
                </div>
                
                <div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Farm Location</p>
                  <p className="font-medium">{selectedHarvest.farmLocation || 'Unknown location'}</p>
                </div>
                
                <div className="col-span-2 mt-4">
                  <h4 className={`font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Harvest Details</h4>
                </div>
                
                <div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Coffee Type</p>
                  <p className="font-medium">{selectedHarvest.coffeeType}</p>
                </div>
                
                <div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Harvest Date</p>
                  <p className="font-medium">{formatDate(selectedHarvest.harvestDate)}</p>
                </div>
                
                <div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Season</p>
                  <p className="font-medium">{selectedHarvest.season}</p>
                </div>
                
                <div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Weight</p>
                  <p className="font-medium">{selectedHarvest.weight?.toLocaleString() || 0} kg</p>
                </div>
                
                <div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Moisture Content</p>
                  <p className="font-medium">{selectedHarvest.moisture || 'N/A'}%</p>
                </div>
                
                <div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Processing Method</p>
                  <p className="font-medium">{selectedHarvest.processingMethod === 'wet' ? 'Wet Process' : 
                                            selectedHarvest.processingMethod === 'dry' ? 'Dry Process' :
                                            selectedHarvest.processingMethod === 'honey' ? 'Honey Process' :
                                            selectedHarvest.processingMethod === 'natural' ? 'Natural Process' :
                                            selectedHarvest.processingMethod}</p>
                </div>
                
                <div className="col-span-2 mt-4">
                  <h4 className={`font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Quality & Payment</h4>
                </div>
                
                <div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Grade</p>
                  <p className={`font-medium ${getGradeClass(selectedHarvest.grade)}`}>
                    {selectedHarvest.grade || 'Not graded'}
                  </p>
                </div>
                
                <div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Price per kg</p>
                  <p className="font-medium">{formatCurrency(selectedHarvest.pricePerKg || 0)}</p>
                </div>
                
                <div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total Value</p>
                  <p className="font-medium">{formatCurrency(selectedHarvest.totalValue || 0)}</p>
                </div>
                
                {selectedHarvest.notes && (
                  <div className="col-span-2 mt-4">
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Notes</p>
                    <p className="font-medium">{selectedHarvest.notes}</p>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end">
                <button
                  onClick={() => setShowViewModal(false)}
                  className={`px-4 py-2 rounded-md ${
                    darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                  } text-gray-800 dark:text-white`}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Update Harvest Modal */}
        {showUpdateModal && selectedHarvest && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className={`w-full max-w-2xl rounded-lg shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} p-6 overflow-y-auto max-h-[90vh]`}>
              <div className="flex justify-between items-center mb-6">
                <h3 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  Update Harvest
                </h3>
                <button 
                  onClick={() => setShowUpdateModal(false)}
                  className={`p-1 rounded-full ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {/* Harvest Details */}
                <div className="col-span-2">
                  <h4 className={`font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Harvest Details</h4>
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Coffee Type
                  </label>
                  <select
                    value={selectedHarvest.coffeeType}
                    onChange={(e) => setSelectedHarvest({...selectedHarvest, coffeeType: e.target.value})}
                    className={`w-full px-3 py-2 rounded-md border ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="Arabica">Arabica</option>
                    <option value="Robusta">Robusta</option>
                    <option value="Mixed">Mixed</option>
                  </select>
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Weight (kg)*
                  </label>
                  <input
                    type="number"
                    value={selectedHarvest.weight}
                    onChange={(e) => setSelectedHarvest({...selectedHarvest, weight: e.target.value})}
                    className={`w-full px-3 py-2 rounded-md border ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    step="0.1"
                    min="0"
                    required
                  />
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Status
                  </label>
                  <select
                    value={selectedHarvest.status}
                    onChange={(e) => setSelectedHarvest({...selectedHarvest, status: e.target.value})}
                    className={`w-full px-3 py-2 rounded-md border ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="pending">Pending</option>
                    <option value="graded">Graded</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Grade
                  </label>
                  <select
                    value={selectedHarvest.grade || ''}
                    onChange={(e) => setSelectedHarvest({...selectedHarvest, grade: e.target.value})}
                    className={`w-full px-3 py-2 rounded-md border ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  >
                    <option value="">Not Graded</option>
                    <option value="A">A</option>
                    <option value="B">B</option>
                    <option value="C">C</option>
                    <option value="PB">PB</option>
                  </select>
                </div>
                
                {/* Payment Details */}
                <div className="col-span-2 mt-4">
                  <h4 className={`font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Payment Details</h4>
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Price per kg (UGX)
                  </label>
                  <input
                    type="number"
                    value={selectedHarvest.pricePerKg || ''}
                    onChange={(e) => {
                      const price = e.target.value;
                      const weight = parseFloat(selectedHarvest.weight) || 0;
                      setSelectedHarvest({
                        ...selectedHarvest, 
                        pricePerKg: price,
                        totalValue: weight * parseFloat(price)
                      });
                    }}
                    className={`w-full px-3 py-2 rounded-md border ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    step="100"
                    min="0"
                  />
                </div>
                
                <div>
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Total Value (UGX)
                  </label>
                  <input
                    type="number"
                    value={selectedHarvest.totalValue || 0}
                    readOnly
                    className={`w-full px-3 py-2 rounded-md border ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white bg-gray-800' : 'bg-gray-100 border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
                
                {/* Notes */}
                <div className="col-span-2 mt-4">
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                    Notes
                  </label>
                  <textarea
                    value={selectedHarvest.notes || ''}
                    onChange={(e) => setSelectedHarvest({...selectedHarvest, notes: e.target.value})}
                    className={`w-full px-3 py-2 rounded-md border ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    rows="3"
                    placeholder="Additional notes about the harvest"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-2">
                <button
                  onClick={() => setShowUpdateModal(false)}
                  className={`px-4 py-2 rounded-md ${
                    darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                  } text-gray-800 dark:text-white`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpdateHarvestSave}
                  className={`px-4 py-2 rounded-md flex items-center space-x-1 ${
                    darkMode ? 'bg-green-600 hover:bg-green-700' : 'bg-green-600 hover:bg-green-700'
                  } text-white`}
                >
                  <Coffee className="h-4 w-4" />
                  <span>Save Changes</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

HarvestsManagement.propTypes = {
  darkMode: PropTypes.bool.isRequired,
  userRole: PropTypes.string.isRequired
};

export default HarvestsManagement; 