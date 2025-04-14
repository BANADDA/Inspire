import { AnimatePresence } from 'framer-motion';
import PropTypes from 'prop-types';
import { createContext, useContext, useState } from 'react';

/**
 * Context to manage page transitions throughout the app
 */
const TransitionContext = createContext({
  transitionType: 'fade', // default transition type
  setTransitionType: () => {}, // function to update the transition type
});

/**
 * Hook to access transition context
 */
export const useTransition = () => useContext(TransitionContext);

/**
 * PageTransitionProvider - Wraps the app and provides transition context
 * Can be placed at the App.jsx level to enable app-wide transitions
 */
export const PageTransitionProvider = ({ children }) => {
  // Available transition types: 'fade', 'slide', 'zoom', 'none'
  const [transitionType, setTransitionType] = useState('fade');

  return (
    <TransitionContext.Provider value={{ transitionType, setTransitionType }}>
      <AnimatePresence mode="wait">
        {children}
      </AnimatePresence>
    </TransitionContext.Provider>
  );
};

PageTransitionProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export default PageTransitionProvider; 