import { createContext, useContext } from 'react';

export const TabBarVisibilityContext = createContext({
  showTabBar: () => {},
  hideTabBar: () => {},
  registerScroll: () => {},
});

export const useTabBarVisibility = () => useContext(TabBarVisibilityContext);
