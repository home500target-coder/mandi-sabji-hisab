import Dexie from 'dexie';

// Define our offline cache database
export const db = new Dexie('MandiSabjiHisabCache');

db.version(3).stores({
  // Keyed by MongoDB _id
  brokers: '_id, name, mandiName, phone, defaultCommission, outstandingDue',
  vegetables: '_id, name',
  sales: '_id, brokerId, vegetableName, date, quantity, unit, unitPrice, grossAmount, netAmount, amountPaid, paymentStatus',
  payments: '_id, brokerId, saleId, billDate, amountReceived, paymentMethod, date, note',
  expenses: '_id, category, vegetableId, title, amount, date, note'
});
