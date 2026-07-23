// App.js - Make sure you're importing and using the NEW component
import React from 'react';
import AdminLogin from './components/AdminLogin';  // ← NEW component

function App() {
  return (
    <div className="App">
      <AdminLogin />  {/* ← Make sure this is the new one */}
    </div>
  );
}

export default App;