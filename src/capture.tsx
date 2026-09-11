// Paints the theme tokens on :root before the first render; must precede React.
import './theme/bootstrap';

import React from 'react';
import ReactDOM from 'react-dom/client';

import { CaptureApp } from './components/capture/CaptureApp';
import { installNativeChrome } from './lib/nativeChrome';
import './theme/tailwind.css';

installNativeChrome();

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
        <CaptureApp />
    </React.StrictMode>,
);
