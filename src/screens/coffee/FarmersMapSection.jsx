import { collection, onSnapshot, query } from 'firebase/firestore';
import L from 'leaflet';
import 'leaflet.markercluster/dist/leaflet.markercluster.js';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet/dist/leaflet.css';
import { Coffee, MapPin, Phone, User } from 'lucide-react';
import PropTypes from 'prop-types';
import { useEffect, useRef, useState } from 'react';
import { db } from '../../firebase/firebase';

// Fix Leaflet icon issues
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// Helper functions
function getMarkerColor(coffeeType) {
  if (!coffeeType) return '#8B5CF6'; // Purple for unknown/mixed
  
  const type = coffeeType.toLowerCase();
  if (type.includes('arabica')) return '#10B981'; // Green
  if (type.includes('robusta')) return '#3B82F6'; // Blue
  return '#8B5CF6'; // Purple for other types
}

function getCoordinates(farmer) {
  try {
    // Check location.gpsCoordinates (object format)
    if (farmer.location?.gpsCoordinates) {
      if (typeof farmer.location.gpsCoordinates === 'object') {
        const { latitude, longitude } = farmer.location.gpsCoordinates;
        if (isValidCoord(latitude) && isValidCoord(longitude)) {
          return [latitude, longitude];
        }
      }
      
      // Check location.gpsCoordinates (string format)
      if (typeof farmer.location.gpsCoordinates === 'string' && 
          farmer.location.gpsCoordinates.includes(',')) {
        const [lat, lng] = farmer.location.gpsCoordinates.split(',');
        const latitude = parseFloat(lat.trim());
        const longitude = parseFloat(lng.trim());
        if (isValidCoord(latitude) && isValidCoord(longitude)) {
          return [latitude, longitude];
        }
      }
    }
    
    // Check direct gpsCoordinates property
    if (farmer.gpsCoordinates) {
      const { latitude, longitude } = farmer.gpsCoordinates;
      if (isValidCoord(latitude) && isValidCoord(longitude)) {
        return [latitude, longitude];
      }
    }
    
    // Approximate by district or region
    if (farmer.district) {
      return getApproximateLocation(farmer.district);
    }
    
    return null;
  } catch (error) {
    console.error("Error parsing coordinates:", error);
    return null;
  }
}

function isValidCoord(value) {
  return typeof value === 'number' && !isNaN(value);
}

function getApproximateLocation(location) {
  if (!location) return null;
  
  const locationStr = location.toLowerCase();
  
  // Uganda regions approximate coordinates
  if (locationStr.includes('kampala') || locationStr.includes('central')) {
    return [0.3476, 32.5825];
  }
  if (locationStr.includes('jinja') || locationStr.includes('eastern')) {
    return [0.4478, 33.2026];
  }
  if (locationStr.includes('gulu') || locationStr.includes('northern')) {
    return [2.7746, 32.2994];
  }
  if (locationStr.includes('mbarara') || locationStr.includes('western')) {
    return [0.6086, 30.6583];
  }
  
  // Default to center of Uganda if no match
  return [1.3733, 32.2903];
}

// Farmer tooltip content generator
function createTooltipContent(farmer) {
  return `
    <div class="farmer-tooltip">
      <div class="farmer-name">${farmer.fullName || 'Unknown'}</div>
      <div class="farmer-type">${farmer.farm?.coffeeType || 'Unknown type'}</div>
      <div class="farmer-location">${farmer.district || 'Unknown location'}</div>
      ${farmer.farm?.size ? `<div class="farmer-size">Farm size: ${farmer.farm.size} acres</div>` : ''}
      ${farmer.farm?.treesCount ? `<div class="farmer-trees">Trees: ${farmer.farm.treesCount}</div>` : ''}
    </div>
  `;
}

// Update the LeafletMap component to include map controls inside
function LeafletMap({ region, farmers, onMarkerClick, darkMode, onRegionChange, regions, selectedRegion, onOpenLargerMap }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const clusterLayerRef = useRef(null);
  const polygonsRef = useRef({});
  
  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    
    // Create map instance if it doesn't exist
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapContainerRef.current, {
        attributionControl: false, // Hide attribution initially
        zoomControl: false // Hide zoom control initially
      }).setView(
        region.center,
        region.zoom
      );
      
      // Add tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      }).addTo(mapInstanceRef.current);
      
      // Add zoom control to top-right
      L.control.zoom({
        position: 'topright'
      }).addTo(mapInstanceRef.current);
      
      // Add attribution to bottom-right
      L.control.attribution({
        position: 'bottomright'
      }).addTo(mapInstanceRef.current);

      // Add custom CSS for tooltips
      const style = document.createElement('style');
      style.textContent = `
        .farmer-tooltip {
          font-size: 12px;
          padding: 3px;
        }
        .farmer-name {
          font-weight: bold;
          margin-bottom: 2px;
        }
        .farmer-type, .farmer-location, .farmer-size, .farmer-trees {
          font-size: 11px;
          margin-bottom: 2px;
        }
        .cluster-info {
          padding: 10px;
          background: white;
          border: 1px solid #ccc;
          border-radius: 5px;
        }
        .cluster-info h4 {
          margin: 0 0 5px 0;
          font-size: 14px;
        }
        .cluster-info p {
          margin: 0;
          font-size: 12px;
        }
      `;
      document.head.appendChild(style);
    }
    
    // Update map view when region changes
    mapInstanceRef.current.setView(region.center, region.zoom);
    
    // Cleanup on unmount
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [region]);
  
  // Update markers when farmers change
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    
    // Clear previous markers and clusters
    if (markersLayerRef.current) {
      mapInstanceRef.current.removeLayer(markersLayerRef.current);
    }
    
    if (clusterLayerRef.current) {
      mapInstanceRef.current.removeLayer(clusterLayerRef.current);
    }
    
    // Remove existing polygons
    Object.values(polygonsRef.current).forEach(polygon => {
      if (mapInstanceRef.current.hasLayer(polygon)) {
        mapInstanceRef.current.removeLayer(polygon);
      }
    });
    polygonsRef.current = {};
    
    // Create new marker cluster group
    const clusterGroup = L.markerClusterGroup({
      showCoverageOnHover: true,
      zoomToBoundsOnClick: true,
      maxClusterRadius: 50,
      iconCreateFunction: function(cluster) {
        const childCount = cluster.getChildCount();
        const markers = cluster.getAllChildMarkers();
        
        // Count types
        const types = {
          arabica: 0,
          robusta: 0,
          other: 0
        };
        
        markers.forEach(marker => {
          const coffeeType = marker.options.farmerData?.farm?.coffeeType?.toLowerCase() || '';
          if (coffeeType.includes('arabica')) {
            types.arabica++;
          } else if (coffeeType.includes('robusta')) {
            types.robusta++;
          } else {
            types.other++;
          }
        });
        
        // Determine the dominant type
        let color = '#8B5CF6'; // Default purple
        if (types.arabica > types.robusta && types.arabica > types.other) {
          color = '#10B981'; // Green for Arabica dominant
        } else if (types.robusta > types.arabica && types.robusta > types.other) {
          color = '#3B82F6'; // Blue for Robusta dominant
        }
        
        return L.divIcon({
          html: `<div style="background-color:${color};width:${30 + Math.min(childCount, 20)}px;height:${30 + Math.min(childCount, 20)}px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;border:2px solid white">${childCount}</div>`,
          className: 'custom-cluster-icon',
          iconSize: [40, 40],
          iconAnchor: [20, 20]
        });
      }
    });
    
    // Group farmers by their approximate location (with some tolerance)
    const locationGroups = {};
    const tolerance = 0.01; // ~1km tolerance
    
    farmers.forEach(farmer => {
      const coords = getCoordinates(farmer);
      if (!coords) return;
      
      const [lat, lng] = coords;
      const key = `${Math.round(lat/tolerance)}:${Math.round(lng/tolerance)}`;
      
      if (!locationGroups[key]) {
        locationGroups[key] = {
          center: [lat, lng],
          farmers: []
        };
      }
      
      locationGroups[key].farmers.push(farmer);
    });
    
    // Create polygons for groups with multiple farmers
    Object.entries(locationGroups).forEach(([key, group]) => {
      if (group.farmers.length >= 3) {
        const points = group.farmers.map(farmer => {
          const coords = getCoordinates(farmer);
          if (coords) return coords;
          return group.center; // Fallback to center
        });
        
        // Create convex hull or just a circle if points are too close
        try {
          const latlngs = points.map(point => L.latLng(point[0], point[1]));
          
          // Calculate dominant coffee type
          const types = {
            arabica: 0,
            robusta: 0,
            other: 0
          };
          
          group.farmers.forEach(farmer => {
            const coffeeType = farmer.farm?.coffeeType?.toLowerCase() || '';
            if (coffeeType.includes('arabica')) {
              types.arabica++;
            } else if (coffeeType.includes('robusta')) {
              types.robusta++;
            } else {
              types.other++;
            }
          });
          
          // Determine polygon color based on dominant type
          let fillColor = '#8B5CF6'; // Purple default
          if (types.arabica > types.robusta && types.arabica > types.other) {
            fillColor = '#10B981'; // Green
          } else if (types.robusta > types.arabica && types.robusta > types.other) {
            fillColor = '#3B82F6'; // Blue
          }
          
          const polygon = L.polygon(latlngs, {
            fillColor: fillColor,
            fillOpacity: 0.2,
            color: fillColor,
            weight: 2
          });
          
          // Add click event to zoom in
          polygon.on('click', function() {
            const bounds = polygon.getBounds();
            mapInstanceRef.current.fitBounds(bounds, {
              padding: [50, 50],
              maxZoom: 12
            });
          });
          
          // Add tooltip with count
          polygon.bindTooltip(`${group.farmers.length} coffee farmers in this area`, {
            permanent: false,
            direction: 'center',
            className: 'cluster-info'
          });
          
          polygon.addTo(mapInstanceRef.current);
          polygonsRef.current[key] = polygon;
        } catch (error) {
          console.error("Error creating polygon:", error);
        }
      }
    });
    
    // Add markers for each farmer
    farmers.forEach(farmer => {
      const coords = getCoordinates(farmer);
      if (!coords) return;
      
      const [lat, lng] = coords;
      
      // Create custom icon
      const markerColor = getMarkerColor(farmer.farm?.coffeeType);
      const icon = L.divIcon({
        html: `<div style="background-color:${markerColor};width:10px;height:10px;border-radius:50%;border:2px solid white"></div>`,
        className: 'custom-div-icon',
        iconSize: [14, 14],
        iconAnchor: [7, 7]
      });
      
      const marker = L.marker([lat, lng], { 
        icon,
        farmerData: farmer // Attach farmer data to marker for use in cluster
      });
      
      // Add tooltip (shown on hover)
      marker.bindTooltip(createTooltipContent(farmer), {
        permanent: false,
        direction: 'top',
        offset: [0, -10]
      });
      
      // Add popup (shown on click)
      marker.bindPopup(`<b>${farmer.fullName || 'Unknown'}</b><br>${farmer.farm?.coffeeType || 'Unknown'}`);
      
      // Add click handler
      marker.on('click', () => {
        onMarkerClick(farmer);
        
        // Zoom to marker
        mapInstanceRef.current.setView([lat, lng], 13);
      });
      
      clusterGroup.addLayer(marker);
    });
    
    // Add cluster group to map
    clusterGroup.addTo(mapInstanceRef.current);
    clusterLayerRef.current = clusterGroup;
    
    // Cleanup when component unmounts or dependencies change
    return () => {
      if (clusterLayerRef.current && mapInstanceRef.current) {
        mapInstanceRef.current.removeLayer(clusterLayerRef.current);
      }
      
      // Remove polygons
      Object.values(polygonsRef.current).forEach(polygon => {
        if (mapInstanceRef.current.hasLayer(polygon)) {
          mapInstanceRef.current.removeLayer(polygon);
        }
      });
    };
  }, [farmers, onMarkerClick]);
  
  return (
    <div className="relative h-full">
      {/* Map container */}
      <div 
        ref={mapContainerRef} 
        className="h-full w-full" 
        style={{ background: darkMode ? '#1F2937' : '#f3f4f6' }}
      ></div>
      
      {/* Open Larger Map button */}
      <div className="absolute bottom-4 right-4 z-50">
        <button 
          className="px-4 py-2 text-xs rounded-full bg-green-500 text-white hover:bg-green-600 shadow-md"
          onClick={onOpenLargerMap}
        >
          Open Larger Map
        </button>
      </div>
      
      {/* Help Instructions */}
      <div className="absolute top-4 left-4 z-50 bg-white bg-opacity-80 dark:bg-gray-800 dark:bg-opacity-80 p-2 rounded-md shadow-md text-xs max-w-[200px]">
        <p className={`${darkMode ? 'text-gray-200' : 'text-gray-700'} mb-1 font-medium`}>Map Instructions:</p>
        <ul className={`${darkMode ? 'text-gray-300' : 'text-gray-600'} list-disc pl-4 space-y-1`}>
          <li>Click on clusters (numbered circles) to zoom in</li>
          <li>Hover on markers to see farmer details</li>
          <li>Click on shaded areas to focus on farmer groups</li>
        </ul>
      </div>
      
      {/* Leaflet Attribution - Bottom right */}
      <div className="absolute bottom-1 right-1 z-10 text-xs text-gray-600">
        <a href="https://leafletjs.com" target="_blank" rel="noopener noreferrer">Leaflet</a> | 
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer"> © OpenStreetMap</a>
      </div>
    </div>
  );
}

LeafletMap.propTypes = {
  region: PropTypes.object.isRequired,
  farmers: PropTypes.array.isRequired,
  onMarkerClick: PropTypes.func.isRequired,
  darkMode: PropTypes.bool.isRequired,
  onRegionChange: PropTypes.func.isRequired,
  regions: PropTypes.object.isRequired,
  selectedRegion: PropTypes.string.isRequired,
  onOpenLargerMap: PropTypes.func.isRequired
};

// Main component
const FarmersMapSection = ({ darkMode }) => {
  const [farmers, setFarmers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFarmer, setSelectedFarmer] = useState(null);
  const [selectedRegion, setSelectedRegion] = useState('all');
  const [mapReady, setMapReady] = useState(false);
  
  // Define Uganda regions with coordinates for map
  const regions = {
    all: {
      name: "All Uganda",
      center: [1.3733, 32.2903],
      zoom: 7
    },
    northern: {
      name: "Northern",
      center: [2.8328, 32.3300],
      zoom: 8
    },
    eastern: {
      name: "Eastern",
      center: [1.5865, 33.7933],
      zoom: 8
    },
    central: {
      name: "Central",
      center: [0.3476, 32.5826],
      zoom: 8
    },
    western: {
      name: "Western",
      center: [0.6086, 30.6583],
      zoom: 8
    }
  };
  
  // Fetch farmers from Firestore
  useEffect(() => {
    setLoading(true);
    let isMounted = true;

    try {
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
          setLoading(false);
          // Small delay to ensure DOM is ready before rendering map
          setTimeout(() => {
            if (isMounted) {
              setMapReady(true);
            }
          }, 100);
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
  }, []);
  
  // Handle region change
  const handleRegionChange = (regionKey) => {
    setSelectedRegion(regionKey);
  };
  
  // Handle marker click
  const handleMarkerClick = (farmer) => {
    setSelectedFarmer(farmer);
  };
  
  // Open larger map in new tab
  const openLargerMap = () => {
    const { center, zoom } = regions[selectedRegion];
    window.open(`https://www.openstreetmap.org/#map=${zoom}/${center[0]}/${center[1]}`, '_blank');
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-800'}`}>
          Coffee Farmer Locations
        </h1>
        <p className={`${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
          Interactive map showing the locations of registered coffee farmers
        </p>
      </div>
      
      {loading ? (
        <div className={`w-full h-[600px] flex items-center justify-center ${darkMode ? 'bg-gray-800' : 'bg-gray-100'} rounded-lg`}>
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-200px)] min-h-[600px]">
          {/* Map takes 70% width on large screens */}
          <div className="lg:w-3/4 h-full">
            <div className={`rounded-lg overflow-hidden border ${darkMode ? 'border-gray-700' : 'border-gray-200'} h-full flex flex-col`}>
              <div className="flex-grow">
                {mapReady ? (
                  <LeafletMap
                    region={regions[selectedRegion]}
                    farmers={farmers}
                    onMarkerClick={handleMarkerClick}
                    darkMode={darkMode}
                    onRegionChange={handleRegionChange}
                    regions={regions}
                    selectedRegion={selectedRegion}
                    onOpenLargerMap={openLargerMap}
                  />
                ) : (
                  <div className={`w-full h-full flex items-center justify-center ${darkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Stats sidebar takes 30% width on large screens */}
          <div className="lg:w-1/4 flex flex-col space-y-4 h-full overflow-y-auto">
            {/* Map Legend - Moved to top of right panel */}
            <div className={`rounded-lg overflow-hidden border ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  Map Legend
                </h3>
              </div>
              <div className="p-4">
                <div className="space-y-2">
                  <div className="flex items-center">
                    <div className="w-4 h-4 rounded-full bg-green-500 mr-2"></div>
                    <span className={`${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Arabica
                    </span>
                    <span className="ml-auto text-sm text-gray-500">
                      {farmers.filter(f => f.farm?.coffeeType?.toLowerCase().includes('arabica')).length || 0} farmers shown
                    </span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 rounded-full bg-blue-500 mr-2"></div>
                    <span className={`${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Robusta
                    </span>
                    <span className="ml-auto text-sm text-gray-500">
                      {farmers.filter(f => f.farm?.coffeeType?.toLowerCase().includes('robusta')).length || 0} farmers shown
                    </span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-4 h-4 rounded-full bg-purple-500 mr-2"></div>
                    <span className={`${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                      Mixed
                    </span>
                    <span className="ml-auto text-sm text-gray-500">
                      {farmers.filter(f => !f.farm?.coffeeType?.toLowerCase().includes('arabica') && !f.farm?.coffeeType?.toLowerCase().includes('robusta')).length || 0} farmers shown
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Filter display */}
            <div className={`rounded-lg overflow-hidden border ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
              <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  Current Region
                </h3>
                {selectedRegion && (
                  <span className={`px-2 py-1 text-xs rounded-full ${darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-700'}`}>
                    {regions[selectedRegion].name}
                  </span>
                )}
              </div>
              <div className="p-4">
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'} mb-3`}>
                  Select a region to filter the map view.
                </p>
                <div className="flex flex-wrap gap-2">
                  {Object.keys(regions).map(regionKey => (
                    <button
                      key={regionKey}
                      onClick={() => handleRegionChange(regionKey)}
                      className={`px-3 py-1 text-xs rounded-md ${
                        selectedRegion === regionKey 
                          ? (darkMode ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white') 
                          : (darkMode ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300')
                      }`}
                    >
                      {regions[regionKey].name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Farmers List */}
            <div className={`rounded-lg overflow-hidden border ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'} flex-grow`}>
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                  Farmers with Locations
                </h3>
              </div>
              <div className="p-4">
                <div className="space-y-4 max-h-[300px] overflow-y-auto">
                  {farmers.length > 0 ? (
                    farmers.map(farmer => (
                      <div 
                        key={farmer.id}
                        className={`p-3 rounded-lg cursor-pointer ${
                          selectedFarmer?.id === farmer.id
                            ? (darkMode ? 'bg-blue-900/20 border border-blue-800' : 'bg-blue-50 border border-blue-100')
                            : (darkMode ? 'bg-gray-700 hover:bg-gray-700/80' : 'bg-gray-50 hover:bg-gray-100')
                        }`}
                        onClick={() => handleMarkerClick(farmer)}
                      >
                        <div className="flex items-center">
                          <div className={`p-2 rounded-full mr-3 ${
                            farmer.farm?.coffeeType?.toLowerCase().includes('arabica')
                              ? (darkMode ? 'bg-green-900/30 text-green-400' : 'bg-green-100 text-green-600')
                              : farmer.farm?.coffeeType?.toLowerCase().includes('robusta')
                                ? (darkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-600')
                                : (darkMode ? 'bg-purple-900/30 text-purple-400' : 'bg-purple-100 text-purple-600')
                          }`}>
                            <User className="h-4 w-4" />
                          </div>
                          <div>
                            <h4 className={`font-medium ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                              {farmer.fullName}
                            </h4>
                            <div className="flex items-center text-xs mt-1">
                              <MapPin className={`h-3 w-3 mr-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                              <span className={darkMode ? 'text-gray-400' : 'text-gray-500'}>
                                {farmer.district || 'Unknown district'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className={`text-center py-6 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      No farmers with GPS coordinates found
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Selected Farmer Details */}
            {selectedFarmer && (
              <div className={`rounded-lg overflow-hidden border ${darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white'}`}>
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                  <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                    Farmer Details
                  </h3>
                  <button
                    className={`p-1 rounded-full ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                    onClick={() => setSelectedFarmer(null)}
                  >
                    <svg className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className={`h-2 w-full bg-gradient-to-r ${
                  selectedFarmer.farm?.coffeeType?.toLowerCase().includes('arabica') 
                    ? 'from-green-400 to-green-600' 
                    : selectedFarmer.farm?.coffeeType?.toLowerCase().includes('robusta') 
                      ? 'from-blue-400 to-blue-600' 
                      : 'from-purple-400 to-purple-600'
                }`}></div>
                <div className="p-4 space-y-4">
                  <div className="flex items-center">
                    <div className={`p-2 rounded-lg ${darkMode ? 'bg-blue-900/30' : 'bg-blue-100'} mr-3`}>
                      <User className={`h-5 w-5 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                    </div>
                    <div>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Name</p>
                      <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                        {selectedFarmer.fullName}
                      </h3>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <div className={`p-2 rounded-lg ${darkMode ? 'bg-green-900/30' : 'bg-green-100'} mr-3`}>
                      <Coffee className={`h-5 w-5 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
                    </div>
                    <div>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Farm Details</p>
                      <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                        {selectedFarmer.farm?.coffeeType || 'Unknown'} ({selectedFarmer.farm?.size || '?'} acres)
                      </h3>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                        {selectedFarmer.farm?.treesCount || '?'} trees
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <div className={`p-2 rounded-lg ${darkMode ? 'bg-purple-900/30' : 'bg-purple-100'} mr-3`}>
                      <MapPin className={`h-5 w-5 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
                    </div>
                    <div>
                      <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Location</p>
                      <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                        {selectedFarmer.district || 'Unknown district'}
                      </h3>
                      <p className={`text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                        {selectedFarmer.location?.address || 'No specific address provided'}
                      </p>
                      {selectedFarmer.location?.gpsCoordinates && (
                        <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                          {typeof selectedFarmer.location.gpsCoordinates === 'string' 
                            ? `GPS: ${selectedFarmer.location.gpsCoordinates}`
                            : `GPS: ${selectedFarmer.location.gpsCoordinates.latitude}, ${selectedFarmer.location.gpsCoordinates.longitude}`}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {selectedFarmer.phoneNumber && (
                    <div className="flex items-center">
                      <div className={`p-2 rounded-lg ${darkMode ? 'bg-indigo-900/30' : 'bg-indigo-100'} mr-3`}>
                        <Phone className={`h-5 w-5 ${darkMode ? 'text-indigo-400' : 'text-indigo-600'}`} />
                      </div>
                      <div>
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>Contact</p>
                        <h3 className={`text-lg font-bold ${darkMode ? 'text-white' : 'text-gray-800'}`}>
                          {selectedFarmer.phoneNumber}
                        </h3>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

FarmersMapSection.propTypes = {
  darkMode: PropTypes.bool.isRequired
};

export default FarmersMapSection;