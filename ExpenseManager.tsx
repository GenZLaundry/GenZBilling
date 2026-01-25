import React, { useState, useEffect } from 'react';
import apiService from './api';
import { useAlert } from './GlobalAlert';

interface Expense {
  _id: string;
  title: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  createdAt: string;
}

interface ExpenseManagerProps {
  onClose: () => void;
}

const ExpenseManager: React.FC<ExpenseManagerProps> = ({ onClose }) => {
  const { showAlert, showConfirm } = useAlert();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [expenseSummary, setExpenseSummary] = useState<any>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    amount: '',
    category: 'OTHER',
    date: new Date().toISOString().split('T')[0]
  });

  const categories = [
    { value: 'RENT', label: '🏠 Rent', color: '#e74c3c' },
    { value: 'UTILITIES', label: '⚡ Utilities', color: '#f39c12' },
    { value: 'SUPPLIES', label: '📦 Supplies', color: '#3498db' },
    { value: 'MAINTENANCE', label: '🔧 Maintenance', color: '#9b59b6' },
    { value: 'SALARY', label: '💰 Salary', color: '#27ae60' },
    { value: 'MARKETING', label: '📢 Marketing', color: '#e67e22' },
    { value: 'OTHER', label: '📝 Other', color: '#95a5a6' }
  ];

  useEffect(() => {
    loadExpenses();
    loadExpenseSummary();
  }, [currentPage, selectedCategory]);

  const showCustomAlert = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    showAlert({ message, type });
  };

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const params: any = { page: currentPage, limit: 10 };
      if (selectedCategory !== 'ALL') {
        params.category = selectedCategory;
      }
      
      const response = await apiService.getExpenses(params);
      if (response.success && response.data) {
        setExpenses(response.data.expenses);
        setTotalPages(response.data.totalPages);
      }
    } catch (error) {
      console.error('Failed to load expenses:', error);
      showCustomAlert('Failed to load expenses. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadExpenseSummary = async () => {
    try {
      const response = await apiService.getExpenseSummary('month');
      if (response.success && response.data) {
        setExpenseSummary(response.data);
      }
    } catch (error) {
      console.error('Failed to load expense summary:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title || !formData.amount) {
      showCustomAlert('Please fill in title and amount', 'error');
      return;
    }

    try {
      const expenseData = {
        ...formData,
        amount: parseFloat(formData.amount)
      };

      if (editingExpense) {
        await apiService.updateExpense(editingExpense._id, expenseData);
        showCustomAlert('Expense updated successfully!', 'success');
      } else {
        await apiService.createExpense(expenseData);
        showCustomAlert('Expense added successfully!', 'success');
      }

      resetForm();
      loadExpenses();
      loadExpenseSummary();
    } catch (error) {
      console.error('Failed to save expense:', error);
      showCustomAlert('Failed to save expense. Please try again.', 'error');
    }
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      title: expense.title,
      description: expense.description,
      amount: expense.amount.toString(),
      category: expense.category,
      date: expense.date.split('T')[0]
    });
    setShowAddForm(true);
  };

  const handleDelete = async (id: string) => {
    showConfirm(
      'Are you sure you want to delete this expense? This action cannot be undone.',
      async () => {
        try {
          const response = await apiService.deleteExpense(id);
          if (response.success) {
            showCustomAlert('Expense deleted successfully!', 'success');
            loadExpenses();
            loadExpenseSummary();
          } else {
            showCustomAlert('Failed to delete expense: ' + response.message, 'error');
          }
        } catch (error) {
          console.error('Failed to delete expense:', error);
          showCustomAlert('Failed to delete expense. Please try again.', 'error');
        }
      }
    );
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      amount: '',
      category: 'OTHER',
      date: new Date().toISOString().split('T')[0]
    });
    setEditingExpense(null);
    setShowAddForm(false);
  };

  const getCategoryInfo = (category: string) => {
    return categories.find(cat => cat.value === category) || categories[categories.length - 1];
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center',
      zIndex: 1000, backdropFilter: 'blur(10px)'
    }}>
      <div style={{
        background: 'white', borderRadius: '20px', width: '90%', maxWidth: '1200px',
        height: '90%', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 25px 50px rgba(0,0,0,0.3)'
      }}>
        
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #e74c3c, #c0392b)',
          color: 'white', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>💸 Expense Management</h2>
            <p style={{ margin: '5px 0 0 0', opacity: 0.9, fontSize: '14px' }}>
              Track and manage business expenses
            </p>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '10px',
            padding: '10px 15px', color: 'white', cursor: 'pointer', fontSize: '16px'
          }}>
            ✕ Close
          </button>
        </div>

        {/* Summary Cards */}
        {expenseSummary && (
          <div style={{ padding: '20px', background: '#f8f9fa', borderBottom: '1px solid #dee2e6' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
              <div style={{
                background: 'white', padding: '15px', borderRadius: '10px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)', textAlign: 'center'
              }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#e74c3c' }}>
                  ₹{expenseSummary.totalExpenses?.toLocaleString() || 0}
                </div>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>Total Expenses (Month)</div>
              </div>
              
              <div style={{
                background: 'white', padding: '15px', borderRadius: '10px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)', textAlign: 'center'
              }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#3498db' }}>
                  {expenseSummary.expensesByCategory?.length || 0}
                </div>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>Categories Used</div>
              </div>

              <div style={{
                background: 'white', padding: '15px', borderRadius: '10px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.1)', textAlign: 'center'
              }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#27ae60' }}>
                  {expenseSummary.recentExpenses?.length || 0}
                </div>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>Recent Expenses</div>
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div style={{ padding: '20px', borderBottom: '1px solid #dee2e6', display: 'flex', gap: '15px', alignItems: 'center' }}>
          <button
            onClick={() => setShowAddForm(true)}
            style={{
              background: 'linear-gradient(135deg, #27ae60, #2ecc71)', color: 'white',
              border: 'none', borderRadius: '10px', padding: '12px 20px',
              cursor: 'pointer', fontWeight: 'bold', fontSize: '14px'
            }}
          >
            ➕ Add Expense
          </button>

          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              padding: '10px', borderRadius: '8px', border: '2px solid #dee2e6',
              fontSize: '14px', cursor: 'pointer'
            }}
          >
            <option value="ALL">All Categories</option>
            {categories.map(cat => (
              <option key={cat.value} value={cat.value}>{cat.label}</option>
            ))}
          </select>
        </div>

        {/* Add/Edit Form */}
        {showAddForm && (
          <div style={{ padding: '20px', background: '#f8f9fa', borderBottom: '1px solid #dee2e6' }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#2c3e50' }}>
              {editingExpense ? '✏️ Edit Expense' : '➕ Add New Expense'}
            </h3>
            <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
              <input
                type="text"
                placeholder="Expense Title *"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                style={{ padding: '10px', borderRadius: '8px', border: '2px solid #dee2e6', fontSize: '14px' }}
                required
              />
              
              <input
                type="number"
                placeholder="Amount (₹) *"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                style={{ padding: '10px', borderRadius: '8px', border: '2px solid #dee2e6', fontSize: '14px' }}
                required
                min="0"
                step="0.01"
              />

              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                style={{ padding: '10px', borderRadius: '8px', border: '2px solid #dee2e6', fontSize: '14px' }}
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>

              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                style={{ padding: '10px', borderRadius: '8px', border: '2px solid #dee2e6', fontSize: '14px' }}
              />

              <input
                type="text"
                placeholder="Description (optional)"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                style={{ padding: '10px', borderRadius: '8px', border: '2px solid #dee2e6', fontSize: '14px', gridColumn: 'span 2' }}
              />

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="submit"
                  style={{
                    background: 'linear-gradient(135deg, #27ae60, #2ecc71)', color: 'white',
                    border: 'none', borderRadius: '8px', padding: '10px 20px',
                    cursor: 'pointer', fontWeight: 'bold'
                  }}
                >
                  {editingExpense ? 'Update' : 'Add'} Expense
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  style={{
                    background: '#95a5a6', color: 'white',
                    border: 'none', borderRadius: '8px', padding: '10px 20px',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Expenses List */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              <div style={{ fontSize: '40px', marginBottom: '10px' }}>⏳</div>
              Loading expenses...
            </div>
          ) : expenses.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              <div style={{ fontSize: '60px', marginBottom: '15px' }}>💸</div>
              <h3>No expenses found</h3>
              <p>Add your first expense to start tracking</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '15px' }}>
              {expenses.map((expense) => {
                const categoryInfo = getCategoryInfo(expense.category);
                return (
                  <div key={expense._id} style={{
                    background: 'white', borderRadius: '10px', padding: '20px',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    borderLeft: `4px solid ${categoryInfo.color}`
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                        <h4 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#2c3e50' }}>
                          {expense.title}
                        </h4>
                        <span style={{
                          background: categoryInfo.color, color: 'white',
                          padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold'
                        }}>
                          {categoryInfo.label}
                        </span>
                      </div>
                      {expense.description && (
                        <p style={{ margin: '0 0 8px 0', color: '#666', fontSize: '14px' }}>
                          {expense.description}
                        </p>
                      )}
                      <div style={{ fontSize: '12px', color: '#999' }}>
                        📅 {new Date(expense.date).toLocaleDateString('en-IN')}
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#e74c3c' }}>
                          ₹{expense.amount.toLocaleString()}
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleEdit(expense)}
                          style={{
                            background: '#3498db', color: 'white', border: 'none',
                            borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', fontSize: '12px'
                          }}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => handleDelete(expense._id)}
                          style={{
                            background: '#e74c3c', color: 'white', border: 'none',
                            borderRadius: '6px', padding: '6px 10px', cursor: 'pointer', fontSize: '12px'
                          }}
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ padding: '20px', borderTop: '1px solid #dee2e6', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                style={{
                  padding: '8px 15px', borderRadius: '6px', border: 'none',
                  background: currentPage === 1 ? '#bdc3c7' : '#3498db',
                  color: 'white', cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                }}
              >
                ← Previous
              </button>
              
              <span style={{ padding: '8px 15px', color: '#666' }}>
                Page {currentPage} of {totalPages}
              </span>
              
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                style={{
                  padding: '8px 15px', borderRadius: '6px', border: 'none',
                  background: currentPage === totalPages ? '#bdc3c7' : '#3498db',
                  color: 'white', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                }}
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpenseManager;