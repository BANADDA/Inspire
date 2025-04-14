import { collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { Building, ChevronLeft, Edit, MapPin, Plus, Search, Trash, User } from 'lucide-react';
import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { db } from '../../firebase/firebase';

const OrganizationsManagement = ({ darkMode, userRole }) => {
  const { user } = useAuth();
  
  // Main state variables
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Filter states
  const [filterType, setFilterType] = useState('all'); // 'all', 'cooperative', 'sacco'
  const [filterRegion, setFilterRegion] = useState('all');
  
  // Modal states
  const [showOrgModal, setShowOrgModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editOrgId, setEditOrgId] = useState(null);
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [currentModalTab, setCurrentModalTab] = useState('basic');
  
  // Farmers for organization detail view
  const [organizationFarmers, setOrganizationFarmers] = useState([]);
  const [loadingFarmers, setLoadingFarmers] = useState(false);
  const [farmerSearchTerm, setFarmerSearchTerm] = useState('');
  const [showAddFarmerModal, setShowAddFarmerModal] = useState(false);
  const [availableFarmers, setAvailableFarmers] = useState([]);
  const [selectedFarmers, setSelectedFarmers] = useState([]);
  
  // Current organization state for form
  const [currentOrg, setCurrentOrg] = useState({
    // Common fields for both types
    type: 'cooperative', // or 'sacco'
    name: '',
    registrationNumber: '',
    taxId: '',
    yearEstablished: '',
    headOfficeLocation: '',
    regions: [],
    farmerCount: '',
    annualCoffeeVolume: '',
    
    // Cooperative specific
    certifications: [],
    processingFacilities: false,
    collectionCenters: '',
    
    // SACCO specific 
    licenseNumber: '',
    branches: [],
    savingsVolume: '',
    loanPortfolio: '',
    interestRate: '',
    
    isActive: true,
    createdBy: '',
    createdAt: null,
    updatedAt: null
  });
  
  // Static data for dropdowns
  const regions = [
    'Central', 'Eastern', 'Northern', 'Western', 
    'Bugisu', 'Buganda', 'Ankole', 'Kigezi', 'Bunyoro', 
    'Toro', 'Acholi', 'Lango', 'Karamoja', 'Sebei'
  ];
  
  const certificationOptions = [
    'Fair Trade', 'Rainforest Alliance', 'UTZ', 
    'Organic', 'Bird Friendly', 'Direct Trade', '4C'
  ];

  // Fetch organizations from Firestore
  useEffect(() => {
    setLoading(true);
    
    // Create query for all organizations (combining cooperatives and SACCOs)
    const fetchOrganizations = async () => {
      try {
        // Create queries for both collections
        const coopsQuery = query(
          collection(db, 'cooperatives'),
          orderBy('createdAt', 'desc')
        );
        
        const saccosQuery = query(
          collection(db, 'saccos'),
          orderBy('createdAt', 'desc')
        );
        
        // Set up real-time listeners for both collections
        const unsubscribeCoops = onSnapshot(coopsQuery, (snapshot) => {
          const coopsData = snapshot.docs.map(doc => ({
            id: doc.id,
            type: 'cooperative',
            ...doc.data()
          }));
          
          // Get SACCOs data and combine
          const unsubscribeSaccos = onSnapshot(saccosQuery, (snapshot) => {
            const saccosData = snapshot.docs.map(doc => ({
              id: doc.id,
              type: 'sacco',
              ...doc.data()
            }));
            
            // Combine and set organizations
            setOrganizations([...coopsData, ...saccosData]);
            setLoading(false);
          }, (error) => {
            console.error("Error fetching SACCOs:", error);
            // Still set cooperatives even if SACCOs fail
            setOrganizations(coopsData);
            setLoading(false);
            toast.error("Failed to load SACCOs");
          });
          
          // Clean up SACCOs listener on coops changes
          return () => unsubscribeSaccos();
        }, (error) => {
          console.error("Error fetching cooperatives:", error);
          setLoading(false);
          toast.error("Failed to load cooperatives");
        });
        
        // Return cleanup function
        return () => {
          unsubscribeCoops();
        };
      } catch (error) {
        console.error("Error setting up organization listeners:", error);
        setLoading(false);
        toast.error("Failed to load organizations");
      }
    };
    
    fetchOrganizations();
  }, []);
  
  // Filter organizations based on search term and filters
  const filteredOrganizations = organizations.filter(org => {
    // Search filter
    const searchFields = [
      org.name || '',
      org.registrationNumber || '',
      org.taxId || '',
      org.headOfficeLocation || '',
      ...(org.regions || [])
    ].join(' ').toLowerCase();
    
    const matchesSearch = searchFields.includes(searchTerm.toLowerCase());
    
    // Type filter
    const matchesType = 
      filterType === 'all' || 
      org.type === filterType;
    
    // Region filter
    const matchesRegion = 
      filterRegion === 'all' || 
      (org.regions && org.regions.includes(filterRegion));
    
    return matchesSearch && matchesType && matchesRegion;
  });
  
  // Handle form change
  const handleFormChange = (field, value) => {
    setCurrentOrg(prev => ({
      ...prev,
      [field]: value
    }));
  };
  
  // Handle array field changes (regions, certifications, branches)
  const handleArrayFieldChange = (field, value, isChecked) => {
    setCurrentOrg(prev => {
      // Get the current array
      const currentArray = prev[field] || [];
      
      // If adding to array
      if (isChecked && !currentArray.includes(value)) {
        return {
          ...prev,
          [field]: [...currentArray, value]
        };
      }
      
      // If removing from array
      if (!isChecked && currentArray.includes(value)) {
        return {
          ...prev,
          [field]: currentArray.filter(item => item !== value)
        };
      }
      
      // No change needed
      return prev;
    });
  };
  
  // Handle branch changes (for SACCOs)
  const handleBranchChange = (index, field, value) => {
    setCurrentOrg(prev => {
      const updatedBranches = [...(prev.branches || [])];
      
      // Ensure branch exists
      if (!updatedBranches[index]) {
        updatedBranches[index] = { location: '', clientCount: '' };
      }
      
      // Update specific field
      updatedBranches[index][field] = value;
      
      return {
        ...prev,
        branches: updatedBranches
      };
    });
  };
  
  // Add a new branch
  const addBranch = () => {
    setCurrentOrg(prev => ({
      ...prev,
      branches: [...(prev.branches || []), { location: '', clientCount: '' }]
    }));
  };
  
  // Remove a branch
  const removeBranch = (index) => {
    setCurrentOrg(prev => ({
      ...prev,
      branches: prev.branches.filter((_, i) => i !== index)
    }));
  };

  // Function to save or update organization
  const handleSaveOrganization = async () => {
    try {
      setLoading(true);
      
      // Validate required fields
      if (!currentOrg.name || !currentOrg.registrationNumber) {
        toast.error("Please fill in name and registration number");
        setLoading(false);
        return;
      }
      
      // Create organization data object
      const orgData = {
        // Common fields
        name: currentOrg.name,
        registrationNumber: currentOrg.registrationNumber,
        taxId: currentOrg.taxId,
        yearEstablished: currentOrg.yearEstablished,
        headOfficeLocation: currentOrg.headOfficeLocation,
        regions: currentOrg.regions || [],
        farmerCount: parseInt(currentOrg.farmerCount) || 0,
        annualCoffeeVolume: parseFloat(currentOrg.annualCoffeeVolume) || 0,
        isActive: currentOrg.isActive,
        updatedAt: serverTimestamp()
      };
      
      // Add type-specific fields
      if (currentOrg.type === 'cooperative') {
        orgData.certifications = currentOrg.certifications || [];
        orgData.processingFacilities = currentOrg.processingFacilities || false;
        orgData.collectionCenters = parseInt(currentOrg.collectionCenters) || 0;
      } else if (currentOrg.type === 'sacco') {
        orgData.licenseNumber = currentOrg.licenseNumber || '';
        orgData.branches = currentOrg.branches || [];
        orgData.savingsVolume = parseFloat(currentOrg.savingsVolume) || 0;
        orgData.loanPortfolio = parseFloat(currentOrg.loanPortfolio) || 0;
        orgData.interestRate = parseFloat(currentOrg.interestRate) || 0;
      }
      
      if (editMode) {
        // Update existing organization
        const collectionName = currentOrg.type === 'cooperative' ? 'cooperatives' : 'saccos';
        const orgRef = doc(db, collectionName, editOrgId);
        await updateDoc(orgRef, orgData);
        toast.success(`${currentOrg.name} has been updated`);
      } else {
        // Add new organization
        const collectionName = currentOrg.type === 'cooperative' ? 'cooperatives' : 'saccos';
        const newOrgRef = doc(collection(db, collectionName));
        await setDoc(newOrgRef, {
          ...orgData,
          createdBy: user.uid,
          createdAt: serverTimestamp()
        });
        toast.success(`${currentOrg.name} has been added successfully`);
      }
      
      resetAndCloseModal();
    } catch (error) {
      console.error("Error saving organization:", error);
      toast.error("Failed to save organization");
    } finally {
      setLoading(false);
    }
  };
  
  // Function to delete an organization
  const handleDeleteOrganization = async () => {
    if (!editOrgId || !selectedOrg) return;
    
    try {
      setIsDeleting(true);
      const collectionName = selectedOrg.type === 'cooperative' ? 'cooperatives' : 'saccos';
      await deleteDoc(doc(db, collectionName, editOrgId));
      toast.success("Organization has been deleted");
      
      resetAndCloseModal();
      setShowDeleteConfirmation(false);
      setSelectedOrg(null);
    } catch (error) {
      console.error("Error deleting organization:", error);
      toast.error("Failed to delete organization");
    } finally {
      setIsDeleting(false);
    }
  };
  
  // Function to edit an organization
  const handleEditOrganization = (org) => {
    if (!org) return;
    
    setCurrentOrg({
      type: org.type || 'cooperative',
      name: org.name || '',
      registrationNumber: org.registrationNumber || '',
      taxId: org.taxId || '',
      yearEstablished: org.yearEstablished || '',
      headOfficeLocation: org.headOfficeLocation || '',
      regions: org.regions || [],
      farmerCount: org.farmerCount?.toString() || '',
      annualCoffeeVolume: org.annualCoffeeVolume?.toString() || '',
      
      // Cooperative specific fields
      certifications: org.certifications || [],
      processingFacilities: org.processingFacilities || false,
      collectionCenters: org.collectionCenters?.toString() || '',
      
      // SACCO specific fields
      licenseNumber: org.licenseNumber || '',
      branches: org.branches || [],
      savingsVolume: org.savingsVolume?.toString() || '',
      loanPortfolio: org.loanPortfolio?.toString() || '',
      interestRate: org.interestRate?.toString() || '',
      
      isActive: org.isActive !== false, // Default to true if not specified
      createdBy: org.createdBy || '',
      createdAt: org.createdAt || null,
      updatedAt: org.updatedAt || null
    });
    
    setEditMode(true);
    setEditOrgId(org.id);
    setCurrentModalTab('basic');
    setShowOrgModal(true);
  };
  
  // Function to view organization details
  const handleViewOrganization = (org) => {
    setSelectedOrg(org);
    fetchOrganizationFarmers(org);
  };
  
  // Fetch farmers for the selected organization
  const fetchOrganizationFarmers = (org) => {
    if (!org) return;
    
    setLoadingFarmers(true);
    
    // Create query to get farmers by organization
    const farmersQuery = query(
      collection(db, 'farmers'),
      orderBy('fullName', 'asc')
    );
    
    // Use real-time listener
    const unsubscribe = onSnapshot(farmersQuery, 
      (snapshot) => {
        // Filter farmers belonging to this organization
        const farmersData = snapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
          .filter(farmer => 
            farmer.organization?.type === org.type && 
            farmer.organization?.id === org.id
          );
        
        setOrganizationFarmers(farmersData);
        setLoadingFarmers(false);
      }, 
      (error) => {
        console.error("Error fetching farmers:", error);
        toast.error("Failed to load farmers");
        setLoadingFarmers(false);
      }
    );
    
    // Store the unsubscribe function
    return unsubscribe;
  };
  
  // Fetch all independent farmers and those from other orgs (for adding to org)
  const fetchAvailableFarmers = () => {
    if (!selectedOrg) return;
    
    setLoadingFarmers(true);
    
    // Create query to get all farmers
    const farmersQuery = query(
      collection(db, 'farmers'),
      orderBy('fullName', 'asc')
    );
    
    // Use real-time listener
    const unsubscribe = onSnapshot(farmersQuery, 
      (snapshot) => {
        // Filter out farmers already in this organization
        const farmersData = snapshot.docs
          .map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
          .filter(farmer => 
            farmer.organization?.type === 'independent' || 
            farmer.organization?.id !== selectedOrg.id
          );
        
        setAvailableFarmers(farmersData);
        setLoadingFarmers(false);
      }, 
      (error) => {
        console.error("Error fetching available farmers:", error);
        toast.error("Failed to load available farmers");
        setLoadingFarmers(false);
      }
    );
    
    // Store the unsubscribe function
    return unsubscribe;
  };
  
  // Reset form and close modal
  const resetAndCloseModal = () => {
    setCurrentOrg({
      type: 'cooperative',
      name: '',
      registrationNumber: '',
      taxId: '',
      yearEstablished: '',
      headOfficeLocation: '',
      regions: [],
      farmerCount: '',
      annualCoffeeVolume: '',
      certifications: [],
      processingFacilities: false,
      collectionCenters: '',
      licenseNumber: '',
      branches: [],
      savingsVolume: '',
      loanPortfolio: '',
      interestRate: '',
      isActive: true,
      createdBy: '',
      createdAt: null,
      updatedAt: null
    });
    setEditMode(false);
    setEditOrgId(null);
    setShowOrgModal(false);
    setCurrentModalTab('basic');
  };
  
  // Function to go back to organizations list
  const handleBackToOrganizations = () => {
    setSelectedOrg(null);
  };
  
  // Helper function to get color scheme based on organization type
  const getOrgColorScheme = (type) => {
    if (type === 'cooperative') {
      return {
        bg: 'bg-blue-100',
        accent: 'text-blue-600',
        dark: 'bg-blue-900/20',
        darkAccent: 'text-blue-400',
        gradient: 'from-blue-500 to-indigo-600'
      };
    } else {
      return {
        bg: 'bg-purple-100',
        accent: 'text-purple-600',
        dark: 'bg-purple-900/20',
        darkAccent: 'text-purple-400',
        gradient: 'from-purple-500 to-indigo-600'
      };
    }
  };

  // Add farmer to organization
  const addFarmerToOrganization = async (farmerId) => {
    if (!selectedOrg || !farmerId) return;
    
    try {
      // Get the farmer
      const farmerRef = doc(db, 'farmers', farmerId);
      
      // Find the farmer in available farmers list to get the name
      const farmer = availableFarmers.find(f => f.id === farmerId);
      if (!farmer) return;
      
      // Update farmer to associate with this organization
      await updateDoc(farmerRef, {
        organization: {
          type: selectedOrg.type,
          id: selectedOrg.id,
          name: selectedOrg.name
        },
        updatedAt: serverTimestamp()
      });
      
      // Success message
      toast.success(`${farmer.fullName} has been added to ${selectedOrg.name}`);
      
      // Update farmer count in the organization
      const orgCollection = selectedOrg.type === 'cooperative' ? 'cooperatives' : 'saccos';
      const orgRef = doc(db, orgCollection, selectedOrg.id);
      
      await updateDoc(orgRef, {
        farmerCount: (selectedOrg.farmerCount || 0) + 1,
        updatedAt: serverTimestamp()
      });
      
      // Update the selected org in state
      setSelectedOrg(prev => ({
        ...prev,
        farmerCount: (prev.farmerCount || 0) + 1
      }));
      
    } catch (error) {
      console.error("Error adding farmer to organization:", error);
      toast.error("Failed to add farmer to organization");
    }
  };
  
  // Remove farmer from organization
  const removeFarmerFromOrganization = async (farmerId) => {
    if (!selectedOrg || !farmerId) return;
    
    try {
      // Get the farmer
      const farmerRef = doc(db, 'farmers', farmerId);
      
      // Find the farmer in the organization farmers list
      const farmer = organizationFarmers.find(f => f.id === farmerId);
      if (!farmer) return;
      
      // Update farmer to be independent
      await updateDoc(farmerRef, {
        organization: {
          type: 'independent',
          id: '',
          name: ''
        },
        updatedAt: serverTimestamp()
      });
      
      // Success message
      toast.success(`${farmer.fullName} has been removed from ${selectedOrg.name}`);
      
      // Update farmer count in the organization
      const orgCollection = selectedOrg.type === 'cooperative' ? 'cooperatives' : 'saccos';
      const orgRef = doc(db, orgCollection, selectedOrg.id);
      
      await updateDoc(orgRef, {
        farmerCount: Math.max((selectedOrg.farmerCount || 0) - 1, 0),
        updatedAt: serverTimestamp()
      });
      
      // Update the selected org in state
      setSelectedOrg(prev => ({
        ...prev,
        farmerCount: Math.max((prev.farmerCount || 0) - 1, 0)
      }));
      
    } catch (error) {
      console.error("Error removing farmer from organization:", error);
      toast.error("Failed to remove farmer from organization");
    }
  };
  
  // Toggle selection of farmers in the add farmers modal
  const toggleFarmerSelection = (farmerId) => {
    setSelectedFarmers(prev => {
      if (prev.includes(farmerId)) {
        return prev.filter(id => id !== farmerId);
      } else {
        return [...prev, farmerId];
      }
    });
  };
  
  // Add multiple selected farmers to the organization
  const addSelectedFarmersToOrganization = async () => {
    if (!selectedOrg || selectedFarmers.length === 0) return;
    
    try {
      let successCount = 0;
      
      // Add each selected farmer
      for (const farmerId of selectedFarmers) {
        // Get the farmer reference
        const farmerRef = doc(db, 'farmers', farmerId);
        
        // Update farmer to associate with this organization
        await updateDoc(farmerRef, {
          organization: {
            type: selectedOrg.type,
            id: selectedOrg.id,
            name: selectedOrg.name
          },
          updatedAt: serverTimestamp()
        });
        
        successCount++;
      }
      
      // Update farmer count in the organization
      const orgCollection = selectedOrg.type === 'cooperative' ? 'cooperatives' : 'saccos';
      const orgRef = doc(db, orgCollection, selectedOrg.id);
      
      await updateDoc(orgRef, {
        farmerCount: (selectedOrg.farmerCount || 0) + successCount,
        updatedAt: serverTimestamp()
      });
      
      // Update the selected org in state
      setSelectedOrg(prev => ({
        ...prev,
        farmerCount: (prev.farmerCount || 0) + successCount
      }));
      
      // Success message
      toast.success(`${successCount} farmers have been added to ${selectedOrg.name}`);
      
      // Reset selected farmers and close modal
      setSelectedFarmers([]);
      setShowAddFarmerModal(false);
      
    } catch (error) {
      console.error("Error adding farmers to organization:", error);
      toast.error("Failed to add some farmers to organization");
    }
  };

  return (
    <div className="p-6">
      {selectedOrg ? (
        // Organization Detail View with Farmers List
        <div>
          {/* Back button and header */}
          <div className="flex items-center gap-2 mb-6">
            <button 
              onClick={handleBackToOrganizations}
              className={`p-2 rounded-md ${
                darkMode ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div>
              <div className="flex items-center">
                <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  {selectedOrg.name}
                </h1>
                <span className={`ml-2 text-sm px-2 py-0.5 rounded-full ${
                  selectedOrg.type === 'cooperative'
                    ? (darkMode ? 'bg-blue-900/20 text-blue-400' : 'bg-blue-100 text-blue-600')
                    : (darkMode ? 'bg-purple-900/20 text-purple-400' : 'bg-purple-100 text-purple-600')
                }`}>
                  {selectedOrg.type === 'cooperative' ? 'Cooperative' : 'SACCO'}
                </span>
              </div>
              <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Established: {selectedOrg.yearEstablished || 'N/A'} | Reg. No: {selectedOrg.registrationNumber || 'N/A'}
              </p>
            </div>
          </div>
          
          {/* Organization details cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Basic Information Card */}
            <div className={`p-5 rounded-lg shadow-sm ${
              darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
            }`}>
              <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                Basic Information
              </h3>
              <div className="space-y-3">
                <div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Head Office</p>
                  <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    {selectedOrg.headOfficeLocation || 'Not specified'}
                  </p>
                </div>
                <div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Tax ID</p>
                  <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    {selectedOrg.taxId || 'Not specified'}
                  </p>
                </div>
                <div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Regions</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedOrg.regions && selectedOrg.regions.length > 0 ? (
                      selectedOrg.regions.map(region => (
                        <span 
                          key={region} 
                          className={`text-xs px-2 py-1 rounded-full ${
                            darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {region}
                        </span>
                      ))
                    ) : (
                      <p className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>No regions specified</p>
                    )}
                  </div>
                </div>
                <div>
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Status</p>
                  <span className={`inline-block mt-1 px-2 py-1 rounded-full text-xs font-medium ${
                    selectedOrg.isActive
                      ? (darkMode ? 'bg-green-900/20 text-green-400' : 'bg-green-100 text-green-700')
                      : (darkMode ? 'bg-yellow-900/20 text-yellow-400' : 'bg-yellow-100 text-yellow-700')
                  }`}>
                    {selectedOrg.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Type-specific information */}
            <div className={`p-5 rounded-lg shadow-sm ${
              darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
            }`}>
              <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                {selectedOrg.type === 'cooperative' ? 'Cooperative Details' : 'SACCO Details'}
              </h3>
              
              {selectedOrg.type === 'cooperative' ? (
                <div className="space-y-3">
                  <div>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Annual Coffee Volume</p>
                    <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      {selectedOrg.annualCoffeeVolume?.toLocaleString() || '0'} kg
                    </p>
                  </div>
                  <div>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Processing Facilities</p>
                    <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      {selectedOrg.processingFacilities ? 'Yes' : 'No'}
                    </p>
                  </div>
                  <div>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Collection Centers</p>
                    <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      {selectedOrg.collectionCenters || '0'}
                    </p>
                  </div>
                  <div>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Certifications</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {selectedOrg.certifications && selectedOrg.certifications.length > 0 ? (
                        selectedOrg.certifications.map(cert => (
                          <span 
                            key={cert} 
                            className={`text-xs px-2 py-1 rounded-full ${
                              darkMode ? 'bg-blue-900/20 text-blue-400' : 'bg-blue-100 text-blue-600'
                            }`}
                          >
                            {cert}
                          </span>
                        ))
                      ) : (
                        <p className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>No certifications</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>License Number</p>
                    <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      {selectedOrg.licenseNumber || 'Not provided'}
                    </p>
                  </div>
                  <div>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Loan Portfolio</p>
                    <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      ${selectedOrg.loanPortfolio?.toLocaleString() || '0'}
                    </p>
                  </div>
                  <div>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Savings Volume</p>
                    <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      ${selectedOrg.savingsVolume?.toLocaleString() || '0'}
                    </p>
                  </div>
                  <div>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Interest Rate</p>
                    <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      {selectedOrg.interestRate || '0'}%
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Farmers Summary Card */}
            <div className={`p-5 rounded-lg shadow-sm ${
              darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
            }`}>
              <h3 className={`text-lg font-semibold mb-4 flex justify-between items-center ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                <span>Farmers Summary</span>
                <span className={`text-2xl font-bold ${
                  darkMode ? 'text-green-400' : 'text-green-600'
                }`}>
                  {organizationFarmers.length}
                </span>
              </h3>
              
              <div className="space-y-4">
                {userRole === 'admin' && (
                  <button 
                    onClick={() => {
                      setSelectedFarmers([]);
                      fetchAvailableFarmers();
                      setShowAddFarmerModal(true);
                    }}
                    className={`w-full py-2 flex items-center justify-center gap-2 rounded ${
                      darkMode 
                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white' 
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Farmers</span>
                  </button>
                )}
                
                <div>
                  <div className="flex items-center justify-between">
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Arabica Farmers</p>
                    <p className={`font-medium ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                      {organizationFarmers.filter(farmer => 
                        farmer.farm?.coffeeType?.toLowerCase() === 'arabica'
                      ).length}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Robusta Farmers</p>
                    <p className={`font-medium ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                      {organizationFarmers.filter(farmer => 
                        farmer.farm?.coffeeType?.toLowerCase() === 'robusta'
                      ).length}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Mixed Cultivation</p>
                    <p className={`font-medium ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                      {organizationFarmers.filter(farmer => 
                        farmer.farm?.coffeeType?.toLowerCase() === 'mixed'
                      ).length}
                    </p>
                  </div>
                </div>
                
                <div className={`h-px w-full ${darkMode ? 'bg-gray-700' : 'bg-gray-200'}`}></div>
                
                <div>
                  <p className={`text-sm mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Farm Area</p>
                  <p className={`text-xl font-semibold ${darkMode ? 'text-amber-400' : 'text-amber-600'}`}>
                    {organizationFarmers.reduce((total, farmer) => 
                      total + (parseFloat(farmer.farm?.size) || 0), 0
                    ).toFixed(1)} acres
                  </p>
                </div>
                
                <div>
                  <p className={`text-sm mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Total Coffee Trees</p>
                  <p className={`text-xl font-semibold ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>
                    {organizationFarmers.reduce((total, farmer) => 
                      total + (parseInt(farmer.farm?.treesCount) || 0), 0
                    ).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Farmers list */}
          <div className={`mb-8 rounded-lg shadow-sm overflow-hidden ${
            darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
          }`}>
            <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex items-center justify-between">
                <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  Member Farmers
                </h3>
                
                <div className="relative w-64">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className={`h-4 w-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                  </div>
                  <input 
                    type="text"
                    placeholder="Search farmers..."
                    value={farmerSearchTerm}
                    onChange={(e) => setFarmerSearchTerm(e.target.value)}
                    className={`pl-9 pr-4 py-2 w-full rounded-lg border text-sm ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                  />
                </div>
              </div>
            </div>
            
            {loadingFarmers ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
              </div>
            ) : organizationFarmers.length === 0 ? (
              <div className="py-16 text-center">
                <User className={`mx-auto h-12 w-12 mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
                <h3 className={`text-lg font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  No Farmers Found
                </h3>
                <p className={`max-w-md mx-auto mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {farmerSearchTerm 
                    ? "No farmers match your search criteria. Try a different search."
                    : `This ${selectedOrg.type === 'cooperative' ? 'cooperative' : 'SACCO'} has no member farmers yet.`
                  }
                </p>
                {userRole === 'admin' && !farmerSearchTerm && (
                  <button 
                    onClick={() => {
                      setSelectedFarmers([]);
                      fetchAvailableFarmers();
                      setShowAddFarmerModal(true);
                    }}
                    className={`inline-flex items-center px-4 py-2 rounded-lg ${
                      darkMode 
                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white' 
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                    }`}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    <span>Add Farmers</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className={`${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
                    <tr>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                        darkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        Farmer
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                        darkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        Contact
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                        darkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        Location
                      </th>
                      <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                        darkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>
                        Farm Details
                      </th>
                      {userRole === 'admin' && (
                        <th className={`px-6 py-3 text-right text-xs font-medium uppercase tracking-wider ${
                          darkMode ? 'text-gray-400' : 'text-gray-500'
                        }`}>
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                    {organizationFarmers
                      .filter(farmer => 
                        farmer.fullName?.toLowerCase().includes(farmerSearchTerm.toLowerCase()) ||
                        farmer.phoneNumber?.toLowerCase().includes(farmerSearchTerm.toLowerCase()) ||
                        farmer.idNumber?.toLowerCase().includes(farmerSearchTerm.toLowerCase()) ||
                        farmer.district?.toLowerCase().includes(farmerSearchTerm.toLowerCase())
                      )
                      .map(farmer => (
                        <tr key={farmer.id}>
                          <td className={`px-6 py-4 whitespace-nowrap ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                            <div className="flex items-center">
                              <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                                darkMode ? 'bg-gray-700' : 'bg-gray-200'
                              }`}>
                                <User className={`h-4 w-4 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
                              </div>
                              <div className="ml-3">
                                <div className="font-medium">{farmer.fullName}</div>
                                <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  ID: {farmer.idNumber || 'N/A'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            {farmer.phoneNumber || 'N/A'}
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            <div>{farmer.district}</div>
                            <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              {farmer.location?.address || ''}
                            </div>
                          </td>
                          <td className={`px-6 py-4 whitespace-nowrap ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                            <div className="flex items-center gap-3">
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                farmer.farm?.coffeeType?.toLowerCase() === 'arabica'
                                  ? (darkMode ? 'bg-green-900/20 text-green-400' : 'bg-green-100 text-green-700')
                                  : farmer.farm?.coffeeType?.toLowerCase() === 'robusta'
                                    ? (darkMode ? 'bg-blue-900/20 text-blue-400' : 'bg-blue-100 text-blue-700')
                                    : (darkMode ? 'bg-purple-900/20 text-purple-400' : 'bg-purple-100 text-purple-700')
                              }`}>
                                {farmer.farm?.coffeeType || 'N/A'}
                              </span>
                              <span>{farmer.farm?.size || '0'} acres</span>
                            </div>
                          </td>
                          {userRole === 'admin' && (
                            <td className="px-6 py-4 whitespace-nowrap text-right">
                              <button
                                onClick={() => removeFarmerFromOrganization(farmer.id)}
                                className={`text-xs px-3 py-1 rounded-full ${
                                  darkMode 
                                    ? 'bg-red-900/20 text-red-400 hover:bg-red-900/40' 
                                    : 'bg-red-100 text-red-700 hover:bg-red-200'
                                }`}
                              >
                                Remove
                              </button>
                            </td>
                          )}
                        </tr>
                      ))
                    }
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        // Organizations List View
        <div className="p-6">
          {/* Header with actions */}
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
            <div>
              <h1 className={`text-3xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                Organizations Management
              </h1>
              <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Register and manage coffee cooperatives and SACCOs
              </p>
            </div>
            
            {userRole === 'admin' && (
              <button 
                onClick={() => {
                  setEditMode(false);
                  setShowOrgModal(true);
                }}
                className={`inline-flex items-center px-5 py-3 rounded-lg text-lg ${
                  darkMode 
                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white' 
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                <Plus className="h-6 w-6 mr-2" /> 
                <span>Add Organization</span>
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
                  placeholder="Search organizations by name, registration number..."
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
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className={`px-4 py-3 w-full rounded-lg border ${
                    darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="all">All Types</option>
                  <option value="cooperative">Cooperatives</option>
                  <option value="sacco">SACCOs</option>
                </select>
              </div>
              
              <div className="min-w-[180px]">
                <select
                  value={filterRegion}
                  onChange={(e) => setFilterRegion(e.target.value)}
                  className={`px-4 py-3 w-full rounded-lg border ${
                    darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="all">All Regions</option>
                  {regions.map(region => (
                    <option key={region} value={region}>
                      {region}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Statistics Row */}
          <div className={`p-4 mb-6 rounded-lg grid grid-cols-2 md:grid-cols-4 gap-4 ${
            darkMode ? 'bg-gray-800/50 border border-gray-700' : 'bg-white/50 border border-gray-200 shadow-sm'
          }`}>
            <div className="text-center p-3">
              <h3 className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total Organizations</h3>
              <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>{filteredOrganizations.length}</p>
            </div>
            
            <div className="text-center p-3">
              <h3 className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Cooperatives</h3>
              <p className={`text-2xl font-bold ${darkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                {filteredOrganizations.filter(org => org.type === 'cooperative').length}
              </p>
            </div>
            
            <div className="text-center p-3">
              <h3 className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>SACCOs</h3>
              <p className={`text-2xl font-bold ${darkMode ? 'text-purple-400' : 'text-purple-600'}`}>
                {filteredOrganizations.filter(org => org.type === 'sacco').length}
              </p>
            </div>
            
            <div className="text-center p-3">
              <h3 className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total Farmers</h3>
              <p className={`text-2xl font-bold ${darkMode ? 'text-green-400' : 'text-green-600'}`}>
                {filteredOrganizations.reduce((total, org) => total + (org.farmerCount || 0), 0).toLocaleString()}
              </p>
            </div>
          </div>

          {/* Organizations grid */}
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
            </div>
          ) : filteredOrganizations.length === 0 ? (
            <div className={`p-12 text-center rounded-lg border ${
              darkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'
            }`}>
              <Building size={48} className={`mx-auto mb-4 opacity-20 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
              <h3 className={`text-xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                No organizations found
              </h3>
              <p className={`max-w-md mx-auto mb-6 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {searchTerm || filterType !== 'all' || filterRegion !== 'all'
                  ? "Try adjusting your search criteria or filters."
                  : "Add your first organization to get started."}
              </p>
              {!searchTerm && filterType === 'all' && filterRegion === 'all' && userRole === 'admin' && (
                <button 
                  onClick={() => {
                    setEditMode(false);
                    setShowOrgModal(true);
                  }}
                  className={`inline-flex items-center px-5 py-3 rounded-lg text-lg ${
                    darkMode 
                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white' 
                      : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  }`}
                >
                  <Plus className="h-5 w-5 mr-2" /> 
                  <span>Add First Organization</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredOrganizations.map((org) => {
                const colorScheme = getOrgColorScheme(org.type);
                
                return (
                  <div 
                    key={org.id} 
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
                          <div className="flex items-center gap-2">
                            <h3 className={`text-lg font-bold mb-1 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                              {org.name}
                            </h3>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              org.type === 'cooperative'
                                ? (darkMode ? 'bg-blue-900/20 text-blue-400' : 'bg-blue-100 text-blue-600')
                                : (darkMode ? 'bg-purple-900/20 text-purple-400' : 'bg-purple-100 text-purple-600')
                            }`}>
                              {org.type === 'cooperative' ? 'Coop' : 'SACCO'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mb-1">
                            <Building className={`h-3.5 w-3.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              {org.headOfficeLocation || 'No location'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className={`h-3.5 w-3.5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              {org.regions && org.regions.length > 0 
                                ? `${org.regions.length} regions` 
                                : 'No regions'}
                            </p>
                          </div>
                        </div>
                        <div className={`flex-shrink-0 px-2 py-1 rounded-full text-xs font-medium ${
                          org.isActive
                            ? (darkMode ? 'bg-green-900/20 text-green-400' : 'bg-green-100 text-green-700')
                            : (darkMode ? 'bg-yellow-900/20 text-yellow-400' : 'bg-yellow-100 text-yellow-700')
                        }`}>
                          {org.isActive ? 'Active' : 'Inactive'}
                        </div>
                      </div>

                      <div className={`mt-4 p-3 rounded-lg ${
                        darkMode ? 'bg-gray-900/50' : 'bg-gray-50'
                      }`}>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="text-center">
                            <span className={`block text-xs mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              Farmers
                            </span>
                            <span className={`font-semibold ${darkMode ? colorScheme.darkAccent : colorScheme.accent}`}>
                              {org.farmerCount?.toLocaleString() || '0'}
                            </span>
                          </div>
                          <div className="text-center">
                            <span className={`block text-xs mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                              Est. Year
                            </span>
                            <span className={`font-semibold ${darkMode ? colorScheme.darkAccent : colorScheme.accent}`}>
                              {org.yearEstablished || 'N/A'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="mt-2 pt-2 border-t text-center border-gray-200 dark:border-gray-700">
                          <span className={`block text-xs mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {org.type === 'cooperative' ? 'Annual Coffee Volume' : 'Loan Portfolio'}
                          </span>
                          <span className={`font-semibold ${darkMode ? colorScheme.darkAccent : colorScheme.accent}`}>
                            {org.type === 'cooperative'
                              ? `${org.annualCoffeeVolume?.toLocaleString() || '0'} kg`
                              : `$${org.loanPortfolio?.toLocaleString() || '0'}`
                            }
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className={`flex border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                      {userRole === 'admin' && (
                        <>
                          <button 
                            onClick={() => handleEditOrganization(org)}
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
                              setEditOrgId(org.id);
                              setSelectedOrg(org);
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
                        </>
                      )}
                      <button 
                        onClick={() => handleViewOrganization(org)}
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
        </div>
      )}

      {/* Add/Edit organization modal */}
      {showOrgModal && (
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
                    {editMode ? 'Edit Organization' : 'Add New Organization'}
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
              
              {/* Modal tabs */}
              <div className={`flex border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <button
                  onClick={() => setCurrentModalTab('basic')}
                  className={`flex-1 py-3 text-sm font-medium text-center ${
                    currentModalTab === 'basic'
                      ? darkMode 
                        ? 'text-white border-b-2 border-blue-500'
                        : 'text-blue-600 border-b-2 border-blue-500'
                      : darkMode
                        ? 'text-gray-400 hover:text-gray-300'
                        : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Basic Information
                </button>
                <button
                  onClick={() => setCurrentModalTab('location')}
                  className={`flex-1 py-3 text-sm font-medium text-center ${
                    currentModalTab === 'location'
                      ? darkMode 
                        ? 'text-white border-b-2 border-blue-500'
                        : 'text-blue-600 border-b-2 border-blue-500'
                      : darkMode
                        ? 'text-gray-400 hover:text-gray-300'
                        : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Location & Reach
                </button>
                <button
                  onClick={() => setCurrentModalTab('details')}
                  className={`flex-1 py-3 text-sm font-medium text-center ${
                    currentModalTab === 'details'
                      ? darkMode 
                        ? 'text-white border-b-2 border-blue-500'
                        : 'text-blue-600 border-b-2 border-blue-500'
                      : darkMode
                        ? 'text-gray-400 hover:text-gray-300'
                        : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {currentOrg.type === 'cooperative' ? 'Cooperative Details' : 'SACCO Details'}
                </button>
              </div>
              
              {/* Modal body */}
              <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
                {/* Basic Information Tab */}
                {currentModalTab === 'basic' && (
                  <div className="space-y-4">
                    <div className="mb-4">
                      <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Organization Type</label>
                      <div className="flex gap-4">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            value="cooperative"
                            checked={currentOrg.type === 'cooperative'}
                            onChange={() => handleFormChange('type', 'cooperative')}
                            className="mr-2"
                          />
                          <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>Cooperative</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            value="sacco"
                            checked={currentOrg.type === 'sacco'}
                            onChange={() => handleFormChange('type', 'sacco')}
                            className="mr-2"
                          />
                          <span className={darkMode ? 'text-gray-300' : 'text-gray-700'}>SACCO</span>
                        </label>
                      </div>
                    </div>
                    
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Organization Name*</label>
                      <input 
                        type="text" 
                        value={currentOrg.name}
                        onChange={(e) => handleFormChange('name', e.target.value)}
                        className={`w-full p-2 rounded-md border ${
                          darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'
                        }`}
                        placeholder="e.g., Bugisu Coffee Cooperative"
                        required
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Registration Number*</label>
                        <input 
                          type="text" 
                          value={currentOrg.registrationNumber}
                          onChange={(e) => handleFormChange('registrationNumber', e.target.value)}
                          className={`w-full p-2 rounded-md border ${
                            darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'
                          }`}
                          placeholder="e.g., COOP-123456"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Tax ID (optional)</label>
                        <input 
                          type="text" 
                          value={currentOrg.taxId}
                          onChange={(e) => handleFormChange('taxId', e.target.value)}
                          className={`w-full p-2 rounded-md border ${
                            darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'
                          }`}
                          placeholder="e.g., TAX-123456"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Year Established</label>
                        <input 
                          type="number" 
                          value={currentOrg.yearEstablished}
                          onChange={(e) => handleFormChange('yearEstablished', e.target.value)}
                          className={`w-full p-2 rounded-md border ${
                            darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'
                          }`}
                          placeholder="e.g., 2010"
                          min="1900"
                          max={new Date().getFullYear()}
                        />
                      </div>
                      
                      <div>
                        <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Farmer Count</label>
                        <input 
                          type="number" 
                          value={currentOrg.farmerCount}
                          onChange={(e) => handleFormChange('farmerCount', e.target.value)}
                          className={`w-full p-2 rounded-md border ${
                            darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'
                          }`}
                          placeholder="e.g., 500"
                          min="0"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Annual Coffee Volume (kg)</label>
                      <input 
                        type="number" 
                        value={currentOrg.annualCoffeeVolume}
                        onChange={(e) => handleFormChange('annualCoffeeVolume', e.target.value)}
                        className={`w-full p-2 rounded-md border ${
                          darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'
                        }`}
                        placeholder="e.g., 50000"
                        min="0"
                      />
                    </div>
                    
                    <div className="flex items-center mt-4">
                      <input 
                        type="checkbox" 
                        id="isActive"
                        checked={currentOrg.isActive}
                        onChange={(e) => handleFormChange('isActive', e.target.checked)}
                        className={`mr-2 rounded ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
                      />
                      <label htmlFor="isActive" className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        Organization is active
                      </label>
                    </div>
                  </div>
                )}
                
                {/* Location & Reach Tab */}
                {currentModalTab === 'location' && (
                  <div className="space-y-4">
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Head Office Location</label>
                      <input 
                        type="text" 
                        value={currentOrg.headOfficeLocation}
                        onChange={(e) => handleFormChange('headOfficeLocation', e.target.value)}
                        className={`w-full p-2 rounded-md border ${
                          darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'
                        }`}
                        placeholder="e.g., Kampala, Uganda"
                      />
                    </div>
                    
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Regions of Influence</label>
                      <div className={`p-3 rounded-md border grid grid-cols-2 gap-x-4 gap-y-2 max-h-40 overflow-y-auto ${
                        darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                      }`}>
                        {regions.map(region => (
                          <label key={region} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={currentOrg.regions?.includes(region) || false}
                              onChange={(e) => handleArrayFieldChange('regions', region, e.target.checked)}
                              className="mr-2"
                            />
                            <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              {region}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Organization-specific Details Tab */}
                {currentModalTab === 'details' && currentOrg.type === 'cooperative' && (
                  <div className="space-y-4">
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Certifications</label>
                      <div className={`p-3 rounded-md border grid grid-cols-2 gap-x-4 gap-y-2 max-h-40 overflow-y-auto ${
                        darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                      }`}>
                        {certificationOptions.map(cert => (
                          <label key={cert} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={currentOrg.certifications?.includes(cert) || false}
                              onChange={(e) => handleArrayFieldChange('certifications', cert, e.target.checked)}
                              className="mr-2"
                            />
                            <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                              {cert}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Collection Centers</label>
                        <input 
                          type="number" 
                          value={currentOrg.collectionCenters}
                          onChange={(e) => handleFormChange('collectionCenters', e.target.value)}
                          className={`w-full p-2 rounded-md border ${
                            darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'
                          }`}
                          placeholder="e.g., 5"
                          min="0"
                        />
                      </div>
                      
                      <div className="flex items-center">
                        <input 
                          type="checkbox" 
                          id="processingFacilities"
                          checked={currentOrg.processingFacilities}
                          onChange={(e) => handleFormChange('processingFacilities', e.target.checked)}
                          className={`mr-2 rounded ${darkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'}`}
                        />
                        <label htmlFor="processingFacilities" className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          Has processing facilities
                        </label>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* SACCO-specific Details Tab */}
                {currentModalTab === 'details' && currentOrg.type === 'sacco' && (
                  <div className="space-y-4">
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>License Number</label>
                      <input 
                        type="text" 
                        value={currentOrg.licenseNumber}
                        onChange={(e) => handleFormChange('licenseNumber', e.target.value)}
                        className={`w-full p-2 rounded-md border ${
                          darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'
                        }`}
                        placeholder="e.g., SACCO-LIC-1234"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Savings Volume ($)</label>
                        <input 
                          type="number" 
                          value={currentOrg.savingsVolume}
                          onChange={(e) => handleFormChange('savingsVolume', e.target.value)}
                          className={`w-full p-2 rounded-md border ${
                            darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'
                          }`}
                          placeholder="e.g., 500000"
                          min="0"
                        />
                      </div>
                      
                      <div>
                        <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Loan Portfolio ($)</label>
                        <input 
                          type="number" 
                          value={currentOrg.loanPortfolio}
                          onChange={(e) => handleFormChange('loanPortfolio', e.target.value)}
                          className={`w-full p-2 rounded-md border ${
                            darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'
                          }`}
                          placeholder="e.g., 300000"
                          min="0"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Interest Rate (%)</label>
                      <input 
                        type="number" 
                        value={currentOrg.interestRate}
                        onChange={(e) => handleFormChange('interestRate', e.target.value)}
                        className={`w-full p-2 rounded-md border ${
                          darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-800 placeholder-gray-500'
                        }`}
                        placeholder="e.g., 12.5"
                        min="0"
                        step="0.1"
                      />
                    </div>
                    
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                          Branches
                        </label>
                        <button
                          type="button"
                          onClick={addBranch}
                          className={`text-xs px-2 py-1 rounded ${
                            darkMode 
                              ? 'bg-blue-900/30 text-blue-400 hover:bg-blue-900/50' 
                              : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                          }`}
                        >
                          + Add Branch
                        </button>
                      </div>
                      
                      {currentOrg.branches && currentOrg.branches.length > 0 ? (
                        <div className={`rounded-md border overflow-hidden ${
                          darkMode ? 'border-gray-700' : 'border-gray-300'
                        }`}>
                          {currentOrg.branches.map((branch, index) => (
                            <div 
                              key={index} 
                              className={`p-3 flex flex-col gap-2 ${
                                index !== 0 ? (darkMode ? 'border-t border-gray-700' : 'border-t border-gray-200') : ''
                              }`}
                            >
                              <div className="flex justify-between items-center">
                                <span className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                  Branch {index + 1}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => removeBranch(index)}
                                  className={`text-xs px-2 py-1 rounded ${
                                    darkMode 
                                      ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50' 
                                      : 'bg-red-100 text-red-700 hover:bg-red-200'
                                  }`}
                                >
                                  Remove
                                </button>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <input 
                                    type="text" 
                                    value={branch.location || ''}
                                    onChange={(e) => handleBranchChange(index, 'location', e.target.value)}
                                    className={`w-full p-2 rounded-md border text-sm ${
                                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'
                                    }`}
                                    placeholder="Location"
                                  />
                                </div>
                                <div>
                                  <input 
                                    type="number" 
                                    value={branch.clientCount || ''}
                                    onChange={(e) => handleBranchChange(index, 'clientCount', e.target.value)}
                                    className={`w-full p-2 rounded-md border text-sm ${
                                      darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-800'
                                    }`}
                                    placeholder="Clients"
                                    min="0"
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className={`p-3 text-center rounded-md border ${
                          darkMode ? 'border-gray-700 bg-gray-800 text-gray-400' : 'border-gray-300 bg-gray-50 text-gray-500'
                        }`}>
                          No branches added
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              {/* Modal footer */}
              <div className={`px-6 py-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex justify-between`}>
                <div className="flex gap-2">
                  {currentModalTab === 'basic' ? (
                    <button 
                      onClick={resetAndCloseModal}
                      className={`px-4 py-2 rounded-md text-sm font-medium ${
                        darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Cancel
                    </button>
                  ) : (
                    <button 
                      onClick={() => {
                        if (currentModalTab === 'location') {
                          setCurrentModalTab('basic');
                        } else if (currentModalTab === 'details') {
                          setCurrentModalTab('location');
                        }
                      }}
                      className={`px-4 py-2 rounded-md text-sm font-medium ${
                        darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Back
                    </button>
                  )}
                </div>
                
                <div className="flex gap-2">
                  {currentModalTab !== 'details' ? (
                    <button 
                      onClick={() => {
                        if (currentModalTab === 'basic') {
                          setCurrentModalTab('location');
                        } else if (currentModalTab === 'location') {
                          setCurrentModalTab('details');
                        }
                      }}
                      className={`px-4 py-2 rounded-md text-sm font-medium ${
                        darkMode ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      Next
                    </button>
                  ) : (
                    <button 
                      onClick={handleSaveOrganization}
                      className={`px-4 py-2 rounded-md text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700`}
                    >
                      {editMode ? 'Update Organization' : 'Add Organization'}
                    </button>
                  )}
                </div>
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
                  Delete Organization
                </h3>
                <p className={`mb-4 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Are you sure you want to delete this organization? All associated data will be permanently removed. This action cannot be undone.
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
                    onClick={handleDeleteOrganization}
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
                        Delete Organization
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Add Farmers Modal */}
      {showAddFarmerModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" onClick={() => setShowAddFarmerModal(false)}>
              <div className="absolute inset-0 bg-black opacity-50"></div>
            </div>

            <div className={`inline-block align-bottom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-3xl sm:w-full ${
              darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'
            }`}>
              {/* Modal header */}
              <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <h3 className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Add Farmers to {selectedOrg?.name}
                  </h3>
                  <button 
                    onClick={() => setShowAddFarmerModal(false)}
                    className={`p-1 rounded-full ${darkMode ? 'text-gray-400 hover:bg-gray-700 hover:text-white' : 'text-gray-500 hover:bg-gray-200 hover:text-gray-700'}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" className="h-6 w-6">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              
              {/* Search and instructions */}
              <div className={`px-6 py-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <p className={`mb-3 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  Select farmers to add to this {selectedOrg?.type === 'cooperative' ? 'cooperative' : 'SACCO'}.
                </p>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className={`h-5 w-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                  </div>
                  <input 
                    type="text"
                    placeholder="Search by name, ID, or location..."
                    value={farmerSearchTerm}
                    onChange={(e) => setFarmerSearchTerm(e.target.value)}
                    className={`pl-10 pr-4 py-2 w-full rounded-lg border ${
                      darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
                    }`}
                  />
                </div>
              </div>
              
              {/* Available farmers list */}
              <div className="max-h-96 overflow-y-auto">
                {loadingFarmers ? (
                  <div className="flex justify-center items-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
                  </div>
                ) : availableFarmers.length === 0 ? (
                  <div className="py-12 text-center">
                    <User className={`mx-auto h-12 w-12 mb-4 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
                    <h3 className={`text-lg font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      No Available Farmers
                    </h3>
                    <p className={`max-w-md mx-auto ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      There are no independent farmers or farmers from other organizations available to add.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {availableFarmers
                      .filter(farmer => 
                        farmer.fullName?.toLowerCase().includes(farmerSearchTerm.toLowerCase()) ||
                        farmer.phoneNumber?.toLowerCase().includes(farmerSearchTerm.toLowerCase()) ||
                        farmer.idNumber?.toLowerCase().includes(farmerSearchTerm.toLowerCase()) ||
                        farmer.district?.toLowerCase().includes(farmerSearchTerm.toLowerCase())
                      )
                      .map(farmer => (
                        <div 
                          key={farmer.id} 
                          className={`p-4 flex items-center cursor-pointer ${
                            darkMode 
                              ? 'hover:bg-gray-700' 
                              : 'hover:bg-gray-50'
                          }`}
                          onClick={() => toggleFarmerSelection(farmer.id)}
                        >
                          <input 
                            type="checkbox"
                            checked={selectedFarmers.includes(farmer.id)}
                            onChange={() => {}}
                            className={`h-4 w-4 ${
                              darkMode 
                                ? 'bg-gray-700 border-gray-600 text-indigo-600' 
                                : 'bg-white border-gray-300 text-indigo-600'
                            }`}
                          />
                          <div className="ml-3 flex-1">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                                  {farmer.fullName}
                                </p>
                                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  ID: {farmer.idNumber || 'N/A'} | Phone: {farmer.phoneNumber || 'N/A'}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                  {farmer.district}
                                </p>
                                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  {farmer.farm?.coffeeType || 'N/A'} • {farmer.farm?.size || '0'} acres
                                </p>
                              </div>
                            </div>
                            <div className={`mt-1 text-xs ${darkMode ? 'text-gray-500' : 'text-gray-600'}`}>
                              {farmer.organization?.type === 'independent' 
                                ? 'Independent Farmer'
                                : `Member of: ${farmer.organization?.name || 'Another Organization'}`
                              }
                            </div>
                          </div>
                        </div>
                      ))
                    }
                  </div>
                )}
              </div>
              
              {/* Actions footer */}
              <div className={`px-6 py-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'} flex items-center justify-between`}>
                <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  {selectedFarmers.length} farmer{selectedFarmers.length !== 1 ? 's' : ''} selected
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setShowAddFarmerModal(false)}
                    className={`px-4 py-2 rounded-md text-sm font-medium ${
                      darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={addSelectedFarmersToOrganization}
                    disabled={selectedFarmers.length === 0}
                    className={`px-4 py-2 rounded-md text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 ${
                      selectedFarmers.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    Add Selected Farmers
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

OrganizationsManagement.propTypes = {
  darkMode: PropTypes.bool.isRequired,
  userRole: PropTypes.string.isRequired,
};

export default OrganizationsManagement; 