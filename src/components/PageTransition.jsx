import { motion } from 'framer-motion';
import PropTypes from 'prop-types';
import { useTransition } from './PageTransitionProvider';

/**
 * PageTransition - A reusable component that wraps page content and provides
 * beautiful animations when navigating between screens.
 * 
 * Usage:
 * <PageTransition>
 *   <YourPageContent />
 * </PageTransition>
 */
const PageTransition = ({ 
  children, 
  transitionKey,
  transitionType: explicitTransitionType
}) => {
  // Use context if available, otherwise use the default
  const transitionContext = useTransition();
  
  // Use explicit prop if provided, otherwise use context, and fallback to 'fade'
  const transitionType = explicitTransitionType || 
    (transitionContext?.transitionType || 'fade');
  
  // Define different transition variants
  const transitionVariants = {
    fade: {
      initial: { opacity: 0 },
      animate: { 
        opacity: 1, 
        transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1.0] }
      },
      exit: { 
        opacity: 0, 
        transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1.0] }
      }
    },
    
    slideUp: {
      initial: { opacity: 0, y: 20 },
      animate: { 
        opacity: 1, 
        y: 0, 
        transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] }
      },
      exit: { 
        opacity: 0, 
        y: -20, 
        transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] }
      }
    },
    
    slideRight: {
      initial: { opacity: 0, x: -20 },
      animate: { 
        opacity: 1, 
        x: 0, 
        transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] }
      },
      exit: { 
        opacity: 0, 
        x: 20, 
        transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] }
      }
    },
    
    zoom: {
      initial: { opacity: 0, scale: 0.98 },
      animate: { 
        opacity: 1, 
        scale: 1, 
        transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] }
      },
      exit: { 
        opacity: 0, 
        scale: 1.02, 
        transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] }
      }
    },
    
    // No animation, useful for debugging or for when animations cause issues
    none: {
      initial: {},
      animate: {},
      exit: {}
    }
  };
  
  // Select the right variant based on transitionType
  const selectedVariant = transitionVariants[transitionType] || transitionVariants.fade;

  return (
    <motion.div
      key={transitionKey || 'page'}
      initial="initial"
      animate="animate"
      exit="exit"
      variants={selectedVariant}
      className="w-full h-full"
    >
      {children}
    </motion.div>
  );
};

PageTransition.propTypes = {
  children: PropTypes.node.isRequired,
  transitionKey: PropTypes.string,
  transitionType: PropTypes.oneOf(['fade', 'slideUp', 'slideRight', 'zoom', 'none'])
};

export default PageTransition; 