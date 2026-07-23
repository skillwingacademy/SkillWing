import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const CurrencyContext = createContext();

export function CurrencyProvider({ children }) {
  const [currency, setCurrencyState] = useState(() => localStorage.getItem('userCurrency') || 'INR');
  const [symbol, setSymbolState] = useState(() => localStorage.getItem('userCurrencySymbol') || '₹');
  const [loading, setLoading] = useState(true);

  const switchCurrency = (newCurrency) => {
    const newSymbol = newCurrency === 'USD' ? '$' : '₹';
    setCurrencyState(newCurrency);
    setSymbolState(newSymbol);
    localStorage.setItem('userCurrency', newCurrency);
    localStorage.setItem('userCurrencySymbol', newSymbol);
  };

  useEffect(() => {
    const fetchLocation = async () => {
      try {
        const res = await fetch('https://api.country.is/');
        const data = await res.json();
        
        const detectedCurrency = data.country === 'IN' ? 'INR' : 'USD';
        const detectedSymbol = detectedCurrency === 'INR' ? '₹' : '$';
        
        setCurrencyState(detectedCurrency);
        setSymbolState(detectedSymbol);
        localStorage.setItem('userCurrency', detectedCurrency);
        localStorage.setItem('userCurrencySymbol', detectedSymbol);
      } catch (err) {
        console.error('Failed to detect location for pricing', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchLocation();
  }, []);

  return (
    <CurrencyContext.Provider value={{ currency, symbol, switchCurrency, loading }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}
