import React, { useState } from 'react';

const AppContextCreate = React.createContext();

export const useAppContext = () => {
  const context = React.useContext(AppContextCreate);
  if (!context) {
    throw new Error('useAppContext must be used within AppContext');
  }
  return context;
};

export default function AppContext({ children }) {
  const [activeBooking, setActiveBooking] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);

  return (
    <AppContextCreate.Provider
      value={{
        activeBooking,
        setActiveBooking,
        chatMessages,
        setChatMessages,
      }}
    >
      {children}
    </AppContextCreate.Provider>
  );
}
