import { useState, useCallback } from 'react';
import { db } from '../db/localDb';
import { useAuth, API_URL } from '../context/AuthContext';

// Helper to format date to local YYYY-MM-DD
const getLocalDateString = (d) => {
  const dateObj = typeof d === 'string' || typeof d === 'number' ? new Date(d) : d;
  if (!dateObj || isNaN(dateObj.getTime())) return '';
  const pad = (num) => String(num).padStart(2, '0');
  return `${dateObj.getFullYear()}-${pad(dateObj.getMonth() + 1)}-${pad(dateObj.getDate())}`;
};

export const useOfflineCache = () => {
  const { token, isOnline, setIsOfflineView } = useAuth();
  const [brokers, setBrokers] = useState([]);
  const [vegetables, setVegetables] = useState([]);
  const [sales, setSales] = useState([]);
  const [payments, setPayments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(false);

  const getHeaders = useCallback(() => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  }), [token]);

  // Load cache data from IndexedDB
  const loadLocalData = useCallback(async () => {
    try {
      const localBrokers = await db.brokers.toArray();
      const localVegetables = await db.vegetables.toArray();
      const localSales = await db.sales.toArray();
      const localPayments = await db.payments.toArray();
      const localExpenses = await db.expenses.toArray();

      setBrokers(localBrokers.sort((a, b) => a.name.localeCompare(b.name)));
      setVegetables(localVegetables.sort((a, b) => a.name.localeCompare(b.name)));
      setSales(localSales.sort((a, b) => new Date(b.date) - new Date(a.date)));
      setPayments(localPayments.sort((a, b) => new Date(b.date) - new Date(a.date)));
      setExpenses(localExpenses.sort((a, b) => new Date(b.date) - new Date(a.date)));
    } catch (err) {
      console.error('Failed to load local IndexedDB data:', err);
    }
  }, []);

  // Sync state and local IndexedDB cache with MongoDB server
  const refreshData = useCallback(async () => {
    if (!token) return;
    setLoading(true);

    if (!isOnline) {
      setIsOfflineView(true);
      await loadLocalData();
      setLoading(false);
      return;
    }

    try {
      // Fetch Brokers
      const resBrokers = await fetch(`${API_URL}/brokers`, { headers: getHeaders() });
      let fetchedBrokers = [];
      if (resBrokers.ok) {
        fetchedBrokers = await resBrokers.json();
        await db.brokers.clear();
        if (fetchedBrokers.length > 0) {
          await db.brokers.bulkAdd(fetchedBrokers);
        }
      }

      // Fetch Vegetables
      const resVegetables = await fetch(`${API_URL}/vegetables`, { headers: getHeaders() });
      let fetchedVegetables = [];
      if (resVegetables.ok) {
        fetchedVegetables = await resVegetables.json();
        await db.vegetables.clear();
        if (fetchedVegetables.length > 0) {
          await db.vegetables.bulkAdd(fetchedVegetables);
        }
      }

      // Fetch Sales
      const resSales = await fetch(`${API_URL}/sales`, { headers: getHeaders() });
      let fetchedSales = [];
      if (resSales.ok) {
        fetchedSales = await resSales.json();
        await db.sales.clear();
        if (fetchedSales.length > 0) {
          await db.sales.bulkAdd(fetchedSales);
        }
      }

      // Fetch Payments
      const resPayments = await fetch(`${API_URL}/payments`, { headers: getHeaders() });
      let fetchedPayments = [];
      if (resPayments.ok) {
        fetchedPayments = await resPayments.json();
        await db.payments.clear();
        if (fetchedPayments.length > 0) {
          await db.payments.bulkAdd(fetchedPayments);
        }
      }

      // Fetch Expenses
      const resExpenses = await fetch(`${API_URL}/expenses`, { headers: getHeaders() });
      let fetchedExpenses = [];
      if (resExpenses.ok) {
        fetchedExpenses = await resExpenses.json();
        await db.expenses.clear();
        if (fetchedExpenses.length > 0) {
          await db.expenses.bulkAdd(fetchedExpenses);
        }
      }

      setBrokers(fetchedBrokers.sort((a, b) => a.name.localeCompare(b.name)));
      setVegetables(fetchedVegetables.sort((a, b) => a.name.localeCompare(b.name)));
      setSales(fetchedSales.sort((a, b) => new Date(b.date) - new Date(a.date)));
      setPayments(fetchedPayments.sort((a, b) => new Date(b.date) - new Date(a.date)));
      setExpenses(fetchedExpenses.sort((a, b) => new Date(b.date) - new Date(a.date)));
      setIsOfflineView(false);
    } catch (error) {
      console.warn('Sync failed - running offline view:', error.message);
      setIsOfflineView(true);
      await loadLocalData();
    } finally {
      setLoading(false);
    }
  }, [token, isOnline, getHeaders, loadLocalData, setIsOfflineView]);

  // Online only writes
  const addBroker = async (name, mandiName, phone, defaultCommission) => {
    if (!isOnline) throw new Error('Offline: Cannot create broker while offline.');

    const res = await fetch(`${API_URL}/brokers`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ name, mandiName, phone, defaultCommission })
    });
    
    if (res.ok) {
      const newBroker = await res.json();
      await db.brokers.put(newBroker);
      setBrokers(prev => [...prev, newBroker].sort((a, b) => a.name.localeCompare(b.name)));
      return newBroker;
    } else {
      const err = await res.json();
      throw new Error(err.message || 'Failed to add broker');
    }
  };

  const addVegetable = async (name) => {
    if (!isOnline) throw new Error('Offline: Cannot add vegetable while offline.');

    const res = await fetch(`${API_URL}/vegetables`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ name })
    });

    if (res.ok) {
      const newVeg = await res.json();
      await db.vegetables.put(newVeg);
      setVegetables(prev => [...prev, newVeg].sort((a, b) => a.name.localeCompare(b.name)));
      return newVeg;
    } else {
      const err = await res.json();
      throw new Error(err.message || 'Failed to add vegetable');
    }
  };

  const addSale = async (brokerId, vegetableName, quantity, unit, unitPrice, deductions, date, isOverallSale) => {
    if (!isOnline) throw new Error('Offline: Cannot save sale while offline.');

    // Direct portion sales are logged without deductions at input time
    const res = await fetch(`${API_URL}/sales`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ brokerId, vegetableName, quantity, unit, unitPrice, date, isOverallSale })
    });

    if (res.ok) {
      const newSale = await res.json();
      await db.sales.put(newSale);

      // Increase broker outstanding balance locally
      const brokerIdVal = newSale.brokerId._id || newSale.brokerId;
      const broker = await db.brokers.get(brokerIdVal);
      if (broker) {
        broker.outstandingDue = Math.round((broker.outstandingDue + newSale.netAmount) * 100) / 100;
        await db.brokers.put(broker);
        setBrokers(prev => prev.map(b => b._id === broker._id ? broker : b));
      }

      setSales(prev => [newSale, ...prev]);
      return newSale;
    } else {
      const err = await res.json();
      throw new Error(err.message || 'Failed to save sale transaction');
    }
  };

  const addPayment = async (brokerId, saleId, billDate, amountReceived, deductions, paymentMethod, date, note) => {
    if (!isOnline) throw new Error('Offline: Cannot log payment while offline.');

    const res = await fetch(`${API_URL}/payments`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ brokerId, saleId, billDate, amountReceived, deductions, paymentMethod, date, note, timezoneOffset: new Date().getTimezoneOffset() })
    });

    if (res.ok) {
      const newPayment = await res.json();
      await db.payments.put(newPayment);

      const commAmt = deductions && deductions.commissionAmount !== undefined ? Math.round(Number(deductions.commissionAmount) * 100) / 100 : 0;
      const labor = deductions && deductions.laborCharges !== undefined ? Math.round(Number(deductions.laborCharges) * 100) / 100 : 0;
      const tax = deductions && deductions.mandiTax !== undefined ? Math.round(Number(deductions.mandiTax) * 100) / 100 : 0;
      const other = deductions && deductions.otherDeductions !== undefined ? Math.round(Number(deductions.otherDeductions) * 100) / 100 : 0;
      const totalDeductions = Math.round((commAmt + labor + tax + other) * 100) / 100;

      // Broker gets credit for cash paid + expenses charged
      const totalCredit = Math.round((newPayment.amountReceived + totalDeductions) * 100) / 100;

      // 1. Case: Distribute payment locally across daily bill portion sales
      if (billDate && !saleId) {
        const localSales = await db.sales.toArray();
        const brokerIdVal = newPayment.brokerId._id || newPayment.brokerId;

        // Filter sales for this broker and date, excluding overall sales
        const targetSales = localSales.filter(s => {
          const sBrokerId = s.brokerId._id || s.brokerId;
          const sDateString = getLocalDateString(s.date);
          return sBrokerId === brokerIdVal && sDateString === billDate && !s.isOverallSale;
        }).sort((a, b) => new Date(a.date) - new Date(b.date));

        let amountLeft = totalCredit;
        
        for (const sale of targetSales) {
          if (amountLeft <= 0) break;

          const due = Math.round((sale.netAmount - sale.amountPaid) * 100) / 100;
          if (due <= 0) continue;

          const payAmt = Math.round(Math.min(amountLeft, due) * 100) / 100;
          sale.amountPaid = Math.round((sale.amountPaid + payAmt) * 100) / 100;
          
          if (sale.amountPaid >= (sale.netAmount - 0.01)) {
            sale.paymentStatus = 'Paid';
          } else {
            sale.paymentStatus = 'Partial';
          }

          await db.sales.put(sale);
          
          // Update local state
          setSales(prev => prev.map(s => s._id === sale._id ? { ...s, amountPaid: sale.amountPaid, paymentStatus: sale.paymentStatus } : s));
          amountLeft = Math.round((amountLeft - payAmt) * 100) / 100;
        }
      }

      // 2. Case: Update single portion sale locally
      if (saleId) {
        const sale = await db.sales.get(saleId);
        if (sale) {
          sale.amountPaid = Math.round((sale.amountPaid + totalCredit) * 100) / 100;
          if (sale.amountPaid >= (sale.netAmount - 0.01)) {
            sale.paymentStatus = 'Paid';
          } else {
            sale.paymentStatus = 'Partial';
          }
          await db.sales.put(sale);
          setSales(prev => prev.map(s => s._id === saleId ? { ...s, amountPaid: sale.amountPaid, paymentStatus: sale.paymentStatus } : s));
        }
      }

      // Decrement outstanding balance locally
      const brokerIdVal = newPayment.brokerId._id || newPayment.brokerId;
      const broker = await db.brokers.get(brokerIdVal);
      if (broker) {
        broker.outstandingDue = Math.round((broker.outstandingDue - totalCredit) * 100) / 100;
        await db.brokers.put(broker);
        setBrokers(prev => prev.map(b => b._id === broker._id ? broker : b));
      }

      setPayments(prev => [newPayment, ...prev]);
      return newPayment;
    } else {
      const err = await res.json();
      throw new Error(err.message || 'Failed to save payment record');
    }
  };

  const addExpense = async (category, vegetableId, title, amount, date, note) => {
    if (!isOnline) throw new Error('Offline: Cannot save expense while offline.');

    const res = await fetch(`${API_URL}/expenses`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ category, vegetableId, title, amount, date, note })
    });

    if (res.ok) {
      const newExpense = await res.json();
      await db.expenses.put(newExpense);
      setExpenses(prev => [newExpense, ...prev]);
      return newExpense;
    } else {
      const err = await res.json();
      throw new Error(err.message || 'Failed to save expense');
    }
  };

  return {
    brokers,
    vegetables,
    sales,
    payments,
    expenses,
    loading,
    refreshData,
    addBroker,
    addVegetable,
    addSale,
    addPayment,
    addExpense
  };
};
