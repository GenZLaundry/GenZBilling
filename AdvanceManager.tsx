import React, { useState, useEffect } from 'react';
import apiService from './api';
import { useAlert } from './GlobalAlert';

interface AdvanceHistory {
  amount: number;
  type: 'GIVEN' | 'RETURNED';
  date: string;
  note: string;
  _id: string;
}

interface Advance {
  _id: string;
  personName: string;
  amountGiven: number;
  amountReturned: number;
  date: string;
  status: 'PENDING' | 'SETTLED';
  history: AdvanceHistory[];
}

interface AdvanceManagerProps {
  onClose: () => void;
}

const AdvanceManager: React.FC<AdvanceManagerProps> = ({ onClose }) => {
  const { showAlert, showConfirm } = useAlert();
  const [advances, setAdvances] = useState<Advance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form for new advance
  const [formData, setFormData] = useState({
    personName: '',
    amountGiven: '',
    date: new Date().toISOString().split('T')[0],
    note: ''
  });

  // Form for adding history (return or give more)
  const [selectedAdvance, setSelectedAdvance] = useState<Advance | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyForm, setHistoryForm] = useState({
    amount: '',
    type: 'RETURNED' as 'GIVEN' | 'RETURNED',
    date: new Date().toISOString().split('T')[0],
    note: ''
  });

  const loadAdvances = async () => {
    try {
      setLoading(true);
      const response = await apiService.getAdvances(undefined, searchQuery);
      if (response.success && response.data) {
        setAdvances(response.data);
      }
    } catch (error) {
      console.error('Failed to load advances:', error);
      showAlert({ message: 'Failed to load advances', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      loadAdvances();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.personName || !formData.amountGiven) return;

    try {
      const payload = {
        personName: formData.personName,
        amountGiven: parseFloat(formData.amountGiven),
        date: formData.date,
        note: formData.note
      };

      console.log('📤 Sending createAdvance request with payload:', payload);
      const response = await apiService.createAdvance(payload);
      console.log('📥 Received createAdvance response:', response);
      if (response.success) {
        showAlert({ message: 'Advance record created successfully!', type: 'success' });
        resetForm();
        loadAdvances();
      } else {
        console.error('❌ Failed to create advance record:', response);
        showAlert({ message: 'Failed to create record: ' + response.message, type: 'error' });
      }
    } catch (error) {
      console.error('❌ Exception in create advance:', error);
      showAlert({ message: 'Failed to create record (check console)', type: 'error' });
    }
  };

  const handleHistorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAdvance || !historyForm.amount) return;

    try {
      const payload = {
        amount: parseFloat(historyForm.amount),
        type: historyForm.type,
        date: historyForm.date,
        note: historyForm.note
      };

      console.log('📤 Sending addAdvanceHistory request with payload:', payload);
      const response = await apiService.addAdvanceHistory(selectedAdvance._id, payload);
      console.log('📥 Received addAdvanceHistory response:', response);
      if (response.success) {
        showAlert({ message: 'History added successfully!', type: 'success' });
        setShowHistoryModal(false);
        setHistoryForm({
          amount: '',
          type: 'RETURNED',
          date: new Date().toISOString().split('T')[0],
          note: ''
        });
        loadAdvances();
      } else {
        console.error('❌ Failed to add advance history:', response);
        showAlert({ message: 'Failed to update: ' + response.message, type: 'error' });
      }
    } catch (error) {
      console.error('❌ Exception in add advance history:', error);
      showAlert({ message: 'Failed to update record (check console)', type: 'error' });
    }
  };

  const handleDelete = async (id: string) => {
    showConfirm(
      'Are you sure you want to delete this entire record? This action cannot be undone.',
      async () => {
        try {
          const response = await apiService.deleteAdvance(id);
          if (response.success) {
            showAlert({ message: 'Record deleted successfully!', type: 'success' });
            loadAdvances();
          } else {
            showAlert({ message: 'Failed to delete: ' + response.message, type: 'error' });
          }
        } catch (error) {
          console.error('Failed to delete advance:', error);
          showAlert({ message: 'Failed to delete record', type: 'error' });
        }
      }
    );
  };

  const resetForm = () => {
    setFormData({
      personName: '',
      amountGiven: '',
      date: new Date().toISOString().split('T')[0],
      note: ''
    });
    setShowAddForm(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const totalOutstanding = advances.reduce((sum, adv) => {
    const remaining = adv.amountGiven - adv.amountReturned;
    return sum + (remaining > 0 ? remaining : 0);
  }, 0);

  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: 'var(--bg-base)',
      display: 'flex',
      flexDirection: 'column',
      animation: 'slideIn 0.3s ease'
    }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Header */}
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
              <i className="fas fa-hand-holding-usd" style={{ marginRight: '8px', color: '#f39c12' }}></i>
              Money Given Out
            </h2>
            <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
              Track money you gave to someone — staff advance, borrowed money — and record when it comes back
            </p>
          </div>

          {/* Summary Card */}
          <div style={{
            background: 'var(--bg-elevated)', padding: '20px', borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)', borderLeft: '4px solid #f39c12',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '360px'
          }}>
            <div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500', marginBottom: '6px' }}>
                Still Pending Return
              </div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#f39c12' }}>
                {formatCurrency(totalOutstanding)}
              </div>
            </div>
            <div style={{ background: 'rgba(243, 156, 18, 0.1)', padding: '12px', borderRadius: '10px', color: '#f39c12', fontSize: '22px' }}>
              <i className="fas fa-clock"></i>
            </div>
          </div>

          {/* Controls */}
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f39c12', border: 'none' }}
            >
              <i className={`fas ${showAddForm ? 'fa-times' : 'fa-plus'}`}></i>
              {showAddForm ? 'Cancel' : '+ New Money Given Record'}
            </button>
            <div style={{ flex: 1, position: 'relative' }}>
              <i className="fas fa-search" style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}></i>
              <input
                type="text"
                placeholder="Search by person name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field"
                style={{ paddingLeft: '44px', width: '100%' }}
              />
            </div>
          </div>

          {/* Add Form */}
          {showAddForm && (
            <div style={{ padding: '24px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
              <h3 style={{ margin: '0 0 6px 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px' }}>
                <i className="fas fa-plus-circle" style={{ color: '#f39c12' }}></i>
                Who Did You Give Money To?
              </h3>
              <p style={{ margin: '0 0 20px 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                e.g. Staff advance, friend borrow, supplier advance
              </p>
              <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <input
                  type="text"
                  placeholder="Person Name (e.g. Raju Staff, Amit Friend) *"
                  value={formData.personName}
                  onChange={(e) => setFormData({ ...formData, personName: e.target.value })}
                  className="input-field"
                  required
                />
                <input
                  type="number"
                  placeholder="Amount Given (₹) *"
                  value={formData.amountGiven}
                  onChange={(e) => setFormData({ ...formData, amountGiven: e.target.value })}
                  className="input-field"
                  required
                  min="1"
                />
                <input
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="input-field"
                  required
                />
                <input
                  type="text"
                  placeholder="Note (optional)"
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                  className="input-field"
                />
                <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '12px', marginTop: '8px' }}>
                  <button type="submit" className="btn btn-primary">Save Record</button>
                  <button type="button" onClick={resetForm} className="btn btn-secondary">Cancel</button>
                </div>
              </form>
            </div>
          )}

          {/* List */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>Loading records...</div>
          ) : advances.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 40px', color: 'var(--text-secondary)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border-subtle)' }}>
              <i className="fas fa-hand-holding-usd fa-3x" style={{ opacity: 0.5, marginBottom: '20px' }}></i>
              <h3 style={{ color: 'var(--text-primary)', margin: '0 0 8px 0' }}>No records found</h3>
              <p style={{ margin: 0, fontSize: '13px' }}>Add a record when you give money to someone — staff advance, borrowed money</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '16px' }}>
              {advances.map((advance) => {
                const remaining = advance.amountGiven - advance.amountReturned;
                const isSettled = remaining <= 0;

                return (
                  <div key={advance._id} style={{
                    background: 'var(--bg-elevated)', 
                    borderRadius: 'var(--radius-md)', 
                    padding: '20px',
                    border: '1px solid var(--border-subtle)',
                    borderLeft: `4px solid ${isSettled ? '#27ae60' : '#f39c12'}`
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                          <h4 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: 'var(--text-primary)' }}>
                            {advance.personName}
                          </h4>
                          <span style={{
                            background: isSettled ? '#27ae6020' : '#f39c1220', 
                            color: isSettled ? '#27ae60' : '#f39c12',
                            padding: '4px 10px', 
                            borderRadius: 'var(--radius-sm)', 
                            fontSize: '11px', 
                            fontWeight: 'bold'
                          }}>
                            {isSettled ? 'SETTLED' : 'PENDING'}
                          </span>
                        </div>
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', gap: '16px' }}>
                          <span>Given: {formatCurrency(advance.amountGiven)}</span>
                          <span>Returned: <span style={{ color: '#27ae60' }}>{formatCurrency(advance.amountReturned)}</span></span>
                          {!isSettled && <span>Remaining: <span style={{ color: '#e74c3c', fontWeight: 'bold' }}>{formatCurrency(remaining)}</span></span>}
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {!isSettled && (
                          <button
                            onClick={() => { setSelectedAdvance(advance); setShowHistoryModal(true); setHistoryForm({ ...historyForm, type: 'RETURNED' }); }}
                            className="btn btn-secondary"
                            style={{ padding: '8px 12px', fontSize: '13px', background: '#27ae6020', color: '#27ae60', border: '1px solid #27ae6040' }}
                          >
                            <i className="fas fa-undo"></i> Returned
                          </button>
                        )}
                        <button
                          onClick={() => { setSelectedAdvance(advance); setShowHistoryModal(true); setHistoryForm({ ...historyForm, type: 'GIVEN' }); }}
                          className="btn btn-ghost"
                          style={{ padding: '8px 12px', fontSize: '13px' }}
                        >
                          <i className="fas fa-hand-holding-usd"></i> Give More
                        </button>
                        <button
                          onClick={() => handleDelete(advance._id)}
                          className="btn btn-ghost"
                          style={{ padding: '8px', color: 'var(--error)' }}
                          title="Delete Record"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </div>
                    </div>

                    {/* History */}
                    {advance.history && advance.history.length > 0 && (
                      <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
                        <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)', marginBottom: '8px' }}>TRANSACTION HISTORY</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {advance.history.map((hist, idx) => (
                            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', padding: '8px', background: 'var(--bg-base)', borderRadius: '4px' }}>
                              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <span style={{ color: hist.type === 'RETURNED' ? '#27ae60' : '#e74c3c', fontWeight: 'bold', width: '80px' }}>
                                  {hist.type === 'RETURNED' ? '✅ RETURNED' : '🔴 GIVEN'}
                                </span>
                                <span>{new Date(hist.date).toLocaleDateString()}</span>
                                {hist.note && <span style={{ color: 'var(--text-secondary)' }}>- {hist.note}</span>}
                              </div>
                              <div style={{ fontWeight: 'bold' }}>{formatCurrency(hist.amount)}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* History Modal */}
      {showHistoryModal && selectedAdvance && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', zIndex: 1100,
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{ background: 'var(--bg-elevated)', padding: '24px', borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: '400px' }}>
              <h3 style={{ margin: '0 0 8px 0', color: 'var(--text-primary)' }}>
              {historyForm.type === 'RETURNED' ? '💚 Money Returned' : '🔴 Give More Money'}
            </h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: 'var(--text-secondary)' }}>
              Person: <strong>{selectedAdvance.personName}</strong>
              {historyForm.type === 'RETURNED' && <span><br/>Remaining: {formatCurrency(selectedAdvance.amountGiven - selectedAdvance.amountReturned)}</span>}
            </p>
            <form onSubmit={handleHistorySubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <input
                type="number"
                placeholder="Amount (₹) *"
                value={historyForm.amount}
                onChange={(e) => setHistoryForm({ ...historyForm, amount: e.target.value })}
                className="input-field"
                required
                min="1"
              />
              <input
                type="date"
                value={historyForm.date}
                onChange={(e) => setHistoryForm({ ...historyForm, date: e.target.value })}
                className="input-field"
                required
              />
              <input
                type="text"
                placeholder="Note (optional)"
                value={historyForm.note}
                onChange={(e) => setHistoryForm({ ...historyForm, note: e.target.value })}
                className="input-field"
              />
              <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save</button>
                <button type="button" onClick={() => setShowHistoryModal(false)} className="btn btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvanceManager;
