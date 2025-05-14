import { collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { Building, ChevronLeft, Coffee, Edit, MapPin, PhoneCall, Plus, Search, Trash, User } from 'lucide-react';
import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase/firebase';

const FarmersManagement = ({ darkMode, userRole }) => {
  const { user } = useAuth();
  
  // State variables for farmers list
  const [farmers, setFarmers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // State variables for filtering
  const [filterDistrict, setFilterDistrict] = useState('all');
  const [filterGender, setFilterGender] = useState('all');
  const [filterCoffeeType, setFilterCoffeeType] = useState('all');
  const [filterFarmSize, setFilterFarmSize] = useState('all');
  const [filterOrgType, setFilterOrgType] = useState('all');
  
  // State variables for farmer modal
  const [showFarmerModal, setShowFarmerModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editFarmerId, setEditFarmerId] = useState(null);
  const [selectedFarmer, setSelectedFarmer] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  
  // Current farmer state for form
  const [currentFarmer, setCurrentFarmer] = useState({
    fullName: '',
    gender: 'male',
    age: '',
    phoneNumber: '',
    idNumber: '',
    district: '',
    location: {
      address: '',
      gpsCoordinates: ''
    },
    farm: {
      size: '',
      coffeeType: 'arabica',
      treesCount: ''
    },
    organization: {
      type: 'independent', // 'cooperative', 'sacco', or 'independent'
      id: '',
      name: ''
    },
    isActive: true,
    createdBy: '',
    createdAt: null,
    updatedAt: null
  });
  
  // Lists for dropdowns - fixed districts to be static array since it doesn't need to be in state
  const districts = [
    'Bugisu', 'Buganda', 'Ankole', 'Kigezi', 'Bunyoro', 
    'Toro', 'Acholi', 'Lango', 'Karamoja', 'Sebei'
  ];
  
  const coffeeTypes = ['Arabica', 'Robusta', 'Mixed'];
  const genderOptions = ['Male', 'Female'];
  const farmSizeRanges = ['< 1 acre', '1-5 acres', '5-10 acres', '> 10 acres'];

  // State variables for organization selection
  const [organizations, setOrganizations] = useState([]);
  const [loadingOrgs, setLoadingOrgs] = useState(false);

  // Fetch farmers from Firestore - enhanced for real-time updates
  useEffect(() => {
    setLoading(true);
    
    // Create query with optimized indexes
    const farmersQuery = query(
        collection(db, 'farmers'), 
      orderBy('createdAt', 'desc')
      );
    
    // Use real-time listener with onSnapshot
    const unsubscribe = onSnapshot(farmersQuery, 
      (snapshot) => {
        // Process real-time data
      const farmersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setFarmers(farmersData);
      setLoading(false);
      }, 
      (error) => {
      console.error("Error fetching farmers:", error);
        toast.error("Failed to load farmers");
      setLoading(false);
      }
    );
    
    // Clean up listener on component unmount
    return () => unsubscribe();
  }, []);
  
  // Fetch organizations for the dropdown
  useEffect(() => {
    const fetchOrganizations = async () => {
      setLoadingOrgs(true);
      try {
        // Create queries for both collections
        const coopsQuery = query(
          collection(db, 'cooperatives'),
          orderBy('name', 'asc')
        );
        
        const saccosQuery = query(
          collection(db, 'saccos'),
          orderBy('name', 'asc')
        );
        
        // Get cooperatives
        const coopsSnapshot = await onSnapshot(coopsQuery, (snapshot) => {
          const coopsData = snapshot.docs.map(doc => ({
            id: doc.id,
            type: 'cooperative',
            ...doc.data()
          }));
          
          // Get SACCOs
          const saccosSnapshot = onSnapshot(saccosQuery, (snapshot) => {
            const saccosData = snapshot.docs.map(doc => ({
              id: doc.id,
              type: 'sacco',
              ...doc.data()
            }));
            
            // Combine and set organizations
            setOrganizations([...coopsData, ...saccosData]);
            setLoadingOrgs(false);
          });
          
          return () => saccosSnapshot();
        });
        
        return () => coopsSnapshot();
      } catch (error) {
        console.error("Error fetching organizations:", error);
        setLoadingOrgs(false);
      }
    };
    
    fetchOrganizations();
  }, []);
  
  // Filter farmers based on search term and filters
  const filteredFarmers = farmers.filter(farmer => {
    // Search filter
    const searchFields = [
      farmer.fullName || '',
      farmer.phoneNumber || '',
      farmer.idNumber || ''
    ].join(' ').toLowerCase();
    
    const matchesSearch = searchFields.includes(searchTerm.toLowerCase());
    
    // District filter
    const matchesDistrict = 
      filterDistrict === 'all' || 
      farmer.district === filterDistrict;
    
    // Gender filter
    const matchesGender = 
      filterGender === 'all' || 
      farmer.gender?.toLowerCase() === filterGender.toLowerCase();
    
    // Coffee type filter
    const matchesCoffeeType = 
      filterCoffeeType === 'all' || 
      farmer.farm?.coffeeType?.toLowerCase() === filterCoffeeType.toLowerCase();
    
    // Organization type filter
    const matchesOrgType = 
      filterOrgType === 'all' || 
      farmer.organization?.type === filterOrgType;
    
    // Farm size filter
    let matchesFarmSize = true;
    if (filterFarmSize !== 'all') {
      const farmSize = parseFloat(farmer.farm?.size || 0);
      
      switch(filterFarmSize) {
        case '< 1 acre':
          matchesFarmSize = farmSize < 1;
          break;
        case '1-5 acres':
          matchesFarmSize = farmSize >= 1 && farmSize <= 5;
          break;
        case '5-10 acres':
          matchesFarmSize = farmSize > 5 && farmSize <= 10;
          break;
        case '> 10 acres':
          matchesFarmSize = farmSize > 10;
          break;
        default:
          matchesFarmSize = true;
      }
    }
    
    return matchesSearch && matchesDistrict && matchesGender && matchesCoffeeType && matchesFarmSize && matchesOrgType;
  });
  
  // Handle form change
  const handleFormChange = (field, value) => {
    // Handle nested fields
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setCurrentFarmer(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setCurrentFarmer(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };
  
  // Function to add or update farmer
  const handleSaveFarmer = async () => {
    try {
      setLoading(true);
      
      // Validate required fields
      if (!currentFarmer.fullName || !currentFarmer.district || !currentFarmer.phoneNumber) {
        toast.error("Please fill in all required fields");
        setLoading(false);
        return;
      }
      
      // Create farmer data object
      const farmerData = {
        fullName: currentFarmer.fullName,
        gender: currentFarmer.gender,
        age: parseInt(currentFarmer.age) || 0,
        phoneNumber: currentFarmer.phoneNumber,
        idNumber: currentFarmer.idNumber,
        district: currentFarmer.district,
        location: {
          address: currentFarmer.location.address,
          gpsCoordinates: currentFarmer.location.gpsCoordinates
        },
        farm: {
          size: parseFloat(currentFarmer.farm.size) || 0,
          coffeeType: currentFarmer.farm.coffeeType,
          treesCount: parseInt(currentFarmer.farm.treesCount) || 0
        },
        organization: {
          type: currentFarmer.organization.type,
          id: currentFarmer.organization.id,
          name: currentFarmer.organization.name
        },
        isActive: currentFarmer.isActive,
        updatedAt: serverTimestamp()
      };
      
      if (editMode) {
        // Update existing farmer
        const farmerRef = doc(db, 'farmers', editFarmerId);
        await updateDoc(farmerRef, farmerData);
        toast.success(`Farmer ${currentFarmer.fullName} has been updated`);
      } else {
        // Add new farmer
        const newFarmerRef = doc(collection(db, 'farmers'));
        await setDoc(newFarmerRef, {
          ...farmerData,
          createdBy: user.uid,
          createdAt: serverTimestamp()
        });
        toast.success(`Farmer ${currentFarmer.fullName} has been added successfully`);
      }
      
      resetAndCloseModal();
    } catch (error) {
      console.error("Error saving farmer:", error);
      toast.error("Failed to save farmer");
    } finally {
      setLoading(false);
    }
  };
  
  // Function to delete a farmer
  const handleDeleteFarmer = async () => {
    if (!editFarmerId) return;
    
    try {
      setIsDeleting(true);
      await deleteDoc(doc(db, 'farmers', editFarmerId));
      toast.success("Farmer has been deleted");
      
      resetAndCloseModal();
      setShowDeleteConfirmation(false);
      
      // If viewing farmer details, go back to list
      if (selectedFarmer) {
        setSelectedFarmer(null);
      }
      } catch (error) {
        console.error("Error deleting farmer:", error);
      toast.error("Failed to delete farmer");
    } finally {
      setIsDeleting(false);
    }
  };
  
  // Function to edit a farmer
  const handleEditFarmer = (farmerId) => {
    const farmerToEdit = farmers.find(farmer => farmer.id === farmerId);
    if (farmerToEdit) {
      setCurrentFarmer({
        fullName: farmerToEdit.fullName || '',
        gender: farmerToEdit.gender || 'male',
        age: farmerToEdit.age?.toString() || '',
        phoneNumber: farmerToEdit.phoneNumber || '',
        idNumber: farmerToEdit.idNumber || '',
        district: farmerToEdit.district || '',
        location: {
          address: farmerToEdit.location?.address || '',
          gpsCoordinates: farmerToEdit.location?.gpsCoordinates || ''
        },
        farm: {
          size: farmerToEdit.farm?.size?.toString() || '',
          coffeeType: farmerToEdit.farm?.coffeeType || 'Arabica',
          treesCount: farmerToEdit.farm?.treesCount?.toString() || ''
        },
        organization: {
          type: farmerToEdit.organization?.type || 'independent',
          id: farmerToEdit.organization?.id || '',
          name: farmerToEdit.organization?.name || ''
        },
        isActive: farmerToEdit.isActive !== false,
        createdBy: farmerToEdit.createdBy,
        createdAt: farmerToEdit.createdAt,
        updatedAt: farmerToEdit.updatedAt
      });
      setEditMode(true);
      setEditFarmerId(farmerId);
      setShowFarmerModal(true);
    }
  };
  
  // Function to view farmer details
  const handleViewFarmer = (farmerId) => {
    const farmer = farmers.find(f => f.id === farmerId);
    setSelectedFarmer(farmer);
  };
  
  // Reset form and close modal
  const resetAndCloseModal = () => {
    setCurrentFarmer({
      fullName: '',
      gender: 'male',
      age: '',
      phoneNumber: '',
      idNumber: '',
      district: '',
      location: {
        address: '',
        gpsCoordinates: ''
      },
      farm: {
        size: '',
        coffeeType: 'arabica',
        treesCount: ''
      },
      organization: {
        type: 'independent',
        id: '',
        name: ''
      },
      isActive: true,
      createdBy: '',
      createdAt: null,
      updatedAt: null
    });
    setEditMode(false);
    setEditFarmerId(null);
    setShowFarmerModal(false);
  };
  
  // Function to go back to the list view
  const handleBackToFarmers = () => {
    setSelectedFarmer(null);
  };

  // Handle organization type change
  const handleOrganizationTypeChange = (type) => {
    if (type === 'independent') {
      setCurrentFarmer(prev => ({
        ...prev,
        organization: {
          type: 'independent',
          id: '',
          name: ''
        }
      }));
    } else {
      setCurrentFarmer(prev => ({
        ...prev,
        organization: {
          ...prev.organization,
          type: type,
          id: '',
          name: ''
        }
      }));
    }
  };

  // Handle organization selection
  const handleOrganizationSelect = (orgId) => {
    const selectedOrg = organizations.find(org => org.id === orgId);
    if (selectedOrg) {
      setCurrentFarmer(prev => ({
        ...prev,
        organization: {
          type: selectedOrg.type,
          id: selectedOrg.id,
          name: selectedOrg.name
        }
      }));
    }
  };

  // Render farmer details view when a farmer is selected
  if (selectedFarmer) {
    return (
      <div className="p-6">
        {/* Back button and header */}
        <div className="flex items-center gap-2 mb-6">
          <button 
            onClick={handleBackToFarmers}
            className={`p-2 rounded-md ${
              darkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
            }`}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            {selectedFarmer.fullName}
          </h1>
        </div>
        
        {/* Farmer details card */}
        <div className={`mb-8 p-6 rounded-lg ${
          darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
        } shadow-sm`}>
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <div className="flex items-center mb-4">
                <div className={`p-3 rounded-lg ${darkMode ? 'bg-blue-900/30' : 'bg-blue-100'} mr-4`}>
                  <User className={`h-6 w-6 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                </div>
                <div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Farmer ID</p>
                  <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    {selectedFarmer.idNumber || 'Not provided'}
                  </h3>
                </div>
              </div>
              
              <div className={`grid grid-cols-2 gap-4 p-4 rounded-lg mb-4 ${
                darkMode ? 'bg-gray-900/50' : 'bg-gray-50'
              }`}>
                <div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Gender</p>
                  <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    {selectedFarmer.gender?.charAt(0).toUpperCase() + selectedFarmer.gender?.slice(1) || 'Not provided'}
                  </p>
                </div>
                <div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Age</p>
                  <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    {selectedFarmer.age || 'Not provided'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center mb-4">
                <div className={`p-3 rounded-lg ${darkMode ? 'bg-green-900/30' : 'bg-green-100'} mr-4`}>
                  <Building className={`h-6 w-6 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
                </div>
                <div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Organization</p>
                  <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    {selectedFarmer.organization?.type === 'independent' 
                      ? 'Independent Farmer' 
                      : selectedFarmer.organization?.name || 
                        `${selectedFarmer.organization?.type === 'cooperative' ? 'Cooperative' : 'SACCO'} (Unnamed)`}
                  </h3>
                </div>
              </div>

              <div className="flex items-center mb-4">
                <div className={`p-3 rounded-lg ${darkMode ? 'bg-amber-900/30' : 'bg-amber-100'} mr-4`}>
                  <PhoneCall className={`h-6 w-6 ${darkMode ? 'text-amber-400' : 'text-amber-600'}`} />
                </div>
                <div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Contact</p>
                  <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    {selectedFarmer.phoneNumber || 'Not provided'}
                  </h3>
                </div>
              </div>
              
              <div className="flex items-center mb-4">
                <div className={`p-3 rounded-lg ${darkMode ? 'bg-purple-900/30' : 'bg-purple-100'} mr-4`}>
                  <MapPin className={`h-6 w-6 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
                </div>
                <div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Location</p>
                  <h3 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    {selectedFarmer.district}
                  </h3>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {selectedFarmer.location?.address || 'No specific address provided'}
                  </p>
                  {selectedFarmer.location?.gpsCoordinates && (
                    <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                      GPS: {selectedFarmer.location.gpsCoordinates}
                    </p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="md:w-64 flex flex-col">
              <div className={`p-4 rounded-lg mb-4 ${
                darkMode ? 'bg-gray-900/50 border border-gray-700' : 'bg-gray-50 border border-gray-200'
              }`}>
                <h3 className={`text-lg font-medium mb-3 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  Farm Information
                </h3>
                <div className="space-y-3">
                  <div>
                    <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Coffee Type</span>
                    <div className="flex items-center mt-1">
                      <Coffee className={`h-4 w-4 mr-2 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
                      <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                        {selectedFarmer.farm?.coffeeType || 'Not specified'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Farm Size</span>
                    <div className="flex justify-between items-center">
                      <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                        {selectedFarmer.farm?.size || '0'} acres
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Coffee Trees</span>
                    <div className="flex justify-between items-center">
                      <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                        {selectedFarmer.farm?.treesCount || '0'} trees
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Status</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium block mt-1 text-center ${
                      selectedFarmer.isActive
                        ? (darkMode ? 'bg-green-900/20 text-green-400' : 'bg-green-100 text-green-700')
                        : (darkMode ? 'bg-yellow-900/20 text-yellow-400' : 'bg-yellow-100 text-yellow-700')
                    }`}>
                      {selectedFarmer.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => handleEditFarmer(selectedFarmer.id)} 
                className={`flex items-center justify-center gap-2 p-2 rounded-lg ${
                  darkMode 
                    ? 'bg-indigo-900/20 text-indigo-400 hover:bg-indigo-900/40 border border-indigo-800/30' 
                    : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
                }`}
              >
                <Edit className="h-4 w-4" />
                <span>Edit Farmer</span>
              </button>
              <button
                onClick={() => {
                  setEditFarmerId(selectedFarmer.id);
                  setShowDeleteConfirmation(true);
                }} 
                className={`mt-2 flex items-center justify-center gap-2 p-2 rounded-lg ${
                  darkMode 
                    ? 'bg-red-900/20 text-red-400 hover:bg-red-900/40 border border-red-800/30' 
                    : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                }`}
              >
                <Trash className="h-4 w-4" />
                <span>Delete Farmer</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header with actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className={`text-3xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          Farmers Management
        </h1>
          <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {userRole === 'admin' 
              ? 'Register and manage coffee farmers in the system' 
              : 'View coffee farmers registered in the system'}
        </p>
      </div>
      
        {/* Only admins can add new farmers */}
        {userRole === 'admin' && (
          <button 
            onClick={() => {
              setEditMode(false);
              setShowFarmerModal(true);
            }}
            className={`inline-flex items-center px-5 py-3 rounded-lg text-lg ${
              darkMode 
                ? 'bg-indigo-600 hover:bg-indigo-700 text-white' 
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            <Plus className="h-6 w-6 mr-2" /> 
            <span>Register Farmer</span>
          </button>
        )}
      </div>

      {/* Search and filters */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
        <div className="flex-1">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className={`h-5 w-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            </div>
          <input
            type="text"
              placeholder="Search farmers by name, phone or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
              className={`pl-10 pr-4 py-3 w-full rounded-lg border ${
                darkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
            }`}
          />
          </div>
        </div>
        
        <div className="flex gap-4 flex-wrap">
          <div className="min-w-[180px]">
            <select
              value={filterDistrict}
              onChange={(e) => setFilterDistrict(e.target.value)}
              className={`px-4 py-3 w-full rounded-lg border ${
                darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="all">All Districts</option>
              {districts.map(district => (
                <option key={district} value={district}>
                  {district}
                </option>
              ))}
            </select>
          </div>
          
          <div className="min-w-[160px]">
            <select
              value={filterGender}
              onChange={(e) => setFilterGender(e.target.value)}
              className={`px-4 py-3 w-full rounded-lg border ${
                darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="all">All Genders</option>
              {genderOptions.map(gender => (
                <option key={gender} value={gender.toLowerCase()}>
                  {gender}
                </option>
              ))}
            </select>
          </div>
          
          <div className="min-w-[160px]">
            <select
              value={filterCoffeeType}
              onChange={(e) => setFilterCoffeeType(e.target.value)}
              className={`px-4 py-3 w-full rounded-lg border ${
                darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="all">All Coffee Types</option>
              {coffeeTypes.map(type => (
                <option key={type} value={type.toLowerCase()}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          
          <div className="min-w-[160px]">
          <select
              value={filterOrgType}
              onChange={(e) => setFilterOrgType(e.target.value)}
              className={`px-4 py-3 w-full rounded-lg border ${
                darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="all">All Organization Types</option>
              <option value="independent">Independent</option>
              <option value="cooperative">Cooperative</option>
              <option value="sacco">SACCO</option>
          </select>
          </div>
          
          <div className="min-w-[160px]">
            <select
              value={filterFarmSize}
              onChange={(e) => setFilterFarmSize(e.target.value)}
              className={`px-4 py-3 w-full rounded-lg border ${
                darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="all">All Farm Sizes</option>
              {farmSizeRanges.map(size => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Statistics Row */}
      <div className={`p-4 mb-6 rounded-lg grid grid-cols-2 md:grid-cols-7 gap-4 ${
        darkMode ? 'bg-gray-800/50 border border-gray-700' : 'bg-white/50 border border-gray-200 shadow-sm'
      }`}>
        <div className="text-center p-3">
          <h3 className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total Farmers</h3>
          <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>{filteredFarmers.length}</p>
        </div>
        
        <div className="text-center p-3">
          <h3 className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Arabica Farmers</h3>
          <p className={`text-2xl font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
            {filteredFarmers.filter(f => f.farm?.coffeeType?.toLowerCase() === 'arabica').length}
          </p>
        </div>
        
        <div className="text-center p-3">
          <h3 className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Robusta Farmers</h3>
          <p className={`text-2xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
            {filteredFarmers.filter(f => f.farm?.coffeeType?.toLowerCase() === 'robusta').length}
          </p>
        </div>
        
        <div className="text-center p-3">
          <h3 className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Independent</h3>
          <p className={`text-2xl font-bold ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {filteredFarmers.filter(f => f.organization?.type === 'independent').length}
          </p>
        </div>

        <div className="text-center p-3">
          <h3 className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Cooperative</h3>
          <p className={`text-2xl font-bold ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>
            {filteredFarmers.filter(f => f.organization?.type === 'cooperative').length}
          </p>
        </div>

        <div className="text-center p-3">
          <h3 className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>SACCO</h3>
          <p className={`text-2xl font-bold ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>
            {filteredFarmers.filter(f => f.organization?.type === 'sacco').length}
          </p>
        </div>
        
        <div className="text-center p-3">
          <h3 className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total Acreage</h3>
          <p className={`text-2xl font-bold ${darkMode ? 'text-amber-400' : 'text-amber-600'}`}>
            {filteredFarmers.reduce((sum, farmer) => sum + (parseFloat(farmer.farm?.size) || 0), 0).toFixed(1)}
          </p>
        </div>
      </div>

      {/* Farmers grid */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      ) : filteredFarmers.length === 0 ? (
        <div className={`p-12 text-center rounded-lg border ${
          darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'
        }`}>
          <User size={48} className={`mx-auto mb-4 opacity-20 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
          <h3 className={`text-xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
            No farmers found
          </h3>
          <p className={`max-w-md mx-auto mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            {searchTerm || filterDistrict !== 'all' || filterGender !== 'all' || filterCoffeeType !== 'all' || filterFarmSize !== 'all' 
              ? "Try adjusting your search criteria or filters."
              : "Add your first farmer to get started."}
          </p>
          {!searchTerm && filterDistrict === 'all' && filterGender === 'all' && filterCoffeeType === 'all' && filterFarmSize === 'all' && (
            <button 
              onClick={() => {
                setEditMode(false);
                setShowFarmerModal(true);
              }}
              className={`inline-flex items-center px-5 py-3 rounded-lg text-lg ${
                darkMode 
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white' 
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              <Plus className="h-5 w-5 mr-2" /> 
              <span>Register First Farmer</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredFarmers.map((farmer) => {
            // Determine color based on coffee type
            const coffeeTypeColors = {
              'arabica': { 
                bg: 'bg-green-100', accent: 'text-green-600', 
                dark: 'bg-green-900/20', darkAccent: 'text-green-400',
                gradient: 'from-green-500 to-emerald-600'
              },
              'robusta': { 
                bg: 'bg-blue-100', accent: 'text-blue-600', 
                dark: 'bg-blue-900/20', darkAccent: 'text-blue-400',
                gradient: 'from-blue-500 to-sky-600'
              },
              'mixed': { 
                bg: 'bg-purple-100', accent: 'text-purple-600', 
                dark: 'bg-purple-900/20', darkAccent: 'text-purple-400',
                gradient: 'from-purple-500 to-indigo-600'
              }
            };
            
            const coffeeType = farmer.farm?.coffeeType?.toLowerCase() || 'arabica';
            const colorScheme = coffeeTypeColors[coffeeType] || coffeeTypeColors['arabica'];
            
            return (
              <div 
                key={farmer.id} 
                className={`rounded-lg overflow-hidden transition-all hover:shadow-lg transform hover:-translate-y-1 ${
                  darkMode 
                    ? 'bg-gray-800 border border-gray-700' 
                    : 'bg-white border border-gray-200 shadow-sm'
                }`}
              >
                <div className={`h-2 w-full bg-gradient-to-r ${colorScheme.gradient}`}></div>
                
                <div className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className={`text-lg font-bold truncate mb-1 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                        {farmer.fullName}
                      </h3>
                      <div className="flex items-center gap-2 mb-1">
                        <PhoneCall className={`h-3.5 w-3.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                        <p className={`text-sm truncate ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {farmer.phoneNumber || 'No phone'}
                        </p>
      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className={`h-3.5 w-3.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                        <p className={`text-sm truncate ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {farmer.district || 'No location'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Building className={`h-3.5 w-3.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                        <p className={`text-sm truncate ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {farmer.organization?.type === 'independent'
                            ? 'Independent'
                            : farmer.organization?.name || 
                              (farmer.organization?.type === 'cooperative' ? 'Cooperative' : 'SACCO')}
                        </p>
                      </div>
                    </div>
                    <div className={`flex-shrink-0 px-2 py-1 rounded-full text-xs font-medium ${
                      farmer.isActive
                        ? (darkMode ? 'bg-green-900/20 text-green-400' : 'bg-green-100 text-green-700')
                        : (darkMode ? 'bg-yellow-900/20 text-yellow-400' : 'bg-yellow-100 text-yellow-700')
                    }`}>
                      {farmer.isActive ? 'Active' : 'Inactive'}
                    </div>
                  </div>

                  <div className={`mt-4 p-3 rounded-lg ${
                    darkMode ? 'bg-gray-900/50' : 'bg-gray-50'
                  }`}>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="text-center">
                        <span className={`block text-xs mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          Farm Size
                        </span>
                        <span className={`font-semibold ${darkMode ? colorScheme.darkAccent : colorScheme.accent}`}>
                          {farmer.farm?.size || '0'} acres
                        </span>
                      </div>
                      <div className="text-center">
                        <span className={`block text-xs mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          Coffee Type
                        </span>
                        <span className={`font-semibold ${darkMode ? colorScheme.darkAccent : colorScheme.accent}`}>
                          {farmer.farm?.coffeeType || 'Unknown'}
                        </span>
                      </div>
                      <div className="text-center">
                        <span className={`block text-xs mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          Trees
                        </span>
                        <span className={`font-semibold ${darkMode ? colorScheme.darkAccent : colorScheme.accent}`}>
                          {farmer.farm?.treesCount || '0'}
                    </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className={`flex border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                      <button 
                    onClick={() => handleEditFarmer(farmer.id)}
                    className={`flex-1 py-2 text-sm font-medium border-r ${
                      darkMode 
                        ? 'border-gray-700 hover:bg-gray-700 text-gray-300' 
                        : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                    }`}
                  >
                    <Edit className="h-4 w-4 mx-auto" />
                      </button>
                          <button 
                    onClick={() => {
                      setEditFarmerId(farmer.id);
                      setShowDeleteConfirmation(true);
                    }}
                    className={`flex-1 py-2 text-sm font-medium border-r ${
                      darkMode 
                        ? 'border-gray-700 hover:bg-gray-700 text-gray-300' 
                        : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                    }`}
                  >
                    <Trash className="h-4 w-4 mx-auto text-red-500" />
                          </button>
                          <button 
                    onClick={() => handleViewFarmer(farmer.id)}
                    className={`flex-1 py-2 text-sm font-medium ${
                      darkMode 
                        ? `${colorScheme.dark} ${colorScheme.darkAccent}` 
                        : `${colorScheme.bg} ${colorScheme.accent}`
                    }`}
                  >
                    View
                          </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit farmer modal */}
      {showFarmerModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" onClick={resetAndCloseModal}>
              <div className="absolute inset-0 bg-black opacity-50"></div>
            </div>

            <div className={`inline-block align-bottom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full ${
              darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'
            }`}>
              {/* Modal header */}
              <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <h3 className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {editMode ? 'Edit Farmer' : 'Register New Farmer'}
                  </h3>
                        <button 
                    onClick={resetAndCloseModal}
                    className={`p-1 rounded-full ${darkMode ? 'text-gray-400 hover:bg-gray-700 hover:text-white' : 'text-gray-500 hover:bg-gray-200 hover:text-gray-700'}`}
                        >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-6 w-6">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                        </button>
                </div>
              </div>
              
              {/* Modal body */}
              <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
                <div className="space-y-4">
                  {/* Basic Details */}
                  <h4 className={`font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Basic Information</h4>
                  
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Full Name*</label>
                    <input 
                      type="text" 
                      value={currentFarmer.fullName}
                      onChange={(e) => handleFormChange('fullName', e.target.value)}
                      className={`w-full p-2 rounded-md border ${
                        darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'
                      }`}
                      placeholder="e.g., John Doe"
                      required
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Gender</label>
                      <select 
                        value={currentFarmer.gender}
                        onChange={(e) => handleFormChange('gender', e.target.value)}
                        className={`w-full p-2 rounded-md border ${
                          darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'
                        }`}
                      >
                        {genderOptions.map(gender => (
                          <option key={gender} value={gender.toLowerCase()}>
                            {gender}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Age</label>
                      <input 
                        type="number" 
                        value={currentFarmer.age}
                        onChange={(e) => handleFormChange('age', e.target.value)}
                        className={`w-full p-2 rounded-md border ${
                          darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'
                        }`}
                        placeholder="Age in years"
                        min="1"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Phone Number*</label>
                      <input 
                        type="tel" 
                        value={currentFarmer.phoneNumber}
                        onChange={(e) => handleFormChange('phoneNumber', e.target.value)}
                        className={`w-full p-2 rounded-md border ${
                          darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'
                        }`}
                        placeholder="e.g., +256700000000"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>ID Number</label>
                      <input 
                        type="text" 
                        value={currentFarmer.idNumber}
                        onChange={(e) => handleFormChange('idNumber', e.target.value)}
                        className={`w-full p-2 rounded-md border ${
                          darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'
                        }`}
                        placeholder="National ID or other identifier"
                      />
                    </div>
                  </div>
                  
                  {/* Location Information */}
                  <h4 className={`font-medium mt-6 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Location</h4>
                  
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>District*</label>
                    <select 
                      value={currentFarmer.district}
                      onChange={(e) => handleFormChange('district', e.target.value)}
                      className={`w-full p-2 rounded-md border ${
                        darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'
                      }`}
                      required
                    >
                      <option value="">Select District</option>
                      {districts.map(district => (
                        <option key={district} value={district}>
                          {district}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Address</label>
                    <input 
                      type="text" 
                      value={currentFarmer.location.address}
                      onChange={(e) => handleFormChange('location.address', e.target.value)}
                      className={`w-full p-2 rounded-md border ${
                        darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'
                      }`}
                      placeholder="Village, Parish, Sub-county"
                    />
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>GPS Coordinates</label>
                    <input 
                      type="text" 
                      value={currentFarmer.location.gpsCoordinates}
                      onChange={(e) => handleFormChange('location.gpsCoordinates', e.target.value)}
                      className={`w-full p-2 rounded-md border ${
                        darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'
                      }`}
                      placeholder="e.g., Buyanja Sub county"
                    />
                    <p className={`text-xs mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      Enter a descriptive location (e.g., village, parish, or sub-county name)
                    </p>
                  </div>
                  
                  {/* Farm Information */}
                  <h4 className={`font-medium mt-6 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Farm Details</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Farm Size (acres)</label>
                      <input 
                        type="number" 
                        value={currentFarmer.farm.size}
                        onChange={(e) => handleFormChange('farm.size', e.target.value)}
                        className={`w-full p-2 rounded-md border ${
                          darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'
                        }`}
                        placeholder="Size in acres"
                        min="0"
                        step="0.1"
                      />
                    </div>
                    
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Coffee Type</label>
                      <select 
                        value={currentFarmer.farm.coffeeType}
                        onChange={(e) => handleFormChange('farm.coffeeType', e.target.value)}
                        className={`w-full p-2 rounded-md border ${
                          darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'
                        }`}
                      >
                        {coffeeTypes.map(type => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Number of Coffee Trees</label>
                    <input 
                      type="number" 
                      value={currentFarmer.farm.treesCount}
                      onChange={(e) => handleFormChange('farm.treesCount', e.target.value)}
                      className={`w-full p-2 rounded-md border ${
                        darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'
                      }`}
                      placeholder="Total number of trees"
                      min="0"
                    />
                  </div>
                  
                  {/* Organization Information */}
                  <h4 className={`font-medium mt-6 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Organization</h4>
                  
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Organization Type</label>
                    <div className="flex gap-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="independent"
                          checked={currentFarmer.organization.type === 'independent'}
                          onChange={() => handleOrganizationTypeChange('independent')}
                          className="mr-2"
                        />
                        <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Independent</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="cooperative"
                          checked={currentFarmer.organization.type === 'cooperative'}
                          onChange={() => handleOrganizationTypeChange('cooperative')}
                          className="mr-2"
                        />
                        <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Cooperative</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          value="sacco"
                          checked={currentFarmer.organization.type === 'sacco'}
                          onChange={() => handleOrganizationTypeChange('sacco')}
                          className="mr-2"
                        />
                        <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>SACCO</span>
                      </label>
                    </div>
                  </div>
                  
                  {currentFarmer.organization.type !== 'independent' && (
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Select {currentFarmer.organization.type === 'cooperative' ? 'Cooperative' : 'SACCO'}
                      </label>
                      <select 
                        value={currentFarmer.organization.id}
                        onChange={(e) => handleOrganizationSelect(e.target.value)}
                        className={`w-full p-2 rounded-md border ${
                          darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'
                        }`}
                      >
                        <option value="">Select {currentFarmer.organization.type === 'cooperative' ? 'Cooperative' : 'SACCO'}</option>
                        {organizations
                          .filter(org => org.type === currentFarmer.organization.type)
                          .map(org => (
                            <option key={org.id} value={org.id}>
                              {org.name}
                            </option>
                          ))
                        }
                      </select>
                      {loadingOrgs && (
                        <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          Loading organizations...
                        </p>
                      )}
                    </div>
                  )}
                  
                  <div className="flex items-center mt-4">
                    <input 
                      type="checkbox" 
                      id="isActive"
                      checked={currentFarmer.isActive}
                      onChange={(e) => handleFormChange('isActive', e.target.checked)}
                      className={`mr-2 rounded ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
                    />
                    <label htmlFor="isActive" className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Farmer is active
                    </label>
                  </div>
                </div>
              </div>
              
              {/* Modal footer */}
              <div className={`px-6 py-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex justify-end gap-2`}>
                <button 
                  onClick={resetAndCloseModal}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Cancel
                </button>
                
                <button 
                  onClick={handleSaveFarmer}
                  className={`px-4 py-2 rounded-md text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700`}
                >
                  {editMode ? 'Update Farmer' : 'Register Farmer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      {showDeleteConfirmation && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" onClick={() => setShowDeleteConfirmation(false)}>
              <div className="absolute inset-0 bg-black opacity-50"></div>
            </div>

            <div className={`inline-block align-bottom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full ${
              darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'
            }`}>
              <div className="p-6">
                <h3 className={`text-lg font-medium mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Delete Farmer
                </h3>
                <p className={`mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Are you sure you want to delete this farmer? All associated data will be permanently removed. This action cannot be undone.
                </p>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setShowDeleteConfirmation(false)}
                    className={`px-4 py-2 rounded-md ${
                      darkMode 
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteFarmer}
                    className={`px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white flex items-center ${
                      isDeleting ? 'opacity-50' : ''
                    }`}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      'Deleting...'
                    ) : (
                      <>
                        <Trash size={16} className="mr-2" />
                        Delete Farmer
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
      </div>
      )}
    </div>
  );
};

FarmersManagement.propTypes = {
  darkMode: PropTypes.bool.isRequired,
  userRole: PropTypes.string.isRequired,
};

export default FarmersManagement; 