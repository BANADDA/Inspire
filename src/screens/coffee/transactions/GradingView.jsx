import { collection, doc, getDocs, orderBy, query, setDoc, updateDoc, where } from 'firebase/firestore';
import { Check as CheckIcon, Edit, Eye, FilePlus, Loader2, Star, User, X } from 'lucide-react';
import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { db } from '../../../firebase/firebase';

const GradingView = ({ 
  darkMode, 
  userRole, 
  searchQuery='', 
  statusFilter='all', 
  sortField='gradeDate', 
  sortDirection='desc' 
}) => {
  const [gradeRecords, setGradeRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [farmers, setFarmers] = useState([]);
  const [loadingFarmers, setLoadingFarmers] = useState(false);
  const [harvests, setHarvests] = useState([]);
  const [selectedFarmerHarvests, setSelectedFarmerHarvests] = useState([]);
  const [currentGrade, setCurrentGrade] = useState({
    harvestId: '',
    farmerId: '',
    farmerName: '',
    coffeeType: 'Arabica',
    batchWeight: '',
    moisture: '',
    defectRate: '',
    cupProfile: {
      acidity: 0,
      body: 0,
      flavor: 0,
      aroma: 0,
      aftertaste: 0
    },
    overallScore: 0,
    qualityGrade: 'AA',
    certifications: [],
    gradeDate: null,
    gradedBy: '',
    notes: '',
    status: 'pending',
  });

  // Fetch farmers list from Firestore
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
    
    fetchFarmers();
  }, []);
  
  // Fetch harvests data
  useEffect(() => {
    const fetchHarvests = async () => {
      try {
        const harvestsRef = collection(db, 'harvests');
        const harvestsQuery = query(harvestsRef, orderBy('harvestDate', 'desc'));
        const querySnapshot = await getDocs(harvestsQuery);
        
        const harvestsData = [];
        querySnapshot.forEach((doc) => {
          harvestsData.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        setHarvests(harvestsData);
      } catch (error) {
        console.error("Error fetching harvests:", error);
      }
    };
    
    fetchHarvests();
  }, []);

  // Filter harvests when farmer changes
  useEffect(() => {
    if (currentGrade.farmerId) {
      const farmerHarvests = harvests.filter(
        harvest => harvest.farmerId === currentGrade.farmerId
      );
      setSelectedFarmerHarvests(farmerHarvests);
    } else {
      setSelectedFarmerHarvests([]);
    }
  }, [currentGrade.farmerId, harvests]);

  // Fetch grading records
  useEffect(() => {
    const fetchGradeRecords = async () => {
      setIsLoading(true);
      try {
        let gradesRef = collection(db, 'coffeeGrades');
        let gradesQuery = query(gradesRef);
        
        // Apply status filter if not 'all'
        if (statusFilter !== 'all') {
          gradesQuery = query(gradesQuery, where('status', '==', statusFilter));
        }
        
        // Apply sort
        gradesQuery = query(gradesQuery, orderBy(sortField, sortDirection));
        
        const querySnapshot = await getDocs(gradesQuery);
        
        let records = [];
        querySnapshot.forEach((doc) => {
          records.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        // Apply search filter (client-side)
        if (searchQuery) {
          const searchLower = searchQuery.toLowerCase();
          records = records.filter(record => 
            record.farmerName?.toLowerCase().includes(searchLower) ||
            record.coffeeType?.toLowerCase().includes(searchLower) ||
            record.qualityGrade?.toLowerCase().includes(searchLower) ||
            record.harvestId?.toLowerCase().includes(searchLower)
          );
        }
        
        setGradeRecords(records);
      } catch (error) {
        console.error("Error fetching grade records:", error);
        toast.error("Failed to load grade records");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchGradeRecords();
  }, [searchQuery, statusFilter, sortField, sortDirection]);

  // View details of a specific record
  const handleViewDetails = (record) => {
    setSelectedRecord(record);
    setShowDetailsModal(true);
  };

  // Edit a grade record
  const handleEditGrade = (record) => {
    setCurrentGrade({
      ...record,
      batchWeight: record.batchWeight?.toString() || '',
      moisture: record.moisture?.toString() || '',
      defectRate: record.defectRate?.toString() || ''
    });
    setShowEditModal(true);
  };

  // Add new grade record
  const handleAddGrade = () => {
    setCurrentGrade({
      harvestId: '',
      farmerId: '',
      farmerName: '',
      coffeeType: 'Arabica',
      batchWeight: '',
      moisture: '',
      defectRate: '',
      cupProfile: {
        acidity: 0,
        body: 0,
        flavor: 0,
        aroma: 0,
        aftertaste: 0
      },
      overallScore: 0,
      qualityGrade: 'AA',
      certifications: [],
      gradeDate: null,
      gradedBy: '',
      notes: '',
      status: 'pending',
    });
    setShowEditModal(true);
  };

  // Handle form field changes
  const handleFormChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setCurrentGrade(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: parseFloat(value) || 0
        }
      }));
      
      // Recalculate overall score if cup profile changed
      if (parent === 'cupProfile') {
        const cupProfile = {
          ...currentGrade.cupProfile,
          [child]: parseFloat(value) || 0
        };
        
        const overallScore = calculateOverallScore(cupProfile);
        setCurrentGrade(prev => ({
          ...prev,
          overallScore
        }));
      }
    } else {
      setCurrentGrade(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  // Calculate overall score based on cup profile
  const calculateOverallScore = (cupProfile) => {
    const { acidity, body, flavor, aroma, aftertaste } = cupProfile;
    // Each attribute contributes 20 points max to the overall score (5 attributes * 20 = 100)
    return Math.round((acidity + body + flavor + aroma + aftertaste) * 2);
  };

  // Determine quality grade based on score
  const determineQualityGrade = (score) => {
    if (score >= 90) return 'AA+';
    if (score >= 80) return 'AA';
    if (score >= 70) return 'AB';
    if (score >= 60) return 'B';
    if (score >= 50) return 'C';
    return 'PB'; // Below 50
  };

  // Handle certification toggle
  const toggleCertification = (cert) => {
    setCurrentGrade(prev => {
      const currentCerts = [...(prev.certifications || [])];
      const index = currentCerts.indexOf(cert);
      
      if (index >= 0) {
        currentCerts.splice(index, 1);
      } else {
        currentCerts.push(cert);
      }
      
      return {
        ...prev,
        certifications: currentCerts
      };
    });
  };

  // Handle farmer selection
  const handleFarmerSelect = (farmerId) => {
    const selectedFarmer = farmers.find(farmer => farmer.id === farmerId);
    
    if (selectedFarmer) {
      setCurrentGrade(prev => ({
        ...prev,
        farmerId: selectedFarmer.id,
        farmerName: selectedFarmer.fullName || selectedFarmer.firstName + ' ' + selectedFarmer.lastName
      }));
    }
  };
  
  // Handle harvest selection
  const handleHarvestSelect = (harvestId) => {
    const selectedHarvest = harvests.find(harvest => harvest.id === harvestId);
    
    if (selectedHarvest) {
      setCurrentGrade(prev => ({
        ...prev,
        harvestId: selectedHarvest.id,
        coffeeType: selectedHarvest.coffeeType || prev.coffeeType,
        batchWeight: selectedHarvest.weight?.toString() || prev.batchWeight
      }));
    }
  };

  // Save grade record to Firestore
  const saveGrade = async () => {
    try {
      // Validate required fields
      if (!currentGrade.farmerName || !currentGrade.coffeeType) {
        toast.error("Please fill in required fields");
        return;
      }
      
      // Format data for saving
      const gradeData = {
        ...currentGrade,
        batchWeight: parseFloat(currentGrade.batchWeight) || 0,
        moisture: parseFloat(currentGrade.moisture) || 0,
        defectRate: parseFloat(currentGrade.defectRate) || 0,
        gradeDate: currentGrade.gradeDate || new Date(),
        updatedAt: new Date()
      };
      
      // If it's a new record, add createdAt
      if (!currentGrade.id) {
        gradeData.createdAt = new Date();
        gradeData.qualityGrade = determineQualityGrade(gradeData.overallScore);
      }
      
      // Save to Firestore
      if (currentGrade.id) {
        // Update existing record
        await updateDoc(doc(db, 'coffeeGrades', currentGrade.id), gradeData);
        toast.success("Grade record updated successfully");
      } else {
        // Create new record
        await setDoc(doc(collection(db, 'coffeeGrades')), gradeData);
        toast.success("New grade record created successfully");
      }
      
      // Close modal and refresh data
      setShowEditModal(false);
      
      // Refresh data
      const fetchGrades = async () => {
        setIsLoading(true);
        try {
          let gradesRef = collection(db, 'coffeeGrades');
          let gradesQuery = query(gradesRef);
          
          // Apply status filter if not 'all'
          if (statusFilter !== 'all') {
            gradesQuery = query(gradesQuery, where('status', '==', statusFilter));
          }
          
          // Apply sort
          gradesQuery = query(gradesQuery, orderBy(sortField, sortDirection));
          
          const querySnapshot = await getDocs(gradesQuery);
          
          let records = [];
          querySnapshot.forEach((doc) => {
            records.push({
              id: doc.id,
              ...doc.data()
            });
          });
          
          setGradeRecords(records);
        } catch (error) {
          console.error("Error fetching grade records:", error);
          toast.error("Failed to refresh grade records");
        } finally {
          setIsLoading(false);
        }
      };
      
      fetchGrades();
      
    } catch (error) {
      console.error("Error saving grade record:", error);
      toast.error("Failed to save grade record");
    }
  };

  return (
    <div className="w-full">
      {/* Header with add button */}
      <div className="flex justify-between items-center mb-4">
        <h2 className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          Coffee Quality Grading
        </h2>
        {userRole === 'admin' && (
          <button
            onClick={handleAddGrade}
            className={`px-3 py-2 rounded-md flex items-center space-x-1 ${
              darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'
            } text-white`}
          >
            <FilePlus className="h-4 w-4" />
            <span>New Grade</span>
          </button>
        )}
      </div>

      {/* Main content */}
      <div className={`rounded-lg border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        {isLoading ? (
          <div className="flex justify-center items-center p-8">
            <Loader2 className={`h-8 w-8 animate-spin ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className={darkMode ? 'bg-gray-800' : 'bg-gray-50'}>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Grade ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Farmer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Coffee Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Quality Grade
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Date Graded
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
              {gradeRecords.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center">
                    No grading records found
                  </td>
                </tr>
              ) : (
                gradeRecords.map((record) => (
                  <tr key={record.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {record.id.substring(0, 8)}...
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {record.farmerName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {record.coffeeType}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="flex items-center">
                        <Star className={`h-4 w-4 mr-1 ${record.qualityGrade === 'AA' ? 'text-yellow-500' : 'text-gray-400'}`} />
                        {record.qualityGrade}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {record.overallScore}/100
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {record.gradeDate ? new Date(record.gradeDate.toDate()).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleViewDetails(record)}
                          className="text-gray-400 hover:text-blue-500"
                        >
                          <Eye className="h-5 w-5" />
                        </button>
                        {userRole === 'admin' && (
                          <button
                            onClick={() => handleEditGrade(record)}
                            className="text-gray-400 hover:text-yellow-500"
                          >
                            <Edit className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Details Modal */}
      {selectedRecord && showDetailsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-2xl rounded-lg shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} p-6`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                Coffee Grading Details
              </h3>
              <button 
                onClick={() => setShowDetailsModal(false)}
                className={`p-1 rounded-full ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Farmer</p>
                <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>{selectedRecord.farmerName}</p>
              </div>
              
              <div>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Harvest ID</p>
                <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>{selectedRecord.harvestId || 'N/A'}</p>
              </div>
              
              <div>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Coffee Type</p>
                <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>{selectedRecord.coffeeType}</p>
              </div>
              
              <div>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Batch Weight</p>
                <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>{selectedRecord.batchWeight} kg</p>
              </div>
              
              <div>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Quality Grade</p>
                <p className={`font-medium flex items-center ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  <Star className={`h-4 w-4 mr-1 ${selectedRecord.qualityGrade === 'AA' ? 'text-yellow-500' : 'text-gray-400'}`} />
                  {selectedRecord.qualityGrade}
                </p>
              </div>
              
              <div>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Overall Score</p>
                <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>{selectedRecord.overallScore}/100</p>
              </div>
              
              <div>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Moisture Content</p>
                <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>{selectedRecord.moisture}%</p>
              </div>
              
              <div>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Defect Rate</p>
                <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>{selectedRecord.defectRate}%</p>
              </div>
            </div>
            
            <div className="mb-6">
              <p className={`text-sm mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Cup Profile</p>
              <div className={`grid grid-cols-5 gap-2 p-3 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                <div className="text-center">
                  <p className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Acidity</p>
                  <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>{selectedRecord.cupProfile?.acidity || 0}/10</p>
                </div>
                <div className="text-center">
                  <p className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Body</p>
                  <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>{selectedRecord.cupProfile?.body || 0}/10</p>
                </div>
                <div className="text-center">
                  <p className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Flavor</p>
                  <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>{selectedRecord.cupProfile?.flavor || 0}/10</p>
                </div>
                <div className="text-center">
                  <p className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Aroma</p>
                  <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>{selectedRecord.cupProfile?.aroma || 0}/10</p>
                </div>
                <div className="text-center">
                  <p className={`text-xs ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Aftertaste</p>
                  <p className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>{selectedRecord.cupProfile?.aftertaste || 0}/10</p>
                </div>
              </div>
            </div>
            
            {selectedRecord.certifications?.length > 0 && (
              <div className="mb-6">
                <p className={`text-sm mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Certifications</p>
                <div className="flex flex-wrap gap-2">
                  {selectedRecord.certifications.map((cert, index) => (
                    <span 
                      key={index}
                      className={`px-2 py-1 text-xs rounded-full ${
                        darkMode ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-800'
                      }`}
                    >
                      <CheckIcon className="h-3 w-3 inline mr-1" />
                      {cert}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {selectedRecord.notes && (
              <div className="mb-6">
                <p className={`text-sm mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Notes</p>
                <p className={`p-3 rounded-lg ${darkMode ? 'bg-gray-700 text-white' : 'bg-gray-100 text-gray-800'}`}>
                  {selectedRecord.notes}
                </p>
              </div>
            )}
            
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowDetailsModal(false)}
                className={`px-4 py-2 rounded-md ${
                  darkMode 
                    ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                }`}
              >
                Close
              </button>
              {userRole === 'admin' && (
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    handleEditGrade(selectedRecord);
                  }}
                  className={`px-4 py-2 rounded-md flex items-center space-x-1 ${
                    darkMode ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-600 hover:bg-blue-700'
                  } text-white`}
                >
                  <Edit className="h-4 w-4" />
                  <span>Edit Grade</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* Edit/Add Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`w-full max-w-2xl rounded-lg shadow-lg ${darkMode ? 'bg-gray-800' : 'bg-white'} p-6 overflow-y-auto max-h-[90vh]`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className={`text-xl font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                {currentGrade.id ? 'Edit Coffee Grade' : 'New Coffee Grade'}
              </h3>
              <button 
                onClick={() => setShowEditModal(false)}
                className={`p-1 rounded-full ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* Basic Information */}
              <div className="col-span-2">
                <h4 className={`font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Basic Information</h4>
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Farmer*
                </label>
                {loadingFarmers ? (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading farmers...</span>
                  </div>
                ) : (
                  <div className="relative">
                    <select
                      value={currentGrade.farmerId}
                      onChange={(e) => handleFarmerSelect(e.target.value)}
                      className={`w-full px-3 py-2 rounded-md border appearance-none ${
                        darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                      }`}
                      required
                    >
                      <option value="">Select a farmer</option>
                      {farmers.map(farmer => (
                        <option key={farmer.id} value={farmer.id}>
                          {farmer.fullName || `${farmer.firstName} ${farmer.lastName}`}
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
                  Harvest
                </label>
                <select
                  value={currentGrade.harvestId}
                  onChange={(e) => handleHarvestSelect(e.target.value)}
                  className={`w-full px-3 py-2 rounded-md border ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  disabled={!currentGrade.farmerId}
                >
                  <option value="">Select a harvest</option>
                  {selectedFarmerHarvests.map(harvest => (
                    <option key={harvest.id} value={harvest.id}>
                      {new Date(harvest.harvestDate?.toDate?.() || harvest.harvestDate).toLocaleDateString()} 
                      {harvest.weight ? ` - ${harvest.weight}kg` : ''}
                    </option>
                  ))}
                </select>
                {currentGrade.farmerId && selectedFarmerHarvests.length === 0 && (
                  <p className={`text-xs mt-1 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`}>
                    No harvests found for this farmer
                  </p>
                )}
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Coffee Type*
                </label>
                <select
                  value={currentGrade.coffeeType}
                  onChange={(e) => handleFormChange('coffeeType', e.target.value)}
                  className={`w-full px-3 py-2 rounded-md border ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  required
                >
                  <option value="Arabica">Arabica</option>
                  <option value="Robusta">Robusta</option>
                  <option value="Mixed">Mixed</option>
                </select>
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Batch Weight (kg)
                </label>
                <input
                  type="number"
                  value={currentGrade.batchWeight}
                  onChange={(e) => handleFormChange('batchWeight', e.target.value)}
                  className={`w-full px-3 py-2 rounded-md border ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  step="0.1"
                  min="0"
                />
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Status
                </label>
                <select
                  value={currentGrade.status}
                  onChange={(e) => handleFormChange('status', e.target.value)}
                  className={`w-full px-3 py-2 rounded-md border ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              
              {/* Physical Properties */}
              <div className="col-span-2 mt-4">
                <h4 className={`font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Physical Properties</h4>
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Moisture Content (%)
                </label>
                <input
                  type="number"
                  value={currentGrade.moisture}
                  onChange={(e) => handleFormChange('moisture', e.target.value)}
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
                  Defect Rate (%)
                </label>
                <input
                  type="number"
                  value={currentGrade.defectRate}
                  onChange={(e) => handleFormChange('defectRate', e.target.value)}
                  className={`w-full px-3 py-2 rounded-md border ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  step="0.1"
                  min="0"
                  max="100"
                />
              </div>
              
              {/* Cup Profile */}
              <div className="col-span-2 mt-4">
                <h4 className={`font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Cup Profile (Score 0-10)</h4>
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Acidity
                </label>
                <div className="flex items-center">
                  <input
                    type="range"
                    value={currentGrade.cupProfile?.acidity || 0}
                    onChange={(e) => handleFormChange('cupProfile.acidity', e.target.value)}
                    className="flex-1 h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                    min="0"
                    max="10"
                    step="0.5"
                  />
                  <span className={`ml-2 w-8 text-center ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {currentGrade.cupProfile?.acidity || 0}
                  </span>
                </div>
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Body
                </label>
                <div className="flex items-center">
                  <input
                    type="range"
                    value={currentGrade.cupProfile?.body || 0}
                    onChange={(e) => handleFormChange('cupProfile.body', e.target.value)}
                    className="flex-1 h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                    min="0"
                    max="10"
                    step="0.5"
                  />
                  <span className={`ml-2 w-8 text-center ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {currentGrade.cupProfile?.body || 0}
                  </span>
                </div>
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Flavor
                </label>
                <div className="flex items-center">
                  <input
                    type="range"
                    value={currentGrade.cupProfile?.flavor || 0}
                    onChange={(e) => handleFormChange('cupProfile.flavor', e.target.value)}
                    className="flex-1 h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                    min="0"
                    max="10"
                    step="0.5"
                  />
                  <span className={`ml-2 w-8 text-center ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {currentGrade.cupProfile?.flavor || 0}
                  </span>
                </div>
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Aroma
                </label>
                <div className="flex items-center">
                  <input
                    type="range"
                    value={currentGrade.cupProfile?.aroma || 0}
                    onChange={(e) => handleFormChange('cupProfile.aroma', e.target.value)}
                    className="flex-1 h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                    min="0"
                    max="10"
                    step="0.5"
                  />
                  <span className={`ml-2 w-8 text-center ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {currentGrade.cupProfile?.aroma || 0}
                  </span>
                </div>
              </div>
              
              <div>
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Aftertaste
                </label>
                <div className="flex items-center">
                  <input
                    type="range"
                    value={currentGrade.cupProfile?.aftertaste || 0}
                    onChange={(e) => handleFormChange('cupProfile.aftertaste', e.target.value)}
                    className="flex-1 h-2 bg-gray-300 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                    min="0"
                    max="10"
                    step="0.5"
                  />
                  <span className={`ml-2 w-8 text-center ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {currentGrade.cupProfile?.aftertaste || 0}
                  </span>
                </div>
              </div>
              
              <div>
                <div className={`p-4 rounded-lg ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'} flex items-center justify-between`}>
                  <div>
                    <p className={`text-sm font-medium ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>Overall Score</p>
                    <p className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{currentGrade.overallScore}/100</p>
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>Quality Grade</p>
                    <p className={`text-xl font-bold flex items-center ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      <Star className={`h-5 w-5 mr-1 text-yellow-500`} />
                      {determineQualityGrade(currentGrade.overallScore)}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Certifications */}
              <div className="col-span-2 mt-4">
                <h4 className={`font-medium mb-2 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>Certifications</h4>
                <div className="flex flex-wrap gap-2">
                  {['Organic', 'Fair Trade', 'Rainforest Alliance', 'UTZ', 'Bird Friendly'].map((cert) => (
                    <button
                      key={cert}
                      type="button"
                      onClick={() => toggleCertification(cert)}
                      className={`px-3 py-1 rounded-full text-sm ${
                        currentGrade.certifications?.includes(cert)
                          ? darkMode
                            ? 'bg-green-900 text-green-300'
                            : 'bg-green-100 text-green-800'
                          : darkMode
                            ? 'bg-gray-700 text-gray-300'
                            : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {currentGrade.certifications?.includes(cert) && (
                        <CheckIcon className="h-3 w-3 inline mr-1" />
                      )}
                      {cert}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Notes */}
              <div className="col-span-2 mt-4">
                <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Notes
                </label>
                <textarea
                  value={currentGrade.notes}
                  onChange={(e) => handleFormChange('notes', e.target.value)}
                  className={`w-full px-3 py-2 rounded-md border ${
                    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  rows="3"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setShowEditModal(false)}
                className={`px-4 py-2 rounded-md ${
                  darkMode 
                    ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={saveGrade}
                className={`px-4 py-2 rounded-md flex items-center space-x-1 ${
                  darkMode ? 'bg-green-600 hover:bg-green-700' : 'bg-green-600 hover:bg-green-700'
                } text-white`}
              >
                <CheckIcon className="h-4 w-4" />
                <span>Save Grade</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

GradingView.propTypes = {
  darkMode: PropTypes.bool.isRequired,
  userRole: PropTypes.string.isRequired,
  searchQuery: PropTypes.string,
  statusFilter: PropTypes.string,
  sortField: PropTypes.string,
  sortDirection: PropTypes.string
};

export default GradingView; 