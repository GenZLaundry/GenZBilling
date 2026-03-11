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
  
  // Date filtering states
  const [viewMode, setViewMode] = useState<'day' | 'month' | 'year'>('month');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    amount: '',
    category: 'OTHER',
    date: new Date().toISOString().split('T')[0]
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const categories = [
    { value: 'RENT', label: 'Rent', icon: 'fa-home', color: '#e74c3c' },
    { value: 'UTILITIES', label: 'Utilities', icon: 'fa-bolt', color: '#f39c12' },
    { value: 'SUPPLIES', label: 'Supplies', icon: 'fa-box', color: '#3498db' },
    { value: 'MAINTENANCE', label: 'Maintenance', icon: 'fa-wrench', color: '#9b59b6' },
    { value: 'SALARY', label: 'Salary', icon: 'fa-money-bill-wave', color: '#27ae60' },
    { value: 'MARKETING', label: 'Marketing', icon: 'fa-bullhorn', color: '#e67e22' },
    { value: 'OTHER', label: 'Other', icon: 'fa-clipboard-list', color: '#95a5a6' }
  ];

  useEffect(() => {
    loadExpenses();
    loadExpenseSummary();
  }, [currentPage, selectedCategory, viewMode, selectedDate, selectedMonth, selectedYear]);

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
      
      // Add date filtering based on view mode
      if (viewMode === 'day') {
        params.startDate = selectedDate;
        params.endDate = selectedDate;
      } else if (viewMode === 'month') {
        const year = selectedYear;
        const month = selectedMonth;
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);
        params.startDate = startDate.toISOString().split('T')[0];
        params.endDate = endDate.toISOString().split('T')[0];
      } else if (viewMode === 'year') {
        const startDate = new Date(selectedYear, 0, 1);
        const endDate = new Date(selectedYear, 11, 31);
        params.startDate = startDate.toISOString().split('T')[0];
        params.endDate = endDate.toISOString().split('T')[0];
      }
      
      const response = await apiService.getExpenses(params);
      if (response.success && response.data) {
        const data = response.data as { expenses: Expense[]; totalPages: number };
        setExpenses(data.expenses);
        setTotalPages(data.totalPages);
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
      // Calculate summary based on current filters
      let period: 'day' | 'month' | 'year' | 'week' = 'month';
      let startDate, endDate;
      
      if (viewMode === 'day') {
        period = 'day';
        startDate = selectedDate;
        endDate = selectedDate;
      } else if (viewMode === 'month') {
        period = 'month';
        const year = selectedYear;
        const month = selectedMonth;
        startDate = new Date(year, month - 1, 1).toISOString().split('T')[0];
        endDate = new Date(year, month, 0).toISOString().split('T')[0];
      } else if (viewMode === 'year') {
        period = 'year';
        startDate = new Date(selectedYear, 0, 1).toISOString().split('T')[0];
        endDate = new Date(selectedYear, 11, 31).toISOString().split('T')[0];
      }
      
      const response = await apiService.getExpenseSummary(period, startDate, endDate);
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
      background: 'transparent', width: '100%',
      display: 'flex', flexDirection: 'column',
      animation: 'slideIn 0.3s ease-out'
    }}>
      <div style={{
        background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)', width: '100%',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        border: '1px solid var(--border-subtle)'
      }}>
        
        {/* Header */}
        <div style={{
          background: 'transparent',
          padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          borderBottom: '1px solid var(--border-subtle)'
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
              <i className="fas fa-wallet" style={{ marginRight: '8px', color: 'var(--accent)' }}></i>
              Expense Management
            </h2>
            <p style={{ margin: '5px 0 0 0', opacity: 0.9, fontSize: '13px', color: 'var(--text-secondary)' }}>
              Track and manage business expenses
            </p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            <i className="fas fa-times"></i> Close
          </button>
        </div>

        {/* Summary Cards */}
        {expenseSummary && (
          <div style={{ padding: '24px', borderBottom: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
              
              <div style={{
                background: 'var(--bg-elevated)', padding: '20px', borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '12px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '500' }}>
                    Total Expenses ({viewMode === 'day' ? 'Day' : viewMode === 'month' ? 'Month' : 'Year'})
                  </div>
                  <div style={{ background: 'rgba(231, 76, 60, 0.1)', padding: '8px', borderRadius: '8px', color: '#e74c3c' }}>
                    <i className="fas fa-file-invoice-dollar"></i>
                  </div>
                </div>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                  {formatCurrency(expenseSummary.totalExpenses || 0)}
                </div>
              </div>
              
              <div style={{
                background: 'var(--bg-elevated)', padding: '20px', borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '12px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '500' }}>
                    Categories Used
                  </div>
                  <div style={{ background: 'rgba(52, 152, 219, 0.1)', padding: '8px', borderRadius: '8px', color: '#3498db' }}>
                    <i className="fas fa-tags"></i>
                  </div>
                </div>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                  {expenseSummary.expensesByCategory?.length || 0}
                </div>
              </div>

              <div style={{
                background: 'var(--bg-elevated)', padding: '20px', borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '12px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '500' }}>
                    Total Records
                  </div>
                  <div style={{ background: 'rgba(39, 174, 96, 0.1)', padding: '8px', borderRadius: '8px', color: '#27ae60' }}>
                    <i className="fas fa-receipt"></i>
                  </div>
                </div>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                  {expenseSummary.recentExpenses?.length || 0}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div style={{ padding: '24px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => setShowAddForm(true)}
                className="btn btn-primary"
                style={{ borderRadius: 'var(--radius-md)' }}
              >
                <i className="fas fa-plus"></i> Add Expense
              </button>

              <select
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  setCurrentPage(1);
                }}
                className="input-field"
                style={{
                  width: 'auto',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-elevated)',
                  color: 'var(--text-primary)'
                }}
              >
                <option value="ALL">All Categories</option>
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ 
                display: 'inline-flex', 
                background: 'var(--bg-elevated)', 
                borderRadius: 'var(--radius-md)', 
                padding: '4px',
                border: '1px solid var(--border-subtle)'
              }}>
                <button
                  onClick={() => setViewMode('day')}
                  style={{
                    background: viewMode === 'day' ? 'var(--bg-base)' : 'transparent',
                    border: viewMode === 'day' ? '1px solid var(--border-subtle)' : '1px solid transparent',
                    borderRadius: 'var(--radius-sm)',
                    padding: '8px 16px',
                    color: viewMode === 'day' ? 'var(--text-primary)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: viewMode === 'day' ? '600' : 'normal',
                    transition: 'all 0.2s',
                    boxShadow: viewMode === 'day' ? 'var(--shadow-sm)' : 'none'
                  }}
                >
                  Daily
                </button>
                <button
                  onClick={() => setViewMode('month')}
                  style={{
                    background: viewMode === 'month' ? 'var(--bg-base)' : 'transparent',
                    border: viewMode === 'month' ? '1px solid var(--border-subtle)' : '1px solid transparent',
                    borderRadius: 'var(--radius-sm)',
                    padding: '8px 16px',
                    color: viewMode === 'month' ? 'var(--text-primary)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: viewMode === 'month' ? '600' : 'normal',
                    transition: 'all 0.2s',
                    boxShadow: viewMode === 'month' ? 'var(--shadow-sm)' : 'none'
                  }}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setViewMode('year')}
                  style={{
                    background: viewMode === 'year' ? 'var(--bg-base)' : 'transparent',
                    border: viewMode === 'year' ? '1px solid var(--border-subtle)' : '1px solid transparent',
                    borderRadius: 'var(--radius-sm)',
                    padding: '8px 16px',
                    color: viewMode === 'year' ? 'var(--text-primary)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: viewMode === 'year' ? '600' : 'normal',
                    transition: 'all 0.2s',
                    boxShadow: viewMode === 'year' ? 'var(--shadow-sm)' : 'none'
                  }}
                >
                  Yearly
                </button>
              </div>
            </div>
          </div>

          {/* Date Selection Controls */}
          <div style={{ marginTop: '20px', display: 'flex', gap: '12px', alignItems: 'center', background: 'var(--bg-elevated)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <i className="fas fa-calendar-alt" style={{ color: 'var(--accent)', fontSize: '18px' }}></i>
            
            {viewMode === 'day' && (
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setCurrentPage(1);
                }}
                className="input-field"
                style={{ width: 'auto', background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
              />
            )}

            {viewMode === 'month' && (
              <>
                <select
                  value={selectedYear}
                  onChange={(e) => {
                    setSelectedYear(parseInt(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="input-field"
                  style={{ width: 'auto', background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
                >
                  {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
                <select
                  value={selectedMonth}
                  onChange={(e) => {
                    setSelectedMonth(parseInt(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="input-field"
                  style={{ width: 'auto', background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
                >
                  {['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'].map((month, index) => (
                    <option key={index + 1} value={index + 1}>{month}</option>
                  ))}
                </select>
              </>
            )}

            {viewMode === 'year' && (
              <select
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(parseInt(e.target.value));
                  setCurrentPage(1);
                }}
                className="input-field"
                style={{ width: 'auto', background: 'var(--bg-base)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
              >
                {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            )}

            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', marginLeft: '8px' }}>
              {viewMode === 'day' && `Showing expenses for ${new Date(selectedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`}
              {viewMode === 'month' && `Showing expenses for ${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][selectedMonth - 1]} ${selectedYear}`}
              {viewMode === 'year' && `Showing expenses for ${selectedYear}`}
            </span>
          </div>
        </div>

        {/* Add/Edit Form */}
        {showAddForm && (
          <div style={{ padding: '24px', background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-subtle)' }}>
            <h3 style={{ margin: '0 0 20px 0', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px' }}>
              <i className={`fas ${editingExpense ? 'fa-edit' : 'fa-plus-circle'}`} style={{ color: 'var(--accent)' }}></i>
              {editingExpense ? 'Edit Expense' : 'Add New Expense'}
            </h3>
            <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
              <input
                type="text"
                placeholder="Expense Title *"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
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
                min="0"
                step="0.01"
              />

              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="input-field"
                style={{ width: '100%', background: 'var(--bg-base)' }}
              >
                {categories.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>

              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="input-field"
                style={{ width: '100%', background: 'var(--bg-base)' }}
              />

              <input
                type="text"
                placeholder="Description (optional)"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="input-field"
                style={{ gridColumn: 'span 2' }}
              />

              <div style={{ display: 'flex', gap: '12px', gridColumn: '1 / -1' }}>
                <button type="submit" className="btn btn-primary" style={{ borderRadius: 'var(--radius-md)' }}>
                  <i className="fas fa-save"></i> {editingExpense ? 'Update' : 'Save'} Expense
                </button>
                <button type="button" onClick={resetForm} className="btn btn-ghost" style={{ borderRadius: 'var(--radius-md)' }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Expenses List */}
        <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
              <i className="fas fa-circle-notch fa-spin fa-2x" style={{ color: 'var(--accent)', marginBottom: '16px' }}></i>
              <div>Loading expenses...</div>
            </div>
          ) : expenses.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 40px', color: 'var(--text-secondary)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border-subtle)' }}>
              <i className="fas fa-file-invoice-dollar fa-3x" style={{ opacity: 0.5, marginBottom: '20px' }}></i>
              <h3 style={{ color: 'var(--text-primary)', margin: '0 0 8px 0' }}>No expenses found</h3>
              <p style={{ margin: 0 }}>Add your first expense to start tracking</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '16px' }}>
              {expenses.map((expense) => {
                const categoryInfo = getCategoryInfo(expense.category);
                return (
                  <div key={expense._id} style={{
                    background: 'var(--bg-elevated)', 
                    borderRadius: 'var(--radius-md)', 
                    padding: '20px',
                    border: '1px solid var(--border-subtle)',
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    borderLeft: `4px solid ${categoryInfo.color}`,
                    transition: 'all 0.2s',
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                        <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' }}>
                          {expense.title}
                        </h4>
                        <span style={{
                          background: `${categoryInfo.color}20`, 
                          color: categoryInfo.color,
                          padding: '4px 10px', 
                          borderRadius: 'var(--radius-sm)', 
                          fontSize: '11px', 
                          fontWeight: 'bold',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <i className={`fas ${categoryInfo.icon}`}></i> {categoryInfo.label}
                        </span>
                      </div>
                      {expense.description && (
                        <p style={{ margin: '0 0 10px 0', color: 'var(--text-secondary)', fontSize: '13px' }}>
                          {expense.description}
                        </p>
                      )}
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <i className="far fa-calendar-alt"></i> {new Date(expense.date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--error)' }}>
                          -{formatCurrency(expense.amount)}
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleEdit(expense)}
                          className="btn btn-ghost"
                          style={{ padding: '8px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          title="Edit"
                        >
                          <i className="fas fa-pen"></i>
                        </button>
                        <button
                          onClick={() => handleDelete(expense._id)}
                          className="btn btn-ghost"
                          style={{ padding: '8px', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--error)' }}
                          title="Delete"
                        >
                          <i className="fas fa-trash"></i>
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
          <div style={{ padding: '24px', borderTop: '1px solid var(--border-subtle)', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', alignItems: 'center' }}>
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="btn btn-ghost"
                style={{
                  padding: '8px 16px', borderRadius: 'var(--radius-md)', 
                  opacity: currentPage === 1 ? 0.5 : 1, cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                }}
              >
                <i className="fas fa-chevron-left" style={{ marginRight: '6px' }}></i> Previous
              </button>
              
              <span style={{ padding: '8px 16px', color: 'var(--text-secondary)', fontSize: '14px', fontWeight: '500', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                Page {currentPage} of {totalPages}
              </span>
              
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="btn btn-primary"
                style={{
                  padding: '8px 16px', borderRadius: 'var(--radius-md)',
                  opacity: currentPage === totalPages ? 0.5 : 1, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                }}
              >
                Next <i className="fas fa-chevron-right" style={{ marginLeft: '6px' }}></i>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpenseManager;