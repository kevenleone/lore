// Paints the theme tokens on :root before the first render; must precede React.
import './theme/bootstrap';

import React from 'react';
import ReactDOM from 'react-dom/client';

import { FocusPanel } from './components/focus/FocusPanel';
import './theme/tailwind.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
        <FocusPanel />
    </React.StrictMode>,
);
