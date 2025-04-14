import ReactDOM from 'react-dom';
import { Toaster } from 'react-hot-toast';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './index.css';

// Add the Inter font to the document head
const interFontLink = document.createElement('link');
interFontLink.rel = 'stylesheet';
interFontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap';
document.head.appendChild(interFontLink);

ReactDOM.createRoot(document.getElementById('root')).render(
  // <React.StrictMode>
    <BrowserRouter>
      <>
        <Toaster
          position="top-right"
          toastOptions={{
            success: {
              style: {
                background: '#059669',
                color: '#fff',
                padding: '16px',
                borderRadius: '10px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              },
              duration: 3000,
            },
            error: {
              style: {
                background: '#DC2626',
                color: '#fff',
                padding: '16px',
                borderRadius: '10px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              },
              duration: 4000,
            },
            loading: {
              style: {
                background: '#2563EB',
                color: '#fff',
                padding: '16px',
                borderRadius: '10px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
              },
            },
          }}
        />
        <App />
      </>
    </BrowserRouter>
  /* </React.StrictMode> */
);