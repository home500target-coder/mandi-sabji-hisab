import React, { useState, useEffect } from 'react';
import { useAuth } from './context/AuthContext';
import { useOfflineCache } from './hooks/useOfflineCache';
import { 
  LayoutDashboard, 
  Users, 
  ShoppingBag, 
  IndianRupee, 
  LogOut, 
  Plus, 
  X, 
  Share2, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Phone,
  ChevronDown,
  ChevronUp,
  Settings,
  Wifi,
  WifiOff
} from 'lucide-react';

export default function App() {
  const { user, token, loading: authLoading, isOnline, isOfflineView, login, register, logout } = useAuth();
  
  // Custom sync and IndexedDB caching hook
  const { 
    brokers, 
    vegetables,
    sales, 
    payments, 
    loading: dbLoading, 
    refreshData, 
    addBroker, 
    addVegetable,
    addSale, 
    addPayment 
  } = useOfflineCache();

  // Tab State: 'dashboard', 'brokers', 'sales', 'payments'
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Modals visibility states
  const [showAddBroker, setShowAddBroker] = useState(false);
  const [showAddSale, setShowAddSale] = useState(false);
  const [showCollectBillCash, setShowCollectBillCash] = useState(null); // stores active daily bill object to pay against
  const [showAddGeneralPayment, setShowAddGeneralPayment] = useState(false);
  const [showAddVegModal, setShowAddVegModal] = useState(false);
  const [activeBrokerLedger, setActiveBrokerLedger] = useState(null);

  // Collapsed state for daily bills in Sales tab (keyed by bill key)
  const [expandedBills, setExpandedBills] = useState({});

  // Authentication states
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [farmerName, setFarmerName] = useState('');
  const [villageName, setVillageName] = useState('');
  const [phone, setPhone] = useState('');
  const [authError, setAuthError] = useState('');

  // Add Sale state variables
  const [selectedVeg, setSelectedVeg] = useState('');
  const [saleQty, setSaleQty] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [selectedBrokerCommRate, setSelectedBrokerCommRate] = useState(6);
  const [saleLabor, setSaleLabor] = useState(0);
  const [saleTax, setSaleTax] = useState(0);
  const [saleOther, setSaleOther] = useState(0);
  
  // Inline Add Vegetable toggles (inside Add Sale form)
  const [showInlineVegInput, setShowInlineVegInput] = useState(false);
  const [inlineVegName, setInlineVegName] = useState('');

  // Inline Add Broker toggles (inside Add Sale form)
  const [selectedBrokerId, setSelectedBrokerId] = useState('');
  const [showInlineBrokerInput, setShowInlineBrokerInput] = useState(false);
  const [inlineBrokerName, setInlineBrokerName] = useState('');
  const [inlineMandiName, setInlineMandiName] = useState('');
  const [inlineBrokerPhone, setInlineBrokerPhone] = useState('');
  const [inlineBrokerComm, setInlineBrokerComm] = useState('');

  // Collect cash state variables
  const [collectAmount, setCollectAmount] = useState('');
  const [collectMethod, setCollectMethod] = useState('Cash');
  const [collectNote, setCollectNote] = useState('');
  const [collectCommRate, setCollectCommRate] = useState('6');
  const [collectLabor, setCollectLabor] = useState('');
  const [collectTax, setCollectTax] = useState('');
  const [collectOther, setCollectOther] = useState('');

  // General Payment state variables
  const [generalPaymentBroker, setGeneralPaymentBroker] = useState('');
  const [generalPaymentAmount, setGeneralPaymentAmount] = useState('');
  const [generalPaymentMethod, setGeneralPaymentMethod] = useState('Cash');
  const [generalPaymentNote, setGeneralPaymentNote] = useState('');

  // Loading states for API requests
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
  const [isSavingSale, setIsSavingSale] = useState(false);
  const [isSavingVeg, setIsSavingVeg] = useState(false);
  const [isSavingBroker, setIsSavingBroker] = useState(false);
  const [isSavingPayment, setIsSavingPayment] = useState(false);

  // Sync data on load
  useEffect(() => {
    if (token) {
      refreshData();
    }
  }, [token, refreshData]);

  // Set default selection state variables when lists load
  useEffect(() => {
    if (vegetables.length > 0 && !selectedVeg) {
      setSelectedVeg(vegetables[0].name);
    }
  }, [vegetables, selectedVeg]);

  useEffect(() => {
    if (brokers.length > 0 && !selectedBrokerId) {
      setSelectedBrokerId(brokers[0]._id);
      handleBrokerChange(brokers[0]._id);
    }
  }, [brokers, selectedBrokerId]);

  useEffect(() => {
    if (showAddSale && brokers.length === 0) {
      setShowInlineBrokerInput(true);
    }
  }, [showAddSale, brokers]);

  // Set broker commission rate on broker selection changes
  const handleBrokerChange = (brokerId) => {
    const selected = brokers.find(b => b._id === brokerId);
    if (selected) {
      setSelectedBrokerCommRate(selected.defaultCommission !== undefined ? selected.defaultCommission : 6);
    }
  };

  useEffect(() => {
    if (showAddSale && brokers.length > 0) {
      setSelectedBrokerCommRate(brokers[0].defaultCommission !== undefined ? brokers[0].defaultCommission : 6);
    }
  }, [showAddSale, brokers]);

  // Reset collective deductions defaults when Daily Bill modal is opened
  useEffect(() => {
    if (showCollectBillCash) {
      const defaultComm = showCollectBillCash.broker?.defaultCommission !== undefined ? showCollectBillCash.broker.defaultCommission : 6;
      setCollectCommRate(defaultComm === 0 ? '' : String(defaultComm));
      setCollectLabor('');
      setCollectTax('');
      setCollectOther('');
    }
  }, [showCollectBillCash]);

  // Live calculate collective net cash to collect when daily bill stats or deductions are modified
  useEffect(() => {
    if (showCollectBillCash) {
      const gross = showCollectBillCash.totalNet - showCollectBillCash.totalPaid;
      const commRateNum = collectCommRate === '' ? 0 : Number(collectCommRate);
      const commAmt = (gross * commRateNum) / 100;
      const totalDeductions = commAmt + (Number(collectLabor) || 0) + (Number(collectTax) || 0) + (Number(collectOther) || 0);
      const remainingNet = Math.max(0, gross - totalDeductions);
      setCollectAmount(remainingNet);
    }
  }, [showCollectBillCash, collectCommRate, collectLabor, collectTax, collectOther]);

  // Auth Handler
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setIsAuthSubmitting(true);

    try {
      if (isRegisterMode) {
        const res = await register(username, password, farmerName, villageName, phone);
        if (!res.success) setAuthError(res.message);
      } else {
        const res = await login(username, password);
        if (!res.success) setAuthError(res.message);
      }
    } catch (err) {
      setAuthError(err.message || 'Authentication failed');
    } finally {
      setIsAuthSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p style={{ color: '#2E7D32', fontWeight: 600 }}>loading Mandi Sabji Hisab...</p>
      </div>
    );
  }

  // --- UNAUTHENTICATED SCREEN ---
  if (!user) {
    return (
      <div className="app-container">
        <div className="auth-container">
          <div className="auth-card">
            <div className="auth-header">
              <h1>सब्जी हिसाब</h1>
              <p>Mandi Sabji Hisab - Farmer Ledger PWA</p>
            </div>
            
            {authError && <div style={{ color: '#C62828', backgroundColor: '#FFEBEE', padding: '10px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.9rem' }}>{authError}</div>}
            
            <form onSubmit={handleAuthSubmit}>
              {isRegisterMode && (
                <>
                  <div className="form-group">
                    <label>Farmer Name (किसान का नाम)*</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="e.g. Ramesh Kumar"
                      value={farmerName}
                      onChange={e => setFarmerName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Village Name (गांव का नाम)</label>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="e.g. Rampur"
                      value={villageName}
                      onChange={e => setVillageName(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone Number (मोबाइल नंबर)</label>
                    <input 
                      type="tel" 
                      className="input-field" 
                      placeholder="e.g. 9876543210"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                    />
                  </div>
                </>
              )}
              
              <div className="form-group">
                <label>Username (यूज़रनेम)*</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="Choose username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Password (पासवर्ड)*</label>
                <input 
                  type="password" 
                  className="input-field" 
                  placeholder="Enter password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="btn btn-primary" disabled={isAuthSubmitting}>
                {isAuthSubmitting ? 'Processing...' : (isRegisterMode ? 'Register (खाता बनाएं)' : 'Login (लॉगिन करें)')}
              </button>
            </form>

            <button 
              className="link-btn" 
              onClick={() => {
                setIsRegisterMode(!isRegisterMode);
                setAuthError('');
              }}
            >
              {isRegisterMode ? 'Already have an account? Login' : "Don't have an account? Register"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- COLLECTIVE BILL GROUPING LOGIC ---
  const getGroupedSales = () => {
    const groups = {};
    sales.forEach(s => {
      const brokerIdVal = s.brokerId?._id || s.brokerId;
      if (!brokerIdVal) return;
      const dateString = new Date(s.date).toISOString().substring(0, 10);
      const key = `${dateString}_${brokerIdVal}`;
      
      if (!groups[key]) {
        groups[key] = {
          key,
          dateString,
          date: s.date,
          broker: s.brokerId,
          sales: [],
          totalGross: 0,
          totalNet: 0,
          totalPaid: 0,
          totalWeight: 0,
          units: new Set()
        };
      }
      groups[key].sales.push(s);
      groups[key].totalGross += s.grossAmount;
      groups[key].totalNet += s.netAmount;
      groups[key].totalPaid += s.amountPaid;
      groups[key].totalWeight += s.quantity;
      groups[key].units.add(s.unit);
    });
    
    return Object.values(groups).map(g => {
      // Map payment status dynamically based on total payouts applied to this daily bill
      let status = 'Unpaid';
      if (g.totalPaid >= (g.totalNet - 0.01)) {
        status = 'Paid';
      } else if (g.totalPaid > 0) {
        status = 'Partial';
      }
      return {
        ...g,
        status,
        unitLabel: Array.from(g.units).join(', ')
      };
    }).sort((a, b) => new Date(b.date) - new Date(a.date));
  };

  const groupedSalesList = getGroupedSales();

  // --- DASHBOARD FINANCIAL STATS ---
  const totalOutstanding = brokers.reduce((acc, curr) => acc + (curr.outstandingDue || 0), 0);
  const totalSalesVal = sales.reduce((acc, curr) => acc + (curr.netAmount || 0), 0);
  const totalReceivedVal = payments.reduce((acc, curr) => acc + (curr.amountReceived || 0), 0);

  // Helper to restrict text inputs to numeric characters
  const handleNumericChange = (setter) => (e) => {
    let val = e.target.value;
    let cleaned = val.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      cleaned = parts[0] + '.' + parts.slice(1).join('');
    }
    setter(cleaned);
  };

  // Toggle accordion expand
  const toggleBillExpanded = (key) => {
    setExpandedBills(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Inline vegetable adder handler
  const handleAddInlineVeg = async (e) => {
    e.preventDefault();
    if (!inlineVegName.trim()) return;
    setIsSavingVeg(true);
    try {
      const added = await addVegetable(inlineVegName.trim());
      setSelectedVeg(added.name);
      setInlineVegName('');
      setShowInlineVegInput(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSavingVeg(false);
    }
  };

  // Inline broker adder handler
  const handleAddInlineBroker = async (e) => {
    e.preventDefault();
    if (!inlineBrokerName.trim() || !inlineMandiName.trim()) {
      alert("Broker name and Mandi name are required!");
      return;
    }
    setIsSavingBroker(true);
    try {
      const added = await addBroker(
        inlineBrokerName.trim(),
        inlineMandiName.trim(),
        inlineBrokerPhone.trim(),
        inlineBrokerComm ? Number(inlineBrokerComm) : 6
      );
      setSelectedBrokerId(added._id);
      setSelectedBrokerCommRate(added.defaultCommission);
      setInlineBrokerName('');
      setInlineMandiName('');
      setInlineBrokerPhone('');
      setInlineBrokerComm('');
      setShowInlineBrokerInput(false);
    } catch (err) {
      alert(err.message);
    } finally {
      setIsSavingBroker(false);
    }
  };

  return (
    <div className="app-container">
      {/* HEADER BAR */}
      <header className="app-header">
        <div>
          <span className="app-title">मंडी सब्जी हिसाब</span>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            किसान: {user.farmerName}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {isOnline ? (
            <span style={{ color: '#2E7D32', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 600 }}>
              <Wifi size={14} /> Online
            </span>
          ) : (
            <span style={{ color: '#B78103', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', fontWeight: 600 }}>
              <WifiOff size={14} /> Offline Cache
            </span>
          )}
          <button onClick={logout} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* OFFLINE READ ONLY BANNER */}
      {isOfflineView && (
        <div className="offline-banner">
          📶 Offline: Viewing cached data. Creating sales, vegetables, or payments requires network.
        </div>
      )}

      {/* --- DASHBOARD TAB --- */}
      {activeTab === 'dashboard' && (
        <div className="dashboard-content">
          <div className="welcome-section">
            <h2>Namaste, {user.farmerName}!</h2>
            <p>Track your vegetable sales and broker credit ledger.</p>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Total Broker Due (बकाया)</div>
              <div className="stat-val outstanding">₹{totalOutstanding.toLocaleString('en-IN')}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Sales (कुल बिक्री)</div>
              <div className="stat-val earnings">₹{totalSalesVal.toLocaleString('en-IN')}</div>
            </div>
            <div className="stat-card" style={{ gridColumn: 'span 2' }}>
              <div className="stat-label">Payments Received (प्राप्त भुगतान)</div>
              <div className="stat-val" style={{ color: '#0F9D58' }}>₹{totalReceivedVal.toLocaleString('en-IN')}</div>
            </div>
          </div>

          {/* Quick Actions */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
            <button 
              className="btn btn-primary" 
              onClick={() => {
                setSaleQty('');
                setSalePrice('');
                setSaleLabor(0);
                setSaleTax(0);
                setSaleOther(0);
                setShowAddSale(true);
              }} 
              disabled={isOfflineView}
              style={{ padding: '10px', fontSize: '0.9rem', gap: '6px' }}
            >
              <ShoppingBag size={18} /> Record New Sale (बिक्री)
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={() => {
                if (brokers.length > 0) {
                  setGeneralPaymentBroker(brokers[0]._id);
                }
                setGeneralPaymentAmount('');
                setGeneralPaymentNote('');
                setShowAddGeneralPayment(true);
              }} 
              disabled={isOfflineView}
              style={{ padding: '10px', fontSize: '0.9rem', gap: '6px' }}
            >
              <IndianRupee size={18} /> Record Payment (कैश मिला)
            </button>
          </div>

          {/* Crop List Manager widget */}
          <div className="item-card" style={{ marginBottom: '24px', borderLeft: '4px solid var(--primary-color)' }}>
            <div className="item-header" style={{ marginBottom: '12px' }}>
              <strong style={{ fontSize: '0.95rem' }}>My Vegetable Crops List (मेरी सब्जियां)</strong>
              <span 
                className="add-link" 
                onClick={() => !isOfflineView && setShowAddVegModal(true)}
                style={{ opacity: isOfflineView ? 0.5 : 1 }}
              >
                <Plus size={14} /> Add Crop
              </span>
            </div>
            
            {vegetables.length === 0 ? (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No crops added yet. Click Add Crop to create your listing.</p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {vegetables.map(v => (
                  <span 
                    key={v._id} 
                    style={{ 
                      backgroundColor: 'var(--bg-color)', 
                      border: '1px solid var(--border-color)', 
                      borderRadius: '20px', 
                      padding: '4px 10px', 
                      fontSize: '0.8rem',
                      fontWeight: 500
                    }}
                  >
                    {v.name}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Recent Daily Bills Preview */}
          <div className="section-title">
            <span>Recent Grouped Daily Bills</span>
            <span className="add-link" onClick={() => setActiveTab('sales')}>See all</span>
          </div>

          {groupedSalesList.length === 0 ? (
            <div className="empty-state">
              <ShoppingBag size={40} />
              <p>No sales recorded yet.</p>
            </div>
          ) : (
            <div className="list-container">
              {groupedSalesList.slice(0, 3).map(g => (
                <div key={g.key} className="item-card" style={{ borderLeft: `4px solid ${g.status === 'Paid' ? 'var(--primary-color)' : 'var(--danger-text)'}` }}>
                  <div className="item-header">
                    <div>
                      <strong style={{ fontSize: '1rem', color: 'var(--primary-color)' }}>{g.broker?.name || 'Unknown Broker'}</strong>
                      <div className="item-detail">{new Date(g.date).toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}</div>
                    </div>
                    <span className="badge" style={{
                      backgroundColor: g.status === 'Paid' ? 'var(--success-bg)' : 
                                      g.status === 'Partial' ? 'var(--pending-bg)' : 'var(--danger-bg)',
                      color: g.status === 'Paid' ? 'var(--success-text)' : 
                             g.status === 'Partial' ? 'var(--pending-text)' : 'var(--danger-text)'
                    }}>
                      {g.status === 'Paid' ? 'Fully Paid' : g.status === 'Partial' ? 'Partially Paid' : 'Unpaid'}
                    </span>
                  </div>
                  <div className="item-header" style={{ marginBottom: 0, marginTop: '8px' }}>
                    <span className="item-detail">{g.totalWeight} {g.unitLabel} total sold ({g.sales.length} logs)</span>
                    <strong>₹{g.totalNet.toLocaleString('en-IN')}</strong>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- BROKERS TAB --- */}
      {activeTab === 'brokers' && (
        <div className="dashboard-content">
          <div className="section-title">
            <span>Broker Accounts (आढ़तिया)</span>
            <span className="add-link" onClick={() => !isOfflineView && setShowAddBroker(true)} style={{ opacity: isOfflineView ? 0.5 : 1 }}>
              <Plus size={16} /> Add Broker
            </span>
          </div>

          {brokers.length === 0 ? (
            <div className="empty-state">
              <Users size={40} />
              <p>No brokers registered. Register brokers to log sales.</p>
            </div>
          ) : (
            <div className="list-container">
              {brokers.map(b => (
                <div 
                  key={b._id} 
                  className="item-card" 
                  onClick={() => setActiveBrokerLedger(b)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="item-header">
                    <div>
                      <span className="item-name">{b.name}</span>
                      <div className="item-detail">Mandi: {b.mandiName}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className="item-detail" style={{ display: 'block', fontSize: '0.75rem' }}>Due to you</span>
                      <strong style={{ color: b.outstandingDue > 0 ? 'var(--danger-text)' : 'var(--success-text)', fontSize: '1.1rem' }}>
                        ₹{b.outstandingDue.toLocaleString('en-IN')}
                      </strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- SALES (DAILY BILLS) TAB --- */}
      {activeTab === 'sales' && (
        <div className="dashboard-content">
          <div className="section-title">
            <span>Collective Daily Bills</span>
            <span className="add-link" onClick={() => !isOfflineView && setShowAddSale(true)} style={{ opacity: isOfflineView ? 0.5 : 1 }}>
              <Plus size={16} /> Add Sale
            </span>
          </div>

          {groupedSalesList.length === 0 ? (
            <div className="empty-state">
              <ShoppingBag size={40} />
              <p>No sale records found.</p>
            </div>
          ) : (
            <div className="list-container">
              {groupedSalesList.map(g => (
                <div key={g.key} className="item-card" style={{ padding: '12px' }}>
                  {/* Daily Bill Header Card */}
                  <div 
                    onClick={() => toggleBillExpanded(g.key)} 
                    style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  >
                    <div>
                      <strong style={{ fontSize: '1.05rem', color: 'var(--primary-color)', display: 'block' }}>
                        {g.broker?.name || 'Unknown'} ({g.broker?.mandiName})
                      </strong>
                      <span className="item-detail" style={{ fontSize: '0.85rem' }}>
                        {new Date(g.date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="badge" style={{
                        backgroundColor: g.status === 'Paid' ? 'var(--success-bg)' : 
                                        g.status === 'Partial' ? 'var(--pending-bg)' : 'var(--danger-bg)',
                        color: g.status === 'Paid' ? 'var(--success-text)' : 
                               g.status === 'Partial' ? 'var(--pending-text)' : 'var(--danger-text)'
                      }}>
                        {g.status === 'Paid' ? 'Paid' : g.status === 'Partial' ? 'Partial' : 'Unpaid'}
                      </span>
                      {expandedBills[g.key] ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', fontSize: '0.85rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
                    <span>Quantity: {g.totalWeight} {g.unitLabel}</span>
                    <span>Collected: ₹{g.totalPaid} / <strong>₹{g.totalNet}</strong></span>
                  </div>

                  {/* Accordion Collapsible Detail Portion Sales */}
                  {expandedBills[g.key] && (
                    <div style={{ marginTop: '12px', backgroundColor: '#FAFDFB', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '6px', borderBottom: '1px solid var(--border-color)', paddingBottom: '4px' }}>
                        PORTION SALES LOGS
                      </div>
                      
                      {g.sales.map((s, idx) => (
                        <div key={s._id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: '0.85rem', borderBottom: idx < g.sales.length - 1 ? '1px dashed var(--border-color)' : 'none' }}>
                          <div>
                            <strong>{s.vegetableName}</strong>: {s.quantity} {s.unit} @ ₹{s.unitPrice}
                            <span style={{ fontSize: '0.75rem', display: 'block', color: 'var(--text-secondary)' }}>
                              Gross: ₹{s.grossAmount} | Net: ₹{s.netAmount}
                            </span>
                          </div>
                          <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>₹{s.netAmount}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Collective Pay cash Actions */}
                  {g.status !== 'Paid' && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
                      <button 
                        className="btn btn-secondary" 
                        disabled={isOfflineView}
                        onClick={() => {
                          setCollectAmount(g.totalNet - g.totalPaid);
                          setCollectMethod('Cash');
                          setCollectNote('');
                          setShowCollectBillCash(g);
                        }}
                        style={{ width: 'auto', padding: '6px 12px', fontSize: '0.8rem', borderRadius: '6px', gap: '4px' }}
                      >
                        <IndianRupee size={14} /> Collect Bill Cash (कैश मिला)
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- PAYMENTS TAB --- */}
      {activeTab === 'payments' && (
        <div className="dashboard-content">
          <div className="section-title">
            <span>Payment Receipts Ledger</span>
            <span className="add-link" onClick={() => !isOfflineView && setShowAddGeneralPayment(true)} style={{ opacity: isOfflineView ? 0.5 : 1 }}>
              <Plus size={16} /> Record Payment
            </span>
          </div>

          {payments.length === 0 ? (
            <div className="empty-state">
              <IndianRupee size={40} />
              <p>No payments recorded yet.</p>
            </div>
          ) : (
            <div className="list-container">
              {payments.map(p => (
                <div key={p._id} className="item-card">
                  <div className="item-header">
                    <div>
                      <span className="item-name">₹{p.amountReceived.toLocaleString('en-IN')}</span>
                      <div className="item-detail">From Broker: {p.brokerId?.name}</div>
                      
                      {p.billDate && (
                        <div className="item-detail" style={{ color: 'var(--primary-color)', fontWeight: 600, fontSize: '0.8rem', marginTop: '2px' }}>
                          📅 Applied to Daily Bill: {new Date(p.billDate).toLocaleDateString('en-IN')}
                        </div>
                      )}
                      {p.saleId && (
                        <div className="item-detail" style={{ color: 'var(--primary-color)', fontWeight: 500, fontSize: '0.8rem', marginTop: '2px' }}>
                          Linked to Portion: {p.saleId.vegetableName} ({p.saleId.quantity} {p.saleId.unit})
                        </div>
                      )}
                    </div>
                    <span className="badge badge-settled">
                      {p.paymentMethod}
                    </span>
                  </div>
                  {p.note && <div className="item-detail" style={{ fontStyle: 'italic', margin: '4px 0' }}>"{p.note}"</div>}
                  <div className="item-detail" style={{ marginTop: '8px' }}>
                    Received on {new Date(p.date).toLocaleDateString('en-IN')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* BOTTOM TAB NAV BAR */}
      <nav className="navbar-bottom">
        <button className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
          <LayoutDashboard size={20} />
          Dashboard
        </button>
        <button className={`nav-item ${activeTab === 'brokers' ? 'active' : ''}`} onClick={() => setActiveTab('brokers')}>
          <Users size={20} />
          Brokers
        </button>
        <button className={`nav-item ${activeTab === 'sales' ? 'active' : ''}`} onClick={() => setActiveTab('sales')}>
          <ShoppingBag size={20} />
          Sales
        </button>
        <button className={`nav-item ${activeTab === 'payments' ? 'active' : ''}`} onClick={() => setActiveTab('payments')}>
          <IndianRupee size={20} />
          Payments
        </button>
      </nav>

      {/* --- ADD VEGETABLE CROP MODAL --- */}
      {showAddVegModal && (
        <div className="modal-overlay" onClick={() => setShowAddVegModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Add New Crop Crop (सब्जी जोड़ें)</span>
              <button className="close-btn" onClick={() => setShowAddVegModal(false)}><X /></button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const vName = e.target.vegNameName.value;
              setIsSavingVeg(true);
              try {
                await addVegetable(vName);
                setShowAddVegModal(false);
              } catch (err) {
                alert(err.message);
              } finally {
                setIsSavingVeg(false);
              }
            }}>
              <div className="form-group">
                <label>Vegetable Name (सब्जी का नाम)*</label>
                <input type="text" name="vegNameName" className="input-field" placeholder="e.g. Baingan, Aloo, Tomato, Gobhi" required />
              </div>
              <button type="submit" className="btn btn-primary" disabled={isSavingVeg}>
                {isSavingVeg ? 'Saving...' : 'Save Vegetable'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- ADD BROKER MODAL --- */}
      {showAddBroker && (
        <div className="modal-overlay" onClick={() => setShowAddBroker(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Register New Broker</span>
              <button className="close-btn" onClick={() => setShowAddBroker(false)}><X /></button>
            </div>
            <form onSubmit={async (e) => {
              e.preventDefault();
              const bName = e.target.brokerName.value;
              const bMandi = e.target.mandiName.value;
              const bPhone = e.target.brokerPhone.value;
              const bComm = e.target.brokerComm.value;
              setIsSavingBroker(true);
              try {
                await addBroker(bName, bMandi, bPhone, bComm ? Number(bComm) : 6);
                setShowAddBroker(false);
              } catch (err) {
                alert(err.message);
              } finally {
                setIsSavingBroker(false);
              }
            }}>
              <div className="form-group">
                <label>Broker / Firm Name (फर्म का नाम)*</label>
                <input type="text" name="brokerName" className="input-field" placeholder="e.g. Radhe Sham Arhatia" required />
              </div>
              <div className="form-group">
                <label>Mandi Location (मंडी)*</label>
                <input type="text" name="mandiName" className="input-field" placeholder="e.g. Azadpur Mandi" required />
              </div>
              <div className="form-group">
                <label>Phone Number (मोबाइल नंबर)</label>
                <input type="tel" name="brokerPhone" className="input-field" placeholder="e.g. 9876543210" />
              </div>
              <div className="form-group">
                <label>Default Commission % (कमीशन प्रतिशत)</label>
                <input 
                  type="text" 
                  name="brokerComm" 
                  className="input-field" 
                  placeholder="6" 
                  inputMode="decimal"
                  onChange={e => {
                    let val = e.target.value;
                    let cleaned = val.replace(/[^0-9.]/g, '');
                    const parts = cleaned.split('.');
                    if (parts.length > 2) {
                      cleaned = parts[0] + '.' + parts.slice(1).join('');
                    }
                    if (val !== cleaned) {
                      e.target.value = cleaned;
                    }
                  }}
                  onFocus={e => { if (e.target.value === '0') e.target.value = ''; }}
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={isSavingBroker}>
                {isSavingBroker ? 'Saving...' : 'Save Broker'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- ADD SALE MODAL (WITH DROPDOWN VEGETABLE SELECTION) --- */}
      {showAddSale && (
        <div className="modal-overlay" onClick={() => setShowAddSale(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Record Vegetable Sale</span>
              <button className="close-btn" onClick={() => setShowAddSale(false)}><X /></button>
            </div>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              const bId = selectedBrokerId;
              const veg = selectedVeg;
              const qty = Number(saleQty);
              const unit = e.target.unit.value;
              const price = Number(salePrice);
              const dateVal = e.target.date.value;

              if (!bId) {
                alert("Please select or register a broker first!");
                return;
              }

              if (!veg) {
                alert("Please select or create a vegetable first!");
                return;
              }

              const grossVal = qty * price;
              const commVal = (grossVal * selectedBrokerCommRate) / 100;

              const deductions = {
                commissionAmount: commVal,
                laborCharges: Number(saleLabor),
                mandiTax: Number(saleTax),
                otherDeductions: Number(saleOther)
              };

              setIsSavingSale(true);
              try {
                await addSale(bId, veg, qty, unit, price, deductions, dateVal);
                setShowAddSale(false);
              } catch (err) {
                alert(err.message);
              } finally {
                setIsSavingSale(false);
              }
            }}>
              {/* BROKER SELECT WITH INLINE CREATOR */}
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ marginBottom: 0 }}>Select Broker (आढ़तिया चुनें)*</label>
                  <button 
                    type="button" 
                    onClick={() => setShowInlineBrokerInput(!showInlineBrokerInput)} 
                    style={{ background: 'none', border: 'none', color: 'var(--primary-color)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    {showInlineBrokerInput ? 'Cancel' : '+ Add New Broker'}
                  </button>
                </div>

                {showInlineBrokerInput ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '10px', border: '1px solid var(--border-color)', borderRadius: '10px', backgroundColor: '#FAFDFB' }}>
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="Broker Name (फर्म का नाम)" 
                      value={inlineBrokerName}
                      onChange={e => setInlineBrokerName(e.target.value)}
                    />
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="Mandi Location (मंडी)" 
                      value={inlineMandiName}
                      onChange={e => setInlineMandiName(e.target.value)}
                    />
                    <input 
                      type="tel" 
                      className="input-field" 
                      placeholder="Phone Number (मोबाइल नंबर)" 
                      value={inlineBrokerPhone}
                      onChange={e => setInlineBrokerPhone(e.target.value)}
                    />
                    <input 
                      type="text" 
                      className="input-field" 
                      placeholder="Commission Rate (कमीशन %)" 
                      value={inlineBrokerComm}
                      inputMode="decimal"
                      onChange={handleNumericChange(setInlineBrokerComm)}
                      onFocus={e => {
                        if (inlineBrokerComm === '0') {
                          setInlineBrokerComm('');
                        }
                      }}
                    />
                    <button type="button" className="btn btn-primary" onClick={handleAddInlineBroker} style={{ padding: '8px' }} disabled={isSavingBroker}>
                      {isSavingBroker ? 'Saving...' : 'Save Broker'}
                    </button>
                  </div>
                ) : (
                  <select 
                    className="input-field" 
                    value={selectedBrokerId} 
                    onChange={e => {
                      setSelectedBrokerId(e.target.value);
                      handleBrokerChange(e.target.value);
                    }} 
                    required
                  >
                    {brokers.length === 0 ? (
                      <option value="">-- No Brokers Registered Yet (Click Add New Broker above) --</option>
                    ) : (
                      brokers.map(b => <option key={b._id} value={b._id}>{b.name} ({b.mandiName})</option>)
                    )}
                  </select>
                )}
              </div>

                {/* VEGETABLE SELECT WITH INLINE CREATOR */}
                <div className="form-group">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <label style={{ marginBottom: 0 }}>Vegetable Name (सब्जी चुनें)*</label>
                    <button 
                      type="button" 
                      onClick={() => setShowInlineVegInput(!showInlineVegInput)} 
                      style={{ background: 'none', border: 'none', color: 'var(--primary-color)', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      {showInlineVegInput ? 'Cancel' : '+ Add New Crop'}
                    </button>
                  </div>

                  {showInlineVegInput ? (
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input 
                        type="text" 
                        className="input-field" 
                        placeholder="e.g. Baingan" 
                        value={inlineVegName}
                        onChange={e => setInlineVegName(e.target.value)}
                      />
                      <button type="button" className="btn btn-primary" onClick={handleAddInlineVeg} style={{ width: 'auto', padding: '10px 16px' }} disabled={isSavingVeg}>
                        {isSavingVeg ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  ) : (
                    <select 
                      className="input-field" 
                      value={selectedVeg} 
                      onChange={e => setSelectedVeg(e.target.value)}
                      required
                    >
                      {vegetables.length === 0 ? (
                        <option value="">-- No Vegetables Added Yet (Click Add New Crop above) --</option>
                      ) : (
                        vegetables.map(v => <option key={v._id} value={v.name}>{v.name}</option>)
                      )}
                    </select>
                  )}
                </div>

                <div className="form-group">
                  <label>Quantity Sold (बेची गई मात्रा)*</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder="e.g. 12"
                    value={saleQty} 
                    inputMode="decimal"
                    onChange={handleNumericChange(setSaleQty)} 
                    required 
                  />
                </div>
                
                <div className="form-group">
                  <label>Selling Unit (इकाई)*</label>
                  <select name="unit" className="input-field">
                    <option value="Kg">Kg (किलो)</option>
                    <option value="Crates">Crates (क्रेट)</option>
                    <option value="Bags">Bags (बोरी)</option>
                    <option value="Pouch">Pouch (थैली)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Unit Price (दर प्रति इकाई ₹)*</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder="e.g. 20"
                    value={salePrice} 
                    inputMode="decimal"
                    onChange={handleNumericChange(setSalePrice)} 
                    required 
                  />
                  <div className="incrementer-row">
                    {[15, 20, 25, 30, 40, 50].map(val => (
                      <button type="button" key={val} className="increment-btn" onClick={() => setSalePrice(val)}>₹{val}</button>
                    ))}
                  </div>
                </div>

                {/* Live Gross Value visual */}
                {saleQty > 0 && salePrice > 0 && (
                  <div className="item-card" style={{ marginBottom: '16px', border: '1px dashed var(--primary-color)' }}>
                    <div className="ledger-stat" style={{ borderTop: 'none', marginTop: 0, paddingTop: 0 }}>
                      <strong>Total Sales Value:</strong>
                      <strong style={{ color: 'var(--primary-color)' }}>
                        ₹{(Number(saleQty) * Number(salePrice)).toLocaleString('en-IN')}
                      </strong>
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label>Sale Date (तारीख)</label>
                  <input type="date" name="date" className="input-field" defaultValue={new Date().toISOString().substring(0,10)} />
                </div>

                <button type="submit" className="btn btn-primary" disabled={vegetables.length === 0 || isSavingSale}>
                  {isSavingSale ? 'Saving...' : 'Save Sale'}
                </button>
              </form>
          </div>
        </div>
      )}

      {/* --- COLLECT CASH FOR GROUPED DAILY BILL MODAL --- */}
      {showCollectBillCash && (
        <div className="modal-overlay" onClick={() => setShowCollectBillCash(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Record Payment for Daily Bill</span>
              <button className="close-btn" onClick={() => setShowCollectBillCash(null)}><X /></button>
            </div>
            
            <div className="item-card" style={{ marginBottom: '16px', backgroundColor: '#FAFDFB' }}>
              <div><strong>Broker:</strong> {showCollectBillCash.broker?.name}</div>
              <div><strong>Bill Date:</strong> {new Date(showCollectBillCash.dateString).toLocaleDateString('en-IN')}</div>
              <div><strong>Total Net Value:</strong> ₹{showCollectBillCash.totalNet.toLocaleString('en-IN')}</div>
              <div><strong>Total Paid So Far:</strong> ₹{showCollectBillCash.totalPaid.toLocaleString('en-IN')}</div>
              <div style={{ borderTop: '1px dashed var(--border-color)', marginTop: '8px', paddingTop: '8px' }}>
                <strong>Remaining Balance Due:</strong> <strong style={{ color: 'var(--danger-text)' }}>₹{(showCollectBillCash.totalNet - showCollectBillCash.totalPaid).toLocaleString('en-IN')}</strong>
              </div>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              const amt = Number(collectAmount);
              if (amt <= 0) {
                alert("Please enter a valid amount");
                return;
              }
              const brokerIdVal = showCollectBillCash.broker._id || showCollectBillCash.broker;
              const gross = showCollectBillCash.totalNet - showCollectBillCash.totalPaid;
              const commRateNum = collectCommRate === '' ? 0 : Number(collectCommRate);
              const commVal = (gross * commRateNum) / 100;
              const deductions = {
                commissionAmount: commVal,
                laborCharges: Number(collectLabor) || 0,
                mandiTax: Number(collectTax) || 0,
                otherDeductions: Number(collectOther) || 0
              };

              setIsSavingPayment(true);
              try {
                // Pass billDate parameter, triggers backend distribution algorithm across portion sales
                await addPayment(brokerIdVal, null, showCollectBillCash.dateString, amt, deductions, collectMethod, e.target.date.value, collectNote);
                setShowCollectBillCash(null);
              } catch (err) {
                alert(err.message);
              } finally {
                setIsSavingPayment(false);
              }
            }}>
              {/* DEDUCTIONS AND EXPENSES GRID IN PAYMENT COLLECT MODAL */}
              <div className="deduction-grid">
                <span className="deduction-title">Add Mandi Deductions (आज की कटौतियां)</span>
                
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Commission Rate (%)</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder="0"
                    value={collectCommRate}
                    inputMode="decimal"
                    onChange={handleNumericChange(setCollectCommRate)}
                    onFocus={e => {
                      if (collectCommRate === '0') {
                        setCollectCommRate('');
                      }
                    }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Labor/Hamali (₹)</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder="0"
                    value={collectLabor}
                    inputMode="decimal"
                    onChange={handleNumericChange(setCollectLabor)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Mandi Tax (₹)</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder="0"
                    value={collectTax}
                    inputMode="decimal"
                    onChange={handleNumericChange(setCollectTax)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label>Other Expenses (₹)</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder="0"
                    value={collectOther}
                    inputMode="decimal"
                    onChange={handleNumericChange(setCollectOther)}
                  />
                </div>
              </div>

              {/* Live calculations summary */}
              {showCollectBillCash && (
                <div className="item-card" style={{ marginBottom: '16px', border: '1px dashed var(--primary-color)' }}>
                  <div className="ledger-stat">
                    <span>Total Sales Gross:</span>
                    <span>₹{(showCollectBillCash.totalNet - showCollectBillCash.totalPaid).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="ledger-stat">
                    <span>Commission ({collectCommRate || 0}%):</span>
                    <span>-₹{(((showCollectBillCash.totalNet - showCollectBillCash.totalPaid) * (Number(collectCommRate) || 0)) / 100).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="ledger-stat">
                    <span>Mandi Expenses:</span>
                    <span>-₹{(Number(collectLabor) + Number(collectTax) + Number(collectOther)).toLocaleString('en-IN')}</span>
                  </div>
                  <div className="ledger-stat" style={{ borderTop: '1px solid var(--border-color)', marginTop: '8px', paddingTop: '8px' }}>
                    <strong>Net Cash to Collect:</strong>
                    <strong style={{ color: 'var(--primary-color)' }}>
                      ₹{(
                        (showCollectBillCash.totalNet - showCollectBillCash.totalPaid) - 
                        (((showCollectBillCash.totalNet - showCollectBillCash.totalPaid) * (Number(collectCommRate) || 0)) / 100) -
                        (Number(collectLabor) + Number(collectTax) + Number(collectOther))
                      ).toLocaleString('en-IN')}
                    </strong>
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>Amount Received (नकद प्राप्त ₹)*</label>
                <input 
                  type="text" 
                  className="input-field" 
                  value={collectAmount} 
                  inputMode="decimal"
                  onChange={handleNumericChange(setCollectAmount)} 
                  required 
                />
                <div className="incrementer-row">
                  <button type="button" className="increment-btn" onClick={() => {
                    const gross = showCollectBillCash.totalNet - showCollectBillCash.totalPaid;
                    const commAmt = (gross * (Number(collectCommRate) || 0)) / 100;
                    const totalDeductions = commAmt + Number(collectLabor) + Number(collectTax) + Number(collectOther);
                    setCollectAmount(Math.max(0, gross - totalDeductions));
                  }}>
                    Clear Net Balance
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>Payment Method (भुगतान प्रकार)*</label>
                <select className="input-field" value={collectMethod} onChange={e => setCollectMethod(e.target.value)}>
                  <option value="Cash">Cash (नकद)</option>
                  <option value="UPI">UPI (PhonePe/UPI)</option>
                  <option value="Bank Transfer">Bank Transfer (बैंक ट्रांसफर)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Payment Date</label>
                <input type="date" name="date" className="input-field" defaultValue={new Date().toISOString().substring(0,10)} />
              </div>

              <div className="form-group">
                <label>Note / Remarks</label>
                <input 
                  type="text" 
                  className="input-field" 
                  placeholder="e.g. Combined session payout"
                  value={collectNote}
                  onChange={e => setCollectNote(e.target.value)}
                />
              </div>

              <button type="submit" className="btn btn-primary" disabled={isSavingPayment}>
                {isSavingPayment ? 'Recording...' : 'Record Cash Receipt'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- RECORD GENERAL/DIRECT PAYMENT MODAL --- */}
      {showAddGeneralPayment && (
        <div className="modal-overlay" onClick={() => setShowAddGeneralPayment(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Record General Cash Received</span>
              <button className="close-btn" onClick={() => setShowAddGeneralPayment(false)}><X /></button>
            </div>
            
            {brokers.length === 0 ? (
              <div className="empty-state">Register a broker first to receive payments.</div>
            ) : (
              <form onSubmit={async (e) => {
                e.preventDefault();
                const amt = Number(generalPaymentAmount);
                if (amt <= 0) {
                  alert("Please enter a valid amount");
                  return;
                }
                try {
                  await addPayment(generalPaymentBroker, null, null, amt, null, generalPaymentMethod, e.target.date.value, generalPaymentNote);
                  setShowAddGeneralPayment(false);
                } catch (err) {
                  alert(err.message);
                }
              }}>
                <div className="form-group">
                  <label>Select Broker (आढ़तिया)*</label>
                  <select 
                    className="input-field" 
                    value={generalPaymentBroker} 
                    onChange={e => setGeneralPaymentBroker(e.target.value)} 
                    required
                  >
                    {brokers.map(b => <option key={b._id} value={b._id}>{b.name} ({b.mandiName} - Due: ₹{b.outstandingDue})</option>)}
                  </select>
                </div>

                <div className="form-group">
                  <label>Amount Received (प्राप्त राशि ₹)*</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    value={generalPaymentAmount}
                    inputMode="decimal"
                    onChange={handleNumericChange(setGeneralPaymentAmount)}
                    placeholder="e.g. 5000"
                    required 
                  />
                </div>

                <div className="form-group">
                  <label>Payment Method (प्राप्ति प्रकार)*</label>
                  <select className="input-field" value={generalPaymentMethod} onChange={e => setGeneralPaymentMethod(e.target.value)}>
                    <option value="Cash">Cash (नकद)</option>
                    <option value="UPI">UPI (PhonePe/UPI)</option>
                    <option value="Bank Transfer">Bank Transfer (बैंक ट्रांसफर)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Payment Date</label>
                  <input type="date" name="date" className="input-field" defaultValue={new Date().toISOString().substring(0,10)} />
                </div>

                <div className="form-group">
                  <label>Note / Remarks</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder="e.g. Account clearance payout"
                    value={generalPaymentNote}
                    onChange={e => setGeneralPaymentNote(e.target.value)}
                  />
                </div>

                <button type="submit" className="btn btn-primary" disabled={isSavingPayment}>
                {isSavingPayment ? 'Recording...' : 'Record Cash Receipt'}
              </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* --- INDIVIDUAL BROKER LEDGER MODAL --- */}
      {activeBrokerLedger && (
        <div className="modal-overlay" onClick={() => setActiveBrokerLedger(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{activeBrokerLedger.name} Ledger</span>
              <button className="close-btn" onClick={() => setActiveBrokerLedger(null)}><X /></button>
            </div>
            
            <div className="item-card" style={{ backgroundColor: '#FAFDFB', marginBottom: '20px' }}>
              <div className="ledger-stat">
                <span className="ledger-label">Mandi:</span>
                <span className="ledger-val">{activeBrokerLedger.mandiName}</span>
              </div>
              {activeBrokerLedger.phone && (
                <div className="ledger-stat">
                  <span className="ledger-label">Phone:</span>
                  <span className="ledger-val"><Phone size={12} style={{ marginRight: '4px', display: 'inline' }} />{activeBrokerLedger.phone}</span>
                </div>
              )}
              <div className="ledger-stat">
                <span className="ledger-label">Commission Rate:</span>
                <span className="ledger-val">{activeBrokerLedger.defaultCommission}%</span>
              </div>
              <div className="ledger-stat" style={{ borderTop: '1px solid var(--border-color)', marginTop: '8px', paddingTop: '8px' }}>
                <span className="ledger-label" style={{ fontWeight: '700' }}>Current Due from Broker:</span>
                <span className="ledger-val ledger-due">₹{activeBrokerLedger.outstandingDue.toLocaleString('en-IN')}</span>
              </div>
            </div>

            {/* WhatsApp Share Box */}
            <div className="whatsapp-box" onClick={() => shareOnWhatsApp(activeBrokerLedger)}>
              <Share2 size={18} /> Send ledger summary on WhatsApp
            </div>

            <div className="section-title" style={{ marginTop: '24px', marginBottom: '8px' }}>
              <span>Transaction History</span>
            </div>

            {sales.filter(s => (s.brokerId._id || s.brokerId) === activeBrokerLedger._id).length === 0 && 
             payments.filter(p => (p.brokerId._id || p.brokerId) === activeBrokerLedger._id).length === 0 ? (
              <div className="empty-state">No transaction history logged for this broker.</div>
            ) : (
              <div className="data-table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Details</th>
                      <th style={{ textAlign: 'right' }}>Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Combine sales and payments */}
                    {[
                      ...sales.filter(s => (s.brokerId._id || s.brokerId) === activeBrokerLedger._id).map(s => ({
                        date: s.date,
                        type: 'sale',
                        desc: `${s.vegetableName} x ${s.quantity} ${s.unit} (${s.paymentStatus})`,
                        amount: s.netAmount,
                        isCredit: true
                      })),
                      ...payments.filter(p => (p.brokerId._id || p.brokerId) === activeBrokerLedger._id).map(p => ({
                        date: p.date,
                        type: 'payment',
                        desc: p.billDate ? `Bill Payout (${new Date(p.billDate).toLocaleDateString('en-IN', {month: 'short', day: 'numeric'})})` : `Cash Recd (General)`,
                        amount: p.amountReceived,
                        isCredit: false
                      }))
                    ].sort((a,b) => new Date(b.date) - new Date(a.date)).map((item, idx) => (
                      <tr key={idx}>
                        <td>{new Date(item.date).toLocaleDateString('en-IN', {month: 'short', day: 'numeric'})}</td>
                        <td>
                          <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{item.desc}</span>
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: item.isCredit ? 'var(--danger-text)' : 'var(--success-text)' }}>
                          {item.isCredit ? '+' : '-'}₹{item.amount.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
