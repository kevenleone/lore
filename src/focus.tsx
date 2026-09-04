import React from 'react';
import ReactDOM from 'react-dom/client';

import { FocusPanel } from './components/focus/FocusPanel';
import './theme/global.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
        <FocusPanel />
    </React.StrictMode>,
);
