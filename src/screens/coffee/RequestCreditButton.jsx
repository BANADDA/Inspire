import { CreditCard } from 'lucide-react';
import PropTypes from 'prop-types';
import { useState } from 'react';
import NewCreditRequestForm from './NewCreditRequestForm';

const RequestCreditButton = ({ darkMode, userId, farmerId, onRequestSubmitted, buttonText = "Request Credit" }) => {
  const [showModal, setShowModal] = useState(false);
  
  const openModal = () => setShowModal(true);
  const closeModal = () => setShowModal(false);
  
  const handleRequestSubmitted = (request) => {
    if (onRequestSubmitted) {
      onRequestSubmitted(request);
    }
    closeModal();
  };
  
  return (
    <>
      <button
        onClick={openModal}
        className={`inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium ${
          darkMode 
            ? 'bg-blue-600 hover:bg-blue-700 text-white' 
            : 'bg-blue-600 hover:bg-blue-700 text-white'
        }`}
      >
        <CreditCard className="-ml-1 mr-2 h-5 w-5" />
        {buttonText}
      </button>
      
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div 
              className="fixed inset-0 transition-opacity" 
              aria-hidden="true"
              onClick={closeModal}
            >
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            
            {/* Modal panel */}
            <div 
              className={`inline-block align-bottom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full ${
                darkMode ? 'bg-gray-800' : 'bg-white'
              }`}
            >
              {/* Close button */}
              <div className="absolute top-0 right-0 pt-4 pr-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className={`bg-transparent rounded-md text-gray-400 hover:text-gray-500 focus:outline-none`}
                >
                  <span className="sr-only">Close</span>
                  <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Form content */}
              <NewCreditRequestForm 
                darkMode={darkMode}
                userId={userId}
                farmerId={farmerId}
                onRequestSubmitted={handleRequestSubmitted}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

RequestCreditButton.propTypes = {
  darkMode: PropTypes.bool.isRequired,
  userId: PropTypes.string,
  farmerId: PropTypes.string,
  onRequestSubmitted: PropTypes.func,
  buttonText: PropTypes.string
};

export default RequestCreditButton; 