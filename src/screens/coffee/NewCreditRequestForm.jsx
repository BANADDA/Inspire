import { addDoc, collection, doc, getDoc, getDocs, query, serverTimestamp, where } from 'firebase/firestore';
import { CreditCard, DollarSign, Loader, Users } from 'lucide-react';
import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { toast } from 'react-hot-toast';
import { db } from '../../firebase/firebase';

const NewCreditRequestForm = ({ darkMode, userId, farmerId, onRequestSubmitted, isModal = true }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    purpose: '',
    repaymentPeriod: 6, // Default 6 months
    farmerId: farmerId || '',
    farmerName: '',
    notes: '',
    coffeeAcreage: '',
    expectedHarvest: '',
    harvestMonth: '',
    collateral: '',
  });
  
  const [farmers, setFarmers] = useState([]);
  const [farmSizeOptions] = useState([
    { value: 'small', label: 'Small (< 1 acre)', minAcres: 0, maxAcres: 1 },
    { value: 'medium', label: 'Medium (1-5 acres)', minAcres: 1, maxAcres: 5 },
    { value: 'large', label: 'Large (> 5 acres)', minAcres: 5, maxAcres: 100 },
  ]);
  
  const [repaymentOptions] = useState([
    { value: 3, label: '3 months' },
    { value: 6, label: '6 months' },
    { value: 12, label: '12 months' },
    { value: 24, label: '24 months' }
  ]);
  
  const purposeOptions = [
    { value: 'farm_inputs', label: 'Farm Inputs (Seeds, Fertilizers, etc.)' },
    { value: 'equipment', label: 'Farm Equipment' },
    { value: 'labor', label: 'Labor Costs' },
    { value: 'processing', label: 'Coffee Processing' },
    { value: 'expansion', label: 'Farm Expansion' },
    { value: 'working_capital', label: 'Working Capital' },
    { value: 'other', label: 'Other' }
  ];
  
  const months = [
    { value: '1', label: 'January' },
    { value: '2', label: 'February' },
    { value: '3', label: 'March' },
    { value: '4', label: 'April' },
    { value: '5', label: 'May' },
    { value: '6', label: 'June' },
    { value: '7', label: 'July' },
    { value: '8', label: 'August' },
    { value: '9', label: 'September' },
    { value: '10', label: 'October' },
    { value: '11', label: 'November' },
    { value: '12', label: 'December' }
  ];
  
  // Fetch farmer details if we have an ID
  useEffect(() => {
    if (farmerId) {
      fetchFarmerDetails();
    } else {
      fetchFarmers();
    }
  }, [farmerId]);
  
  const fetchFarmerDetails = async () => {
    try {
      setIsLoading(true);
      const farmerDoc = await getDoc(doc(db, 'farmers', farmerId));
      
      if (farmerDoc.exists()) {
        const farmerData = farmerDoc.data();
        const farmerName = farmerData.fullName || 
          `${farmerData.firstName || ''} ${farmerData.lastName || ''}`.trim();
        
        setFormData(prev => ({
          ...prev,
          farmerId,
          farmerName,
          coffeeAcreage: farmerData.coffeeAcreage || '',
        }));
      }
    } catch (error) {
      console.error("Error fetching farmer details:", error);
      toast.error("Could not load farmer information");
    } finally {
      setIsLoading(false);
    }
  };
  
  const fetchFarmers = async () => {
    try {
      setIsLoading(true);
      const farmersQuery = query(collection(db, 'farmers'), where('active', '==', true));
      const querySnapshot = await getDocs(farmersQuery);
      
      const farmersData = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        farmersData.push({
          id: doc.id,
          name: data.fullName || `${data.firstName || ''} ${data.lastName || ''}`.trim(),
          coffeeAcreage: data.coffeeAcreage || 0
        });
      });
      
      setFarmers(farmersData);
    } catch (error) {
      console.error("Error fetching farmers:", error);
      toast.error("Could not load farmers list");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleFarmerSelect = (e) => {
    const selectedFarmerId = e.target.value;
    const selectedFarmer = farmers.find(farmer => farmer.id === selectedFarmerId);
    
    if (selectedFarmer) {
      setFormData(prev => ({ 
        ...prev, 
        farmerId: selectedFarmerId,
        farmerName: selectedFarmer.name,
        coffeeAcreage: selectedFarmer.coffeeAcreage || ''
      }));
    }
  };
  
  const calculateMaxAmount = () => {
    // Simple example calculation based on coffee acreage
    // In a real system, this would be much more sophisticated
    const acreage = parseFloat(formData.coffeeAcreage) || 0;
    const baseAmount = 5000; // Base amount in UGX
    const perAcreAmount = 2000; // Additional per acre
    
    return baseAmount + (acreage * perAcreAmount);
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.farmerId) {
      toast.error("Please select a farmer");
      return;
    }
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }
    
    if (!formData.purpose) {
      toast.error("Please select a purpose for the credit");
      return;
    }
    
    try {
      setSubmitting(true);
      
      // Create the credit request in Firestore
      const creditRequestData = {
        farmerId: formData.farmerId,
        farmerName: formData.farmerName,
        amountRequested: parseFloat(formData.amount),
        purpose: formData.purpose,
        purposeDescription: purposeOptions.find(p => p.value === formData.purpose)?.label || formData.purpose,
        repaymentPeriod: parseInt(formData.repaymentPeriod),
        coffeeAcreage: parseFloat(formData.coffeeAcreage) || 0,
        expectedHarvest: formData.expectedHarvest,
        harvestMonth: formData.harvestMonth,
        collateral: formData.collateral,
        notes: formData.notes,
        status: 'pending',
        requestDate: serverTimestamp(),
        createdBy: userId || 'unknown',
        updatedAt: serverTimestamp(),
        decisionData: {
          decision: 'pending',
          decisionDate: null,
          decisionBy: null,
          approvedAmount: null,
          interestRate: null,
          notes: ''
        }
      };
      
      const docRef = await addDoc(collection(db, 'creditRequests'), creditRequestData);
      
      toast.success("Credit request submitted successfully!");
      
      // Reset form
      setFormData({
        amount: '',
        purpose: '',
        repaymentPeriod: 6,
        farmerId: farmerId || '',
        farmerName: '',
        notes: '',
        coffeeAcreage: '',
        expectedHarvest: '',
        harvestMonth: '',
        collateral: '',
      });
      
      // Notify parent component
      if (onRequestSubmitted) {
        onRequestSubmitted({
          id: docRef.id,
          ...creditRequestData
        });
      }
      
    } catch (error) {
      console.error("Error submitting credit request:", error);
      toast.error("Failed to submit credit request");
    } finally {
      setSubmitting(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader className="animate-spin h-8 w-8 text-blue-500" />
      </div>
    );
  }
  
  const formContent = (
    <form onSubmit={handleSubmit}>
      <div className="space-y-6">
        {/* Farmer Selection (only show if farmerId is not provided) */}
        {!farmerId && (
          <div>
            <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Select Farmer
            </label>
            <select
              name="farmerId"
              value={formData.farmerId}
              onChange={handleFarmerSelect}
              className={`mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              required
            >
              <option value="">-- Select a Farmer --</option>
              {farmers.map(farmer => (
                <option key={farmer.id} value={farmer.id}>{farmer.name}</option>
              ))}
            </select>
          </div>
        )}
        
        {/* Selected Farmer (display only) */}
        {formData.farmerName && (
          <div className={`rounded-md ${darkMode ? 'bg-gray-800' : 'bg-blue-50'} p-4`}>
            <div className="flex">
              <div className={`flex-shrink-0 ${darkMode ? 'text-blue-400' : 'text-blue-400'}`}>
                <Users className="h-5 w-5" />
              </div>
              <div className="ml-3 flex-1 md:flex md:justify-between">
                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-blue-700'}`}>
                  Farmer: <span className="font-medium">{formData.farmerName}</span>
                </p>
                {formData.coffeeAcreage && (
                  <p className={`mt-3 text-sm md:mt-0 md:ml-6 ${darkMode ? 'text-gray-400' : 'text-blue-700'}`}>
                    Coffee Acreage: <span className="font-medium">{formData.coffeeAcreage}</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Amount */}
        <div>
          <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Amount (UGX)
          </label>
          <div className="mt-1 relative rounded-md shadow-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <DollarSign className={`h-5 w-5 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            </div>
            <input
              type="number"
              name="amount"
              value={formData.amount}
              onChange={handleChange}
              className={`block w-full pl-10 pr-12 py-2 rounded-md ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              }`}
              placeholder="0.00"
              required
              min="1000"
              max="10000000"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>UGX</span>
            </div>
          </div>
          {formData.coffeeAcreage && (
            <p className={`mt-1 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Suggested max amount: UGX {calculateMaxAmount().toLocaleString()}
            </p>
          )}
        </div>
        
        {/* Purpose */}
        <div>
          <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Purpose
          </label>
          <select
            name="purpose"
            value={formData.purpose}
            onChange={handleChange}
            className={`mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md ${
              darkMode 
                ? 'bg-gray-700 border-gray-600 text-white' 
                : 'bg-white border-gray-300 text-gray-900'
            }`}
            required
          >
            <option value="">-- Select Purpose --</option>
            {purposeOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        
        {/* Repayment Period */}
        <div>
          <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Repayment Period
          </label>
          <select
            name="repaymentPeriod"
            value={formData.repaymentPeriod}
            onChange={handleChange}
            className={`mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md ${
              darkMode 
                ? 'bg-gray-700 border-gray-600 text-white' 
                : 'bg-white border-gray-300 text-gray-900'
            }`}
          >
            {repaymentOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        
        {/* Expected Harvest */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Expected Harvest (kg)
            </label>
            <input
              type="number"
              name="expectedHarvest"
              value={formData.expectedHarvest}
              onChange={handleChange}
              className={`mt-1 block w-full px-3 py-2 rounded-md ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              placeholder="Estimated harvest in kilograms"
            />
          </div>
          
          <div>
            <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
              Harvest Month
            </label>
            <select
              name="harvestMonth"
              value={formData.harvestMonth}
              onChange={handleChange}
              className={`mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 rounded-md ${
                darkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            >
              <option value="">-- Select Month --</option>
              {months.map(month => (
                <option key={month.value} value={month.value}>{month.label}</option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Collateral */}
        <div>
          <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Collateral (if any)
          </label>
          <input
            type="text"
            name="collateral"
            value={formData.collateral}
            onChange={handleChange}
            className={`mt-1 block w-full px-3 py-2 rounded-md ${
              darkMode 
                ? 'bg-gray-700 border-gray-600 text-white' 
                : 'bg-white border-gray-300 text-gray-900'
            }`}
            placeholder="Description of collateral"
          />
        </div>
        
        {/* Notes */}
        <div>
          <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Additional Notes
          </label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={3}
            className={`mt-1 block w-full px-3 py-2 rounded-md ${
              darkMode 
                ? 'bg-gray-700 border-gray-600 text-white' 
                : 'bg-white border-gray-300 text-gray-900'
            }`}
            placeholder="Any additional information to support your credit request"
          />
        </div>
        
        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${submitting ? 'opacity-75 cursor-not-allowed' : ''}`}
          >
            {submitting ? (
              <>
                <Loader className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" />
                Submitting...
              </>
            ) : (
              <>
                <CreditCard className="-ml-1 mr-2 h-4 w-4" />
                Submit Credit Request
              </>
            )}
          </button>
        </div>
      </div>
    </form>
  );
  
  if (isModal) {
    return (
      <div className={`p-6 ${darkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'}`}>
        <div className="mb-5">
          <h2 className="text-xl font-semibold">Request Credit</h2>
          <p className={`mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            Submit a request for financial assistance
          </p>
        </div>
        {formContent}
      </div>
    );
  }
  
  return formContent;
};

NewCreditRequestForm.propTypes = {
  darkMode: PropTypes.bool.isRequired,
  userId: PropTypes.string,
  farmerId: PropTypes.string,
  onRequestSubmitted: PropTypes.func,
  isModal: PropTypes.bool
};

export default NewCreditRequestForm; 