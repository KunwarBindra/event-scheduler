import React from 'react';
import CalendarPage from './components/CalendarPage';

/**
 * App entry point. In a real project this component would be rendered into
 * the DOM via ReactDOM.render(). It simply delegates to the CalendarPage
 * component which contains all of the scheduler logic.  If you are using
 * a bundler like Vite or Create React App, this file should be your
 * application root.
 */
const App = () => {
  return (
    <div className="app-container">
      <CalendarPage />
    </div>
  );
};

export default App;