import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { getAccessToken } from '../services/googleCalendar.js';

const CalendarContext = createContext(null);
const ACCESS_TOKEN_KEY = 'spartan-g-google-access-token';

export function CalendarProvider({ children }) {
  const [accessToken, setAccessTokenState] = useState('');
  const [slots, setSlots] = useState([]);
  const [bookings, setBookings] = useState([]);
  const calendarId = import.meta.env.VITE_FACILITATOR_CALENDAR_ID || '';

  useEffect(() => {
    const storedToken = getAccessToken();
    if (storedToken) {
      setAccessTokenState(storedToken);
    }
  }, []);

  const setAccessToken = (nextToken) => {
    const value = nextToken || '';
    setAccessTokenState(value);
    if (value) {
      localStorage.setItem(ACCESS_TOKEN_KEY, value);
    } else {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
    }
  };

  const clearAccessToken = () => setAccessToken('');

  const value = useMemo(() => ({
    accessToken,
    setAccessToken,
    clearAccessToken,
    calendarId,
    slots,
    setSlots,
    bookings,
    setBookings
  }), [accessToken, calendarId, bookings, slots]);

  return <CalendarContext.Provider value={value}>{children}</CalendarContext.Provider>;
}

export function useCalendar() {
  const context = useContext(CalendarContext);
  if (!context) {
    throw new Error('useCalendar must be used within a CalendarProvider.');
  }
  return context;
}
