import Dexie from 'dexie';

// Define the database schema
const SCHEMA = {
  // Keyed by MongoDB _id
  brokers: '_id, name, mandiName, phone, defaultCommission, outstandingDue',
  vegetables: '_id, name',
  sales: '_id, brokerId, vegetableName, date, quantity, unit, unitPrice, grossAmount, netAmount, amountPaid, paymentStatus',
  payments: '_id, brokerId, saleId, billDate, amountReceived, paymentMethod, date, note',
  expenses: '_id, category, vegetableId, title, amount, date, note'
};

let currentDb = null;
let activeUsername = '';

export const initDbForUser = (username) => {
  const normalizedUsername = (username || '').trim().toLowerCase();
  
  // If the same database is already open, reuse it
  if (currentDb && activeUsername === normalizedUsername) {
    return currentDb;
  }
  
  if (currentDb) {
    try {
      currentDb.close();
    } catch (e) {
      console.error('Error closing Dexie database:', e);
    }
  }
  
  activeUsername = normalizedUsername;
  const dbName = normalizedUsername ? `MandiSabjiHisabCache_${normalizedUsername}` : 'MandiSabjiHisabCache';
  currentDb = new Dexie(dbName);
  currentDb.version(3).stores(SCHEMA);
  return currentDb;
};

// Initialize with the cached user (if any)
const savedCachedUser = localStorage.getItem('cachedUser');
let initialUsername = '';
if (savedCachedUser) {
  try {
    initialUsername = JSON.parse(savedCachedUser).username || '';
  } catch (e) {
    console.error('Error parsing cachedUser during DB init:', e);
  }
}
initDbForUser(initialUsername);

// Export a Proxy wrapper that delegates all operations to the active Dexie instance
export const db = new Proxy({}, {
  get(target, prop) {
    if (!currentDb) {
      initDbForUser('');
    }
    const val = currentDb[prop];
    if (typeof val === 'function') {
      return val.bind(currentDb);
    }
    return val;
  }
});

