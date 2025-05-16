import { collection, onSnapshot, query } from 'firebase/firestore';
import { MapPin, Phone, Search, SlidersHorizontal, User, Users } from 'lucide-react';
import PropTypes from 'prop-types';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { db } from '../../firebase/firebase';

// Cache for storing processed agent data
const agentCache = new Map();

const VillageAgentsSection = ({ darkMode }) => {
  const [farmers, setFarmers] = useState([]);
  const [agents, setAgents] = useState([]);
  const [filteredAgents, setFilteredAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [agentFarmers, setAgentFarmers] = useState([]);
  
  // Filter states
  const [districtFilter, setDistrictFilter] = useState('all');
  const [farmersRangeFilter, setFarmersRangeFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [availableDistricts, setAvailableDistricts] = useState([]);
  
  // Transform farmers data into agents data with memoization
  const processAgentData = useCallback((farmersData) => {
    // Generate a cache key based on the farmers data
    const cacheKey = farmersData.length + '_' + farmersData.reduce((acc, f) => acc + (f.updatedAt || 0), 0);
    
    // Return cached result if available
    if (agentCache.has(cacheKey)) {
      console.log('Using cached agent data');
      return agentCache.get(cacheKey);
    }
    
    console.log('Processing agent data from', farmersData.length, 'farmers');
    const startTime = performance.now();
    
    // Process agents data
    const agentMap = new Map();
    const allDistricts = new Set();
    
    farmersData.forEach(farmer => {
      if (farmer.agentDetails && farmer.agentDetails.phoneNumber) {
        const phoneNumber = farmer.agentDetails.phoneNumber;
        const district = farmer.district || farmer.address || 'Unknown';
        allDistricts.add(district);
        
        if (!agentMap.has(phoneNumber)) {
          // Create new agent entry
          agentMap.set(phoneNumber, {
            ...farmer.agentDetails,
            farmerCount: 1,
            districts: new Set([district])
          });
        } else {
          // Update existing agent entry
          const agent = agentMap.get(phoneNumber);
          agent.farmerCount += 1;
          agent.districts.add(district);
        }
      }
    });
    
    // Convert Map to array and make districts countable
    const agentsArray = Array.from(agentMap.entries()).map(([phone, agent]) => ({
      ...agent,
      phoneNumber: phone,
      districtsCount: agent.districts.size,
      districts: Array.from(agent.districts)
    }));
    
    const endTime = performance.now();
    console.log(`Agent processing took ${endTime - startTime}ms`);
    
    // Cache the result
    agentCache.set(cacheKey, {
      agents: agentsArray,
      districts: Array.from(allDistricts).sort()
    });
    
    return { agents: agentsArray, districts: Array.from(allDistricts).sort() };
  }, []);

  // Fetch farmers from Firestore
  useEffect(() => {
    setLoading(true);
    let isMounted = true;

    try {
      // Show cached data immediately if available
      if (agentCache.size > 0 && !initialLoadComplete) {
        const latestCache = Array.from(agentCache.values()).pop();
        setAgents(latestCache.agents);
        setFilteredAgents(latestCache.agents);
        setAvailableDistricts(latestCache.districts);
        setInitialLoadComplete(true);
        setLoading(false);
      }
      
      const farmersQuery = query(collection(db, 'farmers'));
      
      const unsubscribe = onSnapshot(
        farmersQuery, 
        (snapshot) => {
          if (!isMounted) return;

          const farmersData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          setFarmers(farmersData);
          
          // Process agent data efficiently with our memoized function
          const { agents: agentsArray, districts } = processAgentData(farmersData);
          
          setAgents(agentsArray);
          setFilteredAgents(agentsArray);
          setAvailableDistricts(districts);
          setInitialLoadComplete(true);
          setLoading(false);
        }, 
        (error) => {
          console.error("Error fetching farmers:", error);
          if (isMounted) {
            setLoading(false);
          }
        }
      );
      
      return () => {
        isMounted = false;
        unsubscribe();
      };
    } catch (error) {
      console.error("Error setting up Firestore:", error);
      if (isMounted) {
        setLoading(false);
      }
    }
  }, [processAgentData, initialLoadComplete]);

  // Apply filters when filter states change - use useMemo for efficient filtering
  const getFilteredAgents = useMemo(() => {
    if (agents.length === 0) return [];
    console.log('Filtering agents');
    
    let filtered = [...agents];
    
    // Apply district filter
    if (districtFilter !== 'all') {
      filtered = filtered.filter(agent => 
        agent.districts.includes(districtFilter)
      );
    }
    
    // Apply farmers range filter
    if (farmersRangeFilter !== 'all') {
      const ranges = {
        'low': [1, 10],
        'medium': [11, 50],
        'high': [51, 100],
        'veryHigh': [101, Infinity]
      };
      
      const [min, max] = ranges[farmersRangeFilter] || [0, Infinity];
      filtered = filtered.filter(agent => 
        agent.farmerCount >= min && agent.farmerCount <= max
      );
    }
    
    // Apply search query
    if (searchQuery.trim() !== '') {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(agent => 
        (agent.name && agent.name.toLowerCase().includes(query)) ||
        (agent.phoneNumber && agent.phoneNumber.includes(query))
      );
    }
    
    return filtered;
  }, [agents, districtFilter, farmersRangeFilter, searchQuery]);
  
  // Update filtered agents when filters change
  useEffect(() => {
    setFilteredAgents(getFilteredAgents);
  }, [getFilteredAgents]);

  // Handle agent selection with optimized farmer filtering
  const handleAgentSelect = useCallback((agent) => {
    setSelectedAgent(agent);
    
    // Filter farmers for this agent - this is already fast since we have the data in memory
    const agentPhoneNumber = agent.phoneNumber;
    const relatedFarmers = farmers.filter(farmer => 
      farmer.agentDetails && 
      farmer.agentDetails.phoneNumber === agentPhoneNumber
    );
    
    setAgentFarmers(relatedFarmers);
  }, [farmers]);

  // Handle back button click
  const handleBackToAgents = useCallback(() => {
    setSelectedAgent(null);
    setAgentFarmers([]);
  }, []);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          {selectedAgent ? `Agent: ${selectedAgent.name}` : 'Village Agents'}
        </h1>
        <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          {selectedAgent 
            ? `Showing all farmers registered by ${selectedAgent.name}`
            : 'Village agents who have registered farmers in the system'}
        </p>
      </div>
      
      {loading && !initialLoadComplete ? (
        <div className={`w-full h-64 flex items-center justify-center ${darkMode ? 'bg-gray-800' : 'bg-gray-100'} rounded-lg`}>
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {!selectedAgent ? (
            // Agents Table View with Filters
            <>
              {/* Filters Section - Fixed */}
              <div className={`sticky top-0 z-10 p-4 rounded-lg mb-0 ${darkMode ? 'bg-gray-900 border border-gray-700' : 'bg-gray-100 border border-gray-200'}`}>
                <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className={`h-5 w-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                    <span className={`font-medium ${darkMode ? 'text-white' : 'text-gray-700'}`}>Filters:</span>
                  </div>
                  
                  <div className="flex flex-wrap gap-4 items-center w-full md:w-auto">
                    {/* Search Input */}
                    <div className="relative flex-grow md:flex-grow-0 md:w-64">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search className="h-4 w-4 text-gray-500" />
                      </div>
                      <input
                        type="text"
                        placeholder="Search by name or phone"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={`pl-10 pr-4 py-2 w-full rounded-md ${darkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'} border`}
                      />
                    </div>
                    
                    {/* District Filter */}
                    <div className="flex-grow md:flex-grow-0">
                      <select
                        value={districtFilter}
                        onChange={(e) => setDistrictFilter(e.target.value)}
                        className={`w-full px-3 py-2 rounded-md ${darkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'} border`}
                      >
                        <option value="all">All Districts</option>
                        {availableDistricts.map(district => (
                          <option key={district} value={district}>{district}</option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Farmers Range Filter */}
                    <div className="flex-grow md:flex-grow-0">
                      <select
                        value={farmersRangeFilter}
                        onChange={(e) => setFarmersRangeFilter(e.target.value)}
                        className={`w-full px-3 py-2 rounded-md ${darkMode ? 'bg-gray-700 text-white border-gray-600' : 'bg-white text-gray-900 border-gray-300'} border`}
                      >
                        <option value="all">All Farmer Counts</option>
                        <option value="low">1-10 Farmers</option>
                        <option value="medium">11-50 Farmers</option>
                        <option value="high">51-100 Farmers</option>
                        <option value="veryHigh">100+ Farmers</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-sm text-right flex items-center justify-end">
                  <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>
                    Showing {filteredAgents.length} of {agents.length} agents
                  </span>
                  {loading && 
                    <div className="ml-2 inline-block animate-spin h-3 w-3 border-t-2 border-b-2 border-blue-500 rounded-full"></div>
                  }
                </div>
              </div>
              
              {/* Table with fixed header and scrollable body */}
              <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border rounded-lg overflow-hidden mt-4`}>
                <div className="relative overflow-x-auto" style={{ height: 'calc(100vh - 300px)' }}>
                  <table className={`min-w-full ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                    <thead className={`sticky top-0 z-10 ${darkMode ? 'bg-gray-800' : 'bg-gray-50'}`}>
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                          Agent
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                          Contact
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider">
                          Farmers
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider">
                          Districts
                        </th>
                        <th className="px-6 py-3 text-center text-xs font-medium uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {filteredAgents.length > 0 ? (
                        filteredAgents.map((agent, index) => (
                          <tr key={`${agent.phoneNumber}-${index}`} className={index % 2 === 0 ? (darkMode ? 'bg-gray-800' : 'bg-white') : (darkMode ? 'bg-gray-750' : 'bg-gray-50')}>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className={`p-2 rounded-full ${darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-600'} mr-3`}>
                                  <User className="h-5 w-5" />
                                </div>
                                <div>
                                  <div className="font-medium">{agent.name || 'Unknown Agent'}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <Phone className={`h-4 w-4 mr-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                                <span>{agent.phoneNumber}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <div className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-sm font-medium ${agent.farmerCount > 50 ? (darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-800') : agent.farmerCount > 10 ? (darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-800') : (darkMode ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-100 text-purple-800')}`}>
                                {agent.farmerCount}
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <div className="flex justify-center">
                                <div className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-sm font-medium ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-800'}`}>
                                  {agent.districtsCount}
                                </div>
                                <div className="ml-2">
                                  {agent.districts.slice(0, 1).map((district, idx) => (
                                    <span key={idx} className={`inline-block ml-1 text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                      {district}
                                    </span>
                                  ))}
                                  {agent.districts.length > 1 && (
                                    <span className={`inline-block ml-1 text-xs ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                                      +{agent.districts.length - 1} more
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-center">
                              <button
                                onClick={() => handleAgentSelect(agent)}
                                className={`px-3 py-1 rounded-md text-sm ${darkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-100 hover:bg-blue-200 text-blue-700'}`}
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="5" className="px-6 py-4 text-center">
                            {searchQuery || districtFilter !== 'all' || farmersRangeFilter !== 'all' ? 
                              'No agents match the current filters.' : 
                              'No village agents found in the system.'}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          ) : (
            // Agent Detail View with Farmers
            <div>
              <div className="mb-6">
                <button
                  onClick={handleBackToAgents}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-md ${darkMode ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  <span>Back to Agents</span>
                </button>
              </div>
              
              {/* Agent Info Card */}
              <div className={`rounded-lg border p-5 mb-6 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
                <div className="flex items-start space-x-4">
                  <div className={`p-3 rounded-full ${darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                    <User className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className={`font-bold text-lg ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                      {selectedAgent.name || 'Unknown Agent'}
                    </h3>
                    <div className="flex items-center mt-2">
                      <Phone className={`h-4 w-4 mr-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                      <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {selectedAgent.phoneNumber}
                      </span>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-4">
                      <div className={`text-center p-3 rounded-lg border ${darkMode ? 'border-gray-700 bg-gray-700/50' : 'border-gray-200 bg-gray-50'}`}>
                        <div className="flex justify-center mb-1">
                          <Users className={`h-5 w-5 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`} />
                        </div>
                        <div className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                          {selectedAgent.farmerCount}
                        </div>
                        <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          Farmers Registered
                        </div>
                      </div>
                      <div className={`text-center p-3 rounded-lg border ${darkMode ? 'border-gray-700 bg-gray-700/50' : 'border-gray-200 bg-gray-50'}`}>
                        <div className="flex justify-center mb-1">
                          <MapPin className={`h-5 w-5 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`} />
                        </div>
                        <div className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                          {selectedAgent.districtsCount}
                        </div>
                        <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          Districts Covered
                        </div>
                      </div>
                    </div>
                    
                    {/* Districts List */}
                    <div className="mt-4">
                      <h4 className={`font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>Districts:</h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedAgent.districts.map((district, idx) => (
                          <span 
                            key={idx}
                            className={`px-3 py-1 text-xs rounded-full ${darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-200 text-gray-700'}`}
                          >
                            {district}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Farmers List */}
              <h3 className={`font-bold text-lg mb-4 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                Farmers Registered ({agentFarmers.length})
              </h3>
              
              <div className="space-y-4">
                {agentFarmers.length > 0 ? agentFarmers.map((farmer) => (
                  <div 
                    key={farmer.id}
                    className={`rounded-lg border p-4 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}
                  >
                    <div className="flex items-start">
                      <div className={`p-2 rounded-full mr-3 ${farmer.farm?.coffeeType?.toLowerCase().includes('arabica') ? (darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-600') : (darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-600')}`}>
                        <User className="h-4 w-4" />
                      </div>
                      <div>
                        <h4 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                          {farmer.fullName}
                        </h4>
                        <div className="flex items-center text-xs mt-1">
                          <MapPin className={`h-3 w-3 mr-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                          <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>
                            {farmer.district || farmer.address || 'Unknown location'}
                          </span>
                        </div>
                        {farmer.farm?.coffeeType && (
                          <div className="mt-2">
                            <span className={`px-2 py-1 text-xs rounded-full ${farmer.farm.coffeeType.toLowerCase().includes('arabica') ? (darkMode ? 'bg-green-900/20 text-green-400' : 'bg-green-100 text-green-600') : (darkMode ? 'bg-blue-900/20 text-blue-400' : 'bg-blue-100 text-blue-600')}`}>
                              {farmer.farm.coffeeType}
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="ml-auto text-xs">
                        <div className={`text-right ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {farmer.farm?.size && `${farmer.farm.size} acres`}
                        </div>
                        <div className={`text-right mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {farmer.farm?.treesCount && `${farmer.farm.treesCount} trees`}
                        </div>
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className={`text-center py-10 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    No farmers found for this agent.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

VillageAgentsSection.propTypes = {
  darkMode: PropTypes.bool.isRequired
};

export default VillageAgentsSection; 