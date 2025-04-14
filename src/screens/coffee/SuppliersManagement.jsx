import { addDoc, collection, deleteDoc, doc, getDocs, orderBy, query, updateDoc, where } from 'firebase/firestore';
import {
  ChevronDown,
  Edit,
  Filter,
  Link,
  MapPin,
  Package,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Store,
  Trash2,
  Truck,
  X
} from 'lucide-react';
import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { db } from '../../firebase/firebase';

const SuppliersManagement = ({ darkMode, userRole }) => {
  const [suppliers, setSuppliers] = useState([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [productFilter, setProductFilter] = useState('');
  const [dateRangeFilter, setDateRangeFilter] = useState({
    from: null,
    to: null
  });
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentSupplier, setCurrentSupplier] = useState(null);
  const [newSupplier, setNewSupplier] = useState({
    name: '',
    category: 'seeds',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    products: [],
    active: true,
    joiningDate: new Date(),
    notes: ''
  });

  // Fetch suppliers data
  const fetchSuppliers = async () => {
    setIsLoading(true);
    try {
      let q = query(collection(db, "suppliers"), orderBy(sortField, sortDirection));
      
      // Apply category filter if not all
      if (categoryFilter !== 'all') {
        q = query(collection(db, "suppliers"), where("category", "==", categoryFilter), orderBy(sortField, sortDirection));
      }
      
      // Status filter would be applied in JS after fetching since we can't combine multiple inequality queries in Firestore
      const querySnapshot = await getDocs(q);
      const suppliersData = [];
      querySnapshot.forEach((doc) => {
        suppliersData.push({ id: doc.id, ...doc.data() });
      });
      setSuppliers(suppliersData);
      
      // Apply client-side filters (status, date range, product)
      applyClientSideFilters(suppliersData);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Apply client-side filters (status, date range, product)
  const applyClientSideFilters = (data) => {
    let filtered = [...data];
    
    // Apply search filter
    if (searchQuery.trim() !== '') {
      filtered = filtered.filter(supplier => 
        supplier.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        supplier.contactPerson?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        supplier.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        supplier.products?.some(product => product.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    
    // Apply status filter
    if (statusFilter !== 'all') {
      const isActive = statusFilter === 'active';
      filtered = filtered.filter(supplier => supplier.active === isActive);
    }
    
    // Apply product filter
    if (productFilter.trim() !== '') {
      filtered = filtered.filter(supplier => 
        supplier.products?.some(product => 
          product.toLowerCase().includes(productFilter.toLowerCase())
        )
      );
    }
    
    // Apply date range filter
    if (dateRangeFilter.from || dateRangeFilter.to) {
      filtered = filtered.filter(supplier => {
        // Convert supplier date to Date object
        const joinDate = supplier.joiningDate?.toDate ? supplier.joiningDate.toDate() : new Date(supplier.joiningDate);
        
        // Check if date is within range
        if (dateRangeFilter.from && dateRangeFilter.to) {
          return joinDate >= dateRangeFilter.from && joinDate <= dateRangeFilter.to;
        } else if (dateRangeFilter.from) {
          return joinDate >= dateRangeFilter.from;
        } else if (dateRangeFilter.to) {
          return joinDate <= dateRangeFilter.to;
        }
        return true;
      });
    }
    
    setFilteredSuppliers(filtered);
  };

  useEffect(() => {
    fetchSuppliers();
  }, [sortField, sortDirection, categoryFilter]);

  // Apply client-side filters when they change
  useEffect(() => {
    if (suppliers.length > 0) {
      applyClientSideFilters(suppliers);
    }
  }, [searchQuery, statusFilter, productFilter, dateRangeFilter]);

  // Handle date range changes
  const handleDateRangeChange = (type, dateString) => {
    if (!dateString || dateString.trim() === '') {
      setDateRangeFilter(prev => ({...prev, [type]: null}));
      return;
    }
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return; // Invalid date
      }
      
      setDateRangeFilter(prev => ({...prev, [type]: date}));
    } catch (error) {
      console.error("Error parsing date:", error);
    }
  };

  // Reset all filters
  const resetFilters = () => {
    setCategoryFilter('all');
    setStatusFilter('all');
    setProductFilter('');
    setDateRangeFilter({from: null, to: null});
    setSearchQuery('');
  };

  // Handle sort change
  const handleSort = (field) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  // Handle adding a new supplier
  const handleAddSupplier = async () => {
    if (!newSupplier.name) return;
    
    try {
      // Format products as an array if entered as comma-separated string
      const formattedProducts = typeof newSupplier.products === 'string' 
        ? newSupplier.products.split(',').map(p => p.trim()) 
        : newSupplier.products;
      
      await addDoc(collection(db, "suppliers"), {
        ...newSupplier,
        products: formattedProducts,
        joiningDate: new Date()
      });
      
      setIsAddModalOpen(false);
      setNewSupplier({
        name: '',
        category: 'seeds',
        contactPerson: '',
        phone: '',
        email: '',
        address: '',
        products: [],
        active: true,
        joiningDate: new Date(),
        notes: ''
      });
      fetchSuppliers();
    } catch (error) {
      console.error("Error adding supplier:", error);
    }
  };

  // Handle supplier deletion
  const handleDeleteSupplier = async () => {
    if (!currentSupplier) return;
    
    try {
      await deleteDoc(doc(db, "suppliers", currentSupplier.id));
      setIsDeleteModalOpen(false);
      setCurrentSupplier(null);
      fetchSuppliers();
    } catch (error) {
      console.error("Error deleting supplier:", error);
    }
  };

  // Update supplier status (active/inactive)
  const toggleSupplierStatus = async (supplierId, currentStatus) => {
    try {
      await updateDoc(doc(db, "suppliers", supplierId), {
        active: !currentStatus
      });
      fetchSuppliers();
    } catch (error) {
      console.error("Error updating supplier status:", error);
    }
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

  // Get category icon
  const getCategoryIcon = (category) => {
    switch (category) {
      case 'seeds':
        return <Package className="h-4 w-4 mr-1 text-green-500" />;
      case 'fertilizer':
        return <Package className="h-4 w-4 mr-1 text-blue-500" />;
      case 'pesticides':
        return <Package className="h-4 w-4 mr-1 text-red-500" />;
      case 'equipment':
        return <Package className="h-4 w-4 mr-1 text-yellow-500" />;
      case 'logistics':
        return <Truck className="h-4 w-4 mr-1 text-purple-500" />;
      default:
        return <Store className="h-4 w-4 mr-1 text-gray-500" />;
    }
  };

  return (
    <div className={`w-full h-full p-6 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      <div className="flex flex-col h-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div className="flex items-center mb-4 md:mb-0">
            <Store className="mr-2 h-6 w-6 text-blue-500" />
            <h1 className="text-2xl font-bold">Coffee Suppliers Management</h1>
          </div>
          
          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
            <div className={`relative flex-grow md:w-64 ${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-md`}>
              <input
                type="text"
                placeholder="Search suppliers..."
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
                onClick={fetchSuppliers}
                className={`flex items-center px-3 py-2 rounded-md ${
                  darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-white hover:bg-gray-100'
                } border ${darkMode ? 'border-gray-700' : 'border-gray-300'}`}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                <span>Refresh</span>
              </button>
              
              {userRole === 'admin' && (
                <button 
                  onClick={() => setIsAddModalOpen(true)}
                  className={`flex items-center px-3 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white`}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  <span>Add Supplier</span>
                </button>
              )}
            </div>
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
              <div className={`absolute top-12 left-0 w-72 p-4 rounded-md shadow-lg z-10 ${
                darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              } border`}>
                {/* Category Filter */}
                <h3 className="font-medium mb-2">Category</h3>
                <div className="space-y-2 mb-4">
                  <button 
                    onClick={() => setCategoryFilter('all')}
                    className={`flex items-center w-full px-2 py-1 rounded ${
                      categoryFilter === 'all' ? 'bg-blue-100 text-blue-700' : ''
                    }`}
                  >
                    <span>All Categories</span>
                  </button>
                  <button 
                    onClick={() => setCategoryFilter('seeds')}
                    className={`flex items-center w-full px-2 py-1 rounded ${
                      categoryFilter === 'seeds' ? 'bg-blue-100 text-blue-700' : ''
                    }`}
                  >
                    <Package className="h-4 w-4 mr-2 text-green-500" />
                    <span>Seeds</span>
                  </button>
                  <button 
                    onClick={() => setCategoryFilter('fertilizer')}
                    className={`flex items-center w-full px-2 py-1 rounded ${
                      categoryFilter === 'fertilizer' ? 'bg-blue-100 text-blue-700' : ''
                    }`}
                  >
                    <Package className="h-4 w-4 mr-2 text-blue-500" />
                    <span>Fertilizer</span>
                  </button>
                  <button 
                    onClick={() => setCategoryFilter('pesticides')}
                    className={`flex items-center w-full px-2 py-1 rounded ${
                      categoryFilter === 'pesticides' ? 'bg-blue-100 text-blue-700' : ''
                    }`}
                  >
                    <Package className="h-4 w-4 mr-2 text-red-500" />
                    <span>Pesticides</span>
                  </button>
                  <button 
                    onClick={() => setCategoryFilter('equipment')}
                    className={`flex items-center w-full px-2 py-1 rounded ${
                      categoryFilter === 'equipment' ? 'bg-blue-100 text-blue-700' : ''
                    }`}
                  >
                    <Package className="h-4 w-4 mr-2 text-yellow-500" />
                    <span>Equipment</span>
                  </button>
                  <button 
                    onClick={() => setCategoryFilter('logistics')}
                    className={`flex items-center w-full px-2 py-1 rounded ${
                      categoryFilter === 'logistics' ? 'bg-blue-100 text-blue-700' : ''
                    }`}
                  >
                    <Truck className="h-4 w-4 mr-2 text-purple-500" />
                    <span>Logistics</span>
                  </button>
                </div>
                
                {/* Status Filter */}
                <h3 className="font-medium mb-2">Status</h3>
                <div className="space-y-2 mb-4">
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
                    <span className="h-2 w-2 rounded-full bg-green-500 mr-2"></span>
                    <span>Active</span>
                  </button>
                  <button 
                    onClick={() => setStatusFilter('inactive')}
                    className={`flex items-center w-full px-2 py-1 rounded ${
                      statusFilter === 'inactive' ? 'bg-blue-100 text-blue-700' : ''
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full bg-red-500 mr-2"></span>
                    <span>Inactive</span>
                  </button>
                </div>
                
                {/* Product Filter */}
                <h3 className="font-medium mb-2">Product</h3>
                <div className="mb-4">
                  <input 
                    type="text"
                    placeholder="Filter by product..."
                    value={productFilter}
                    onChange={(e) => setProductFilter(e.target.value)}
                    className={`w-full px-3 py-2 rounded-md border ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                    }`}
                  />
                </div>
                
                {/* Date Range Filter */}
                <h3 className="font-medium mb-2">Joining Date Range</h3>
                <div className="space-y-2 mb-4">
                  <div>
                    <label className="text-xs mb-1 block">From</label>
                    <input 
                      type="date"
                      value={dateRangeFilter.from ? dateRangeFilter.from.toISOString().split('T')[0] : ''}
                      onChange={(e) => handleDateRangeChange('from', e.target.value)}
                      className={`w-full px-3 py-2 rounded-md border ${
                        darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="text-xs mb-1 block">To</label>
                    <input 
                      type="date"
                      value={dateRangeFilter.to ? dateRangeFilter.to.toISOString().split('T')[0] : ''}
                      onChange={(e) => handleDateRangeChange('to', e.target.value)}
                      className={`w-full px-3 py-2 rounded-md border ${
                        darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    />
                  </div>
                </div>
                
                {/* Sort Options */}
                <h3 className="font-medium mb-2">Sort by</h3>
                <div className="space-y-2 mb-4">
                  <button 
                    onClick={() => handleSort('name')}
                    className={`flex items-center justify-between w-full px-2 py-1 rounded ${
                      sortField === 'name' ? 'bg-blue-100 text-blue-700' : ''
                    }`}
                  >
                    <span>Name</span>
                    {sortField === 'name' && (
                      <ChevronDown className={`h-4 w-4 ${sortDirection === 'desc' ? 'transform rotate-180' : ''}`} />
                    )}
                  </button>
                  <button 
                    onClick={() => handleSort('joiningDate')}
                    className={`flex items-center justify-between w-full px-2 py-1 rounded ${
                      sortField === 'joiningDate' ? 'bg-blue-100 text-blue-700' : ''
                    }`}
                  >
                    <span>Joining Date</span>
                    {sortField === 'joiningDate' && (
                      <ChevronDown className={`h-4 w-4 ${sortDirection === 'desc' ? 'transform rotate-180' : ''}`} />
                    )}
                  </button>
                  <button 
                    onClick={() => handleSort('category')}
                    className={`flex items-center justify-between w-full px-2 py-1 rounded ${
                      sortField === 'category' ? 'bg-blue-100 text-blue-700' : ''
                    }`}
                  >
                    <span>Category</span>
                    {sortField === 'category' && (
                      <ChevronDown className={`h-4 w-4 ${sortDirection === 'desc' ? 'transform rotate-180' : ''}`} />
                    )}
                  </button>
                </div>
                
                {/* Reset Button */}
                <button
                  onClick={resetFilters}
                  className={`w-full mt-2 px-3 py-2 rounded-md ${
                    darkMode 
                      ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
                  }`}
                >
                  Reset Filters
                </button>
              </div>
            )}
          </div>
          
          <div className={`flex flex-wrap items-center gap-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            {(categoryFilter !== 'all' || statusFilter !== 'all' || productFilter || dateRangeFilter.from || dateRangeFilter.to) && (
              <div className="mr-2">
                <span className="font-medium">Active Filters:</span>
              </div>
            )}
            
            {categoryFilter !== 'all' && (
              <div className={`flex items-center px-2 py-1 rounded-full text-xs ${
                darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-800'
              }`}>
                <span>Category: {categoryFilter.charAt(0).toUpperCase() + categoryFilter.slice(1)}</span>
                <button 
                  onClick={() => setCategoryFilter('all')}
                  className="ml-1 p-0.5 rounded-full hover:bg-gray-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            
            {statusFilter !== 'all' && (
              <div className={`flex items-center px-2 py-1 rounded-full text-xs ${
                statusFilter === 'active'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                <span>Status: {statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1)}</span>
                <button 
                  onClick={() => setStatusFilter('all')}
                  className="ml-1 p-0.5 rounded-full hover:bg-gray-200"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            
            {productFilter && (
              <div className={`flex items-center px-2 py-1 rounded-full text-xs ${
                darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-800'
              }`}>
                <span>Product: {productFilter}</span>
                <button 
                  onClick={() => setProductFilter('')}
                  className="ml-1 p-0.5 rounded-full hover:bg-gray-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            
            {dateRangeFilter.from && (
              <div className={`flex items-center px-2 py-1 rounded-full text-xs ${
                darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-800'
              }`}>
                <span>From: {formatDate(dateRangeFilter.from)}</span>
                <button 
                  onClick={() => setDateRangeFilter(prev => ({...prev, from: null}))}
                  className="ml-1 p-0.5 rounded-full hover:bg-gray-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            
            {dateRangeFilter.to && (
              <div className={`flex items-center px-2 py-1 rounded-full text-xs ${
                darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-800'
              }`}>
                <span>To: {formatDate(dateRangeFilter.to)}</span>
                <button 
                  onClick={() => setDateRangeFilter(prev => ({...prev, to: null}))}
                  className="ml-1 p-0.5 rounded-full hover:bg-gray-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
            
            {(categoryFilter !== 'all' || statusFilter !== 'all' || productFilter || dateRangeFilter.from || dateRangeFilter.to) && (
              <button
                onClick={resetFilters}
                className={`text-xs px-2 py-1 rounded-full ml-2 ${
                  darkMode 
                    ? 'bg-gray-700 hover:bg-gray-600 text-gray-300' 
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
              >
                Clear All
              </button>
            )}
            
            <div className={`ml-auto flex items-center px-2 py-1 rounded-full text-xs ${
              darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-800'
            }`}>
              <span>Sort: {sortField === 'name' ? 'Name' : sortField === 'joiningDate' ? 'Date' : 'Category'} ({sortDirection === 'asc' ? '↑' : '↓'})</span>
            </div>
          </div>
        </div>
        
        <div className="flex-grow overflow-auto">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
            </div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64">
              <Store className="h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-500 text-lg">No suppliers found</p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="mt-2 text-blue-500 hover:underline"
                >
                  Clear search
                </button>
              )}
              {categoryFilter !== 'all' && (
                <button
                  onClick={() => setCategoryFilter('all')}
                  className="mt-2 text-blue-500 hover:underline"
                >
                  View all categories
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredSuppliers.map((supplier) => (
                <div 
                  key={supplier.id} 
                  className={`rounded-lg border ${
                    darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                  } overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200`}
                >
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center">
                        {getCategoryIcon(supplier.category)}
                        <h3 className="font-semibold text-lg">{supplier.name}</h3>
                      </div>
                      <div className="flex items-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          supplier.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {supplier.active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-2 mb-4">
                      {supplier.contactPerson && (
                        <div className="flex items-start text-sm">
                          <span className="font-medium min-w-24">Contact Person:</span>
                          <span>{supplier.contactPerson}</span>
                        </div>
                      )}
                      
                      {supplier.phone && (
                        <div className="flex items-start text-sm">
                          <Phone className="h-4 w-4 mr-1 text-gray-500" />
                          <span>{supplier.phone}</span>
                        </div>
                      )}
                      
                      {supplier.email && (
                        <div className="flex items-start text-sm">
                          <Link className="h-4 w-4 mr-1 text-gray-500" />
                          <span>{supplier.email}</span>
                        </div>
                      )}
                      
                      {supplier.address && (
                        <div className="flex items-start text-sm">
                          <MapPin className="h-4 w-4 mr-1 text-gray-500" />
                          <span>{supplier.address}</span>
                        </div>
                      )}
                      
                      <div className="flex items-start text-sm">
                        <span className="font-medium min-w-24">Joined:</span>
                        <span>{formatDate(supplier.joiningDate)}</span>
                      </div>
                    </div>
                    
                    {supplier.products && supplier.products.length > 0 && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium mb-1">Products/Services:</h4>
                        <div className="flex flex-wrap gap-1">
                          {supplier.products.map((product, index) => (
                            <span 
                              key={index}
                              className={`text-xs px-2 py-1 rounded-full ${
                                darkMode ? 'bg-gray-700' : 'bg-gray-100'
                              }`}
                            >
                              {product}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {supplier.notes && (
                      <div className="mb-4">
                        <h4 className="text-sm font-medium mb-1">Notes:</h4>
                        <p className="text-sm text-gray-500">{supplier.notes}</p>
                      </div>
                    )}
                    
                    {userRole === 'admin' && (
                      <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-gray-200">
                        <button
                          onClick={() => toggleSupplierStatus(supplier.id, supplier.active)}
                          className={`text-xs px-2 py-1 rounded ${
                            supplier.active 
                              ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' 
                              : 'bg-green-100 text-green-800 hover:bg-green-200'
                          }`}
                        >
                          {supplier.active ? 'Set Inactive' : 'Set Active'}
                        </button>
                        <button
                          className="text-xs px-2 py-1 rounded bg-blue-100 text-blue-800 hover:bg-blue-200"
                        >
                          <Edit className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => {
                            setCurrentSupplier(supplier);
                            setIsDeleteModalOpen(true);
                          }}
                          className="text-xs px-2 py-1 rounded bg-red-100 text-red-800 hover:bg-red-200"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      {/* Add Supplier Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`w-full max-w-md p-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Add New Supplier</h2>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name *</label>
                <input
                  type="text"
                  value={newSupplier.name}
                  onChange={(e) => setNewSupplier({...newSupplier, name: e.target.value})}
                  className={`w-full px-3 py-2 rounded-md border ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Category *</label>
                <select
                  value={newSupplier.category}
                  onChange={(e) => setNewSupplier({...newSupplier, category: e.target.value})}
                  className={`w-full px-3 py-2 rounded-md border ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                >
                  <option value="seeds">Seeds</option>
                  <option value="fertilizer">Fertilizer</option>
                  <option value="pesticides">Pesticides</option>
                  <option value="equipment">Equipment</option>
                  <option value="logistics">Logistics</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Contact Person</label>
                <input
                  type="text"
                  value={newSupplier.contactPerson}
                  onChange={(e) => setNewSupplier({...newSupplier, contactPerson: e.target.value})}
                  className={`w-full px-3 py-2 rounded-md border ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Phone</label>
                  <input
                    type="text"
                    value={newSupplier.phone}
                    onChange={(e) => setNewSupplier({...newSupplier, phone: e.target.value})}
                    className={`w-full px-3 py-2 rounded-md border ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                    }`}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    value={newSupplier.email}
                    onChange={(e) => setNewSupplier({...newSupplier, email: e.target.value})}
                    className={`w-full px-3 py-2 rounded-md border ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                    }`}
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Address</label>
                <input
                  type="text"
                  value={newSupplier.address}
                  onChange={(e) => setNewSupplier({...newSupplier, address: e.target.value})}
                  className={`w-full px-3 py-2 rounded-md border ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Products (comma separated)</label>
                <input
                  type="text"
                  value={typeof newSupplier.products === 'string' ? newSupplier.products : newSupplier.products.join(', ')}
                  onChange={(e) => setNewSupplier({...newSupplier, products: e.target.value})}
                  className={`w-full px-3 py-2 rounded-md border ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                  placeholder="e.g. Coffee seeds, Arabica, Robusta"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  value={newSupplier.notes}
                  onChange={(e) => setNewSupplier({...newSupplier, notes: e.target.value})}
                  className={`w-full px-3 py-2 rounded-md border ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                  rows={3}
                />
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className={`px-4 py-2 rounded-md border ${
                    darkMode ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-100'
                  }`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddSupplier}
                  className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                  disabled={!newSupplier.name}
                >
                  Add Supplier
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && currentSupplier && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className={`w-full max-w-md p-6 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Confirm Deletion</h2>
              <button 
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setCurrentSupplier(null);
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <p className="mb-6">Are you sure you want to delete supplier <strong>{currentSupplier.name}</strong>? This action cannot be undone.</p>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setCurrentSupplier(null);
                }}
                className={`px-4 py-2 rounded-md border ${
                  darkMode ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-100'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteSupplier}
                className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white"
              >
                Delete Supplier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

SuppliersManagement.propTypes = {
  darkMode: PropTypes.bool.isRequired,
  userRole: PropTypes.string.isRequired
};

export default SuppliersManagement; 