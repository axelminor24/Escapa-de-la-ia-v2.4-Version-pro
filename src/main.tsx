import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import NetworkApp from './NetworkApp.tsx';
import './index.css';

const networkMode = ['/control', '/pantalla'].includes(window.location.pathname);
createRoot(document.getElementById('root')!).render(networkMode ? <NetworkApp /> : <App />);
