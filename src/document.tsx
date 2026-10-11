// Paints the theme tokens on :root before the first render; must precede React.
import './theme/bootstrap';

import React from 'react';
import ReactDOM from 'react-dom/client';

import { DocumentApp } from './components/document/DocumentApp';
import { borrowPreferences } from './components/document/standalone';
import { provideRepository } from './data';
import { DocumentRepository } from './data/documentRepository';
import { installNativeChrome } from './lib/nativeChrome';
import './theme/tailwind.css';

installNativeChrome();

borrowPreferences();

const repository = new DocumentRepository();

provideRepository(repository);

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
        <DocumentApp repository={repository} />
    </React.StrictMode>,
);
