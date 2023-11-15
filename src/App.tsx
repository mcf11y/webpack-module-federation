import { createRoot } from 'react-dom/client';
import TestComponent from './components/TestComponent';
// import React from 'react';

const App = () => (
  <div className='container'>
    <h1>Module app sample</h1>

    <hr />

    <div>
      <TestComponent />
    </div>
  </div>
);

const container = document.getElementById('root');

if (!container) {
  throw Error('Cant get root element');
}

const root = createRoot(container);
root.render(<App />);
