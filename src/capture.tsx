// Paints the theme tokens on :root before the first render; must precede React.
import './theme/bootstrap';

import React from 'react';
import ReactDOM from 'react-dom/client';

import { CaptureApp } from './components/capture/CaptureApp';
import './theme/tailwind.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
        <CaptureApp />
    </React.StrictMode>,
);
