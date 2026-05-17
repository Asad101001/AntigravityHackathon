import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { configureNotifications, sendLocalNotification } from '../notifications';

const AppContext = createContext({
  activeJob: null,
  setActiveJob: () => {},
  triggerBookingConfirmedNotification: async () => false,
});

export function AppContextProvider({ children }) {
  const [activeJob, setActiveJobState] = useState(null);
  const lastNotifiedJobId = useRef(null);

  useEffect(() => {
    void configureNotifications();
  }, []);

  const triggerBookingConfirmedNotification = useCallback(async (job) => {
    if (!job) return false;
    return sendLocalNotification(
      'Booking Confirmed - Provider En Route',
      `${job.provider || 'Your provider'} is assigned for ${job.service || 'your service'}${job.area ? ` in ${job.area}` : ''}.`,
      { booking_id: job.id, event: 'booking_confirmed', status: job.status || 'confirmed' }
    );
  }, []);

  const setActiveJob = useCallback((jobOrUpdater) => {
    setActiveJobState(previous => (typeof jobOrUpdater === 'function' ? jobOrUpdater(previous) : jobOrUpdater));
  }, []);

  useEffect(() => {
    if (!activeJob?.id || activeJob.status !== 'confirmed') return;
    if (lastNotifiedJobId.current === activeJob.id) return;

    lastNotifiedJobId.current = activeJob.id;
    void triggerBookingConfirmedNotification(activeJob);
  }, [activeJob, triggerBookingConfirmedNotification]);

  const value = useMemo(() => ({
    activeJob,
    setActiveJob,
    triggerBookingConfirmedNotification,
  }), [activeJob, setActiveJob, triggerBookingConfirmedNotification]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  return useContext(AppContext);
}
