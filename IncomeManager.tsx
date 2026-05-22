import React, { useState, useEffect } from 'react';
import apiService from './api';
import { useAlert } from './GlobalAlert';

interface Income {
  _id: string;
  source: string;
  amount: number;
  description: string;
  date: string;
}

interface IncomeManagerProps {
  onClose: () => void;
}

const IncomeManager: React.FC<IncomeManagerProps> = ({ onClose: _onClose }) => {
  const { showAlert, showConfirm } = useAlert();
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);

  const [formData, setFormData] = useState({
    source: '',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  });

  const loadIncomes = async () => {
    try {
      setLoading(true);
      const response = await apiService.getIncomes();
      if (response.success && response.data) {
        setIncomes(response.data as Income[]);
      }
    } catch (error) {
      console.error('Failed to load capital records:', error);
      showAlert({ message: 'Failed to load records', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadIncomes(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.source || !formData.amount) return;
    try {
      const payload = {
        source: formData.source,
        amount: parseFloat(formData.amount),
        description: formData.description,
        date: formData.date
      };
      const response = editingIncome
        ? await apiService.updateIncome(editingIncome._id, payload)
        : await apiService.createIncome(payload);

      if (response.success) {
        showAlert({ message: editingIncome ? 'Record updated!' : 'Capital entry saved!', type: 'success' });
        resetForm();
        loadIncomes();
      } else {
        showAlert({ message: 'Failed to save: ' + response.message, type: 'error' });
      }
    } catch (error) {
      showAlert({ message: 'Failed to save record', type: 'error' });
    }
  };

  const handleEdit = (income: Income) => {
    setEditingIncome(income);
    setFormData({
      source: income.source,
      amount: income.amount.toString(),
      description: income.description || '',
      date: new Date(income.date).toISOString().split('T')[0]
    });
    setShowAddForm(true);
  };

  const handleDelete = async (id: string) => {
    showConfirm('Are you sure you want to delete this record? This cannot be undone.', async () => {
      try {
        const response = await apiService.deleteIncome(id);
        if (response.success) {
          showAlert({ message: 'Record deleted!', type: 'success' });
          loadIncomes();
        } else {
          showAlert({ message: 'Delete failed: ' + response.message, type: 'error' });
        }
      } catch {
        showAlert({ message: 'Delete failed', type: 'error' });
      }
    });
  };

  const resetForm = () => {
    setFormData({ source: '', amount: '', description: '', date: new Date().toISOString().split('T')[0] });
    setEditingIncome(null);
    setShowAddForm(false);
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);

  const totalCapital = incomes.reduce((sum, inc) => sum + inc.amount, 0);

  return (
    <div style={{ width: '100%', height: '100%', background: 'var(--bg-base)', display: 'flex', flexDirection: 'column', animation: 'slideIn 0.3s ease' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Header */}
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
              <i className="fas fa-piggy-bank" style={{ marginRight: '8px', color: '#27ae60' }}></i>
              Capital Invested
            </h2>
            <p style={{ margin: '6px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
              Money you or someone else put into the business — your own funds or external investment
            </p>
          </div>

          {/* Summary Card */}
          <div style={{
            background: 'var(--bg-elevated)', padding: '20px', borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)', borderLeft: '4px solid #27ae60',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', maxWidth: '360px'
          }}>
            <div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '500', marginBottom: '6px' }}>
                Total Capital Invested
              </div>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#27ae60' }}>
                {formatCurrency(totalCapital)}
              </div>
            </div>
            <div style={{ background: 'rgba(39, 174, 96, 0.1)', padding: '12px', borderRadius: '10px', color: '#27ae60', fontSize: '22px' }}>
              <i className="fas fa-coins"></i>
            </div>
          </div>

          {/* Add Button */}
          <div>
            <button
              onClick={() => { resetForm(); setShowAddForm(!showAddForm); }}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#27ae60', border: 'none' }}
            >
              <i className={`fas ${showAddForm ? 'fa-times' : 'fa-plus'}`}></i>
              {showAddForm ? 'Cancel' : '+ Add Capital Entry'}
            </button>
          </div>

          {/* Add/Edit Form */}
          {showAddForm && (
            <div style={{ padding: '24px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-subtle)' }}>
              <h3 style={{ margin: '0 0 6px 0', color: 'var(--text-primary)', fontSize: '16px', fontWeight: '600' }}>
                <i className={`fas ${editingIncome ? 'fa-edit' : 'fa-plus-circle'}`} style={{ color: '#27ae60', marginRight: '8px' }}></i>
                {editingIncome ? 'Edit Record' : 'New Capital Entry'}
              </h3>
              <p style={{ margin: '0 0 20px 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                e.g. "Owner investment", "Bank loan taken", "Partner investment"
              </p>
              <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <input
                  type="text"
                  placeholder="Source (e.g. Owner Funds, Bank Loan) *"
                  value={formData.source}
                  onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                  className="input-field"
                  required
                />
                <input
                  type="number"
                  placeholder="Amount (₹) *"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
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
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input-field"
                />
                <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '12px', marginTop: '8px' }}>
                  <button type="submit" className="btn btn-primary" style={{ background: '#27ae60', border: 'none' }}>
                    {editingIncome ? 'Update Record' : 'Save Record'}
                  </button>
                  <button type="button" onClick={resetForm} className="btn btn-secondary">Cancel</button>
                </div>
              </form>
            </div>
          )}

          {/* List */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
              <i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i>Loading...
            </div>
          ) : incomes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 40px', color: 'var(--text-secondary)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border-subtle)' }}>
              <i className="fas fa-piggy-bank fa-3x" style={{ opacity: 0.4, marginBottom: '16px', display: 'block' }}></i>
              <h3 style={{ color: 'var(--text-primary)', margin: '0 0 8px 0' }}>No capital entries found</h3>
              <p style={{ margin: 0, fontSize: '13px' }}>Add your first entry — e.g. owner investment or bank loan</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              {incomes.map((income) => (
                <div key={income._id} style={{
                  background: 'var(--bg-elevated)',
                  borderRadius: 'var(--radius-md)',
                  padding: '18px 20px',
                  border: '1px solid var(--border-subtle)',
                  borderLeft: '4px solid #27ae60',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '16px'
                }}>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' }}>
                      {income.source}
                    </h4>
                    {income.description && (
                      <p style={{ margin: '0 0 6px 0', color: 'var(--text-secondary)', fontSize: '13px' }}>
                        {income.description}
                      </p>
                    )}
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <i className="far fa-calendar-alt"></i>
                      {new Date(income.date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#27ae60', whiteSpace: 'nowrap' }}>
                      +{formatCurrency(income.amount)}
                    </div>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => handleEdit(income)} className="btn btn-ghost"
                        style={{ padding: '8px', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Edit">
                        <i className="fas fa-pen" style={{ fontSize: '12px' }}></i>
                      </button>
                      <button onClick={() => handleDelete(income._id)} className="btn btn-ghost"
                        style={{ padding: '8px', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--error)' }} title="Delete">
                        <i className="fas fa-trash" style={{ fontSize: '12px' }}></i>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IncomeManager;
