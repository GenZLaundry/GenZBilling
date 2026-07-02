import React, { useState, useEffect, useRef } from 'react';
import apiService from './api';
import { useAlert } from './GlobalAlert';

interface Expense {
  _id: string;
  title: string;
  description: string;
  amount: number;
  category: string;
  date: string;
  isRecurring?: boolean;
  recurringFrequency?: string;
  paymentMethod?: string;
  paidTo?: string;
  receiptNumber?: string;
  createdAt: string;
}

interface ExpenseManagerProps {
  onClose: () => void;
}

const getLocalDateString = (d: Date = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dateVal = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dateVal}`;
};

const ExpenseManager: React.FC<ExpenseManagerProps> = ({ onClose }) => {
  const { showAlert, showConfirm } = useAlert();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [expenseSummary, setExpenseSummary] = useState<any>(null);
  
  // Date filtering states
  const [viewMode, setViewMode] = useState<'day' | 'month' | 'year' | 'range'>('month');
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [customStartDate, setCustomStartDate] = useState(getLocalDateString());
  const [customEndDate, setCustomEndDate] = useState(getLocalDateString());
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]); // Store all expenses for reports

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    amount: '',
    category: 'STORE_EXPENCES',
    date: getLocalDateString(),
    isRecurring: false,
    recurringFrequency: 'monthly',
    paymentMethod: 'CASH',
    paidTo: '',
    receiptNumber: ''
  });

  // Budget limits per category (monthly)
  const [budgetLimits, setBudgetLimits] = useState<Record<string, number>>(() => {
    const saved = localStorage.getItem('genz_laundry_expense_budgets');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved budgets', e);
      }
    }
    return {
      SABJI: 5000,
      GROCERY: 10000,
      FOOD: 10000,
      BREAKFAST: 3000,
      STORE_EXPENCES: 15000,
      SALARY: 25000,
      SELF_EXPENSES: 5000,
      DIET: 5000,
      GHAR_HEERSA: 5000,
      OTHER: 5000
    };
  });

  const [isEditingBudgets, setIsEditingBudgets] = useState(false);
  const [tempBudgets, setTempBudgets] = useState<Record<string, string>>({});

  // Quick expense templates
  const quickExpenses = [
    { title: 'Vegetables / Sabji', category: 'SABJI', icon: 'fa-carrot', color: '#2ecc71' },
    { title: 'Grocery Restock', category: 'GROCERY', icon: 'fa-shopping-cart', color: '#3498db' },
    { title: 'Staff Salary', category: 'SALARY', icon: 'fa-money-bill-wave', color: '#27ae60' },
    { title: 'Breakfast Tea/Coffee', category: 'BREAKFAST', icon: 'fa-coffee', color: '#f1c40f' },
    { title: 'Diet / Special Food', category: 'DIET', icon: 'fa-apple-alt', color: '#e91e63' },
    { title: 'Store Expenses', category: 'STORE_EXPENCES', icon: 'fa-store', color: '#1abc9c' },
    { title: 'Personal / Self Expense', category: 'SELF_EXPENSES', icon: 'fa-user', color: '#9b59b6' },
    { title: 'Regular Meal/Food', category: 'FOOD', icon: 'fa-utensils', color: '#e74c3c' },
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const categories = [
    { value: 'SABJI', label: 'Sabji', icon: 'fa-carrot', color: '#2ecc71' },
    { value: 'GROCERY', label: 'grocery', icon: 'fa-shopping-cart', color: '#3498db' },
    { value: 'FOOD', label: 'Food', icon: 'fa-utensils', color: '#e74c3c' },
    { value: 'BREAKFAST', label: 'Breakfast', icon: 'fa-coffee', color: '#f1c40f' },
    { value: 'STORE_EXPENCES', label: 'Store Expences', icon: 'fa-store', color: '#1abc9c' },
    { value: 'SALARY', label: 'Salary', icon: 'fa-money-bill-wave', color: '#27ae60' },
    { value: 'SELF_EXPENSES', label: 'Self Expenses', icon: 'fa-user-cog', color: '#9b59b6' },
    { value: 'DIET', label: 'Diet', icon: 'fa-apple-alt', color: '#e91e63' },
    { value: 'GHAR_HEERSA', label: 'Home', icon: 'fa-home', color: '#e67e22' },
    { value: 'OTHER', label: 'Other', icon: 'fa-clipboard-list', color: '#95a5a6' }
  ];

  useEffect(() => {
    loadExpenses();
    loadExpenseSummary();
    loadAllExpenses(); // Load all expenses for search and reports
  }, [currentPage, selectedCategories, viewMode, selectedDate, selectedMonth, selectedYear, customStartDate, customEndDate]);

  const showCustomAlert = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    showAlert({ message, type });
  };

  const loadExpenses = async () => {
    try {
      setLoading(true);
      const params: any = { page: currentPage, limit: 15 };
      if (selectedCategories.length > 0) {
        params.category = selectedCategories.join(',');
      }
      
      // Add date filtering based on view mode
      if (viewMode === 'day') {
        params.startDate = selectedDate;
        params.endDate = selectedDate;
      } else if (viewMode === 'month') {
        const year = selectedYear;
        const month = selectedMonth;
        const startMonthStr = String(month).padStart(2, '0');
        params.startDate = `${year}-${startMonthStr}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const lastDayStr = String(lastDay).padStart(2, '0');
        params.endDate = `${year}-${startMonthStr}-${lastDayStr}`;
      } else if (viewMode === 'year') {
        params.startDate = `${selectedYear}-01-01`;
        params.endDate = `${selectedYear}-12-31`;
      } else if (viewMode === 'range') {
        params.startDate = customStartDate;
        params.endDate = customEndDate;
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

  const loadAllExpenses = async () => {
    try {
      const params: any = { page: 1, limit: 10000 }; // Get all expenses
      if (selectedCategories.length > 0) {
        params.category = selectedCategories.join(',');
      }
      
      // Add date filtering based on view mode
      if (viewMode === 'day') {
        params.startDate = selectedDate;
        params.endDate = selectedDate;
      } else if (viewMode === 'month') {
        const year = selectedYear;
        const month = selectedMonth;
        const startMonthStr = String(month).padStart(2, '0');
        params.startDate = `${year}-${startMonthStr}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const lastDayStr = String(lastDay).padStart(2, '0');
        params.endDate = `${year}-${startMonthStr}-${lastDayStr}`;
      } else if (viewMode === 'year') {
        params.startDate = `${selectedYear}-01-01`;
        params.endDate = `${selectedYear}-12-31`;
      } else if (viewMode === 'range') {
        params.startDate = customStartDate;
        params.endDate = customEndDate;
      }
      
      const response = await apiService.getExpenses(params);
      if (response.success && response.data) {
        const data = response.data as { expenses: Expense[] };
        setAllExpenses(data.expenses);
      }
    } catch (error) {
      console.error('Failed to load all expenses:', error);
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
        const startMonthStr = String(month).padStart(2, '0');
        startDate = `${year}-${startMonthStr}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const lastDayStr = String(lastDay).padStart(2, '0');
        endDate = `${year}-${startMonthStr}-${lastDayStr}`;
      } else if (viewMode === 'year') {
        period = 'year';
        startDate = `${selectedYear}-01-01`;
        endDate = `${selectedYear}-12-31`;
      } else if (viewMode === 'range') {
        period = 'month';
        startDate = customStartDate;
        endDate = customEndDate;
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
      date: expense.date.split('T')[0],
      isRecurring: expense.isRecurring || false,
      recurringFrequency: expense.recurringFrequency || 'monthly',
      paymentMethod: expense.paymentMethod || 'CASH',
      paidTo: expense.paidTo || '',
      receiptNumber: expense.receiptNumber || ''
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
      category: 'STORE_EXPENCES',
      date: getLocalDateString(),
      isRecurring: false,
      recurringFrequency: 'monthly',
      paymentMethod: 'CASH',
      paidTo: '',
      receiptNumber: ''
    });
    setEditingExpense(null);
    setShowAddForm(false);
  };

  const getCategoryInfo = (category: string) => {
    const found = categories.find(cat => cat.value === category);
    if (found) return found;
    
    // Compatibility fallbacks for older database values
    const compatibilityMap: Record<string, { label: string; icon: string; color: string }> = {
      RENT: { label: 'Rent', icon: 'fa-home', color: '#e74c3c' },
      UTILITIES: { label: 'Utilities', icon: 'fa-bolt', color: '#f39c12' },
      SUPPLIES: { label: 'Supplies', icon: 'fa-box', color: '#3498db' },
      MAINTENANCE: { label: 'Maintenance', icon: 'fa-wrench', color: '#9b59b6' },
      MARKETING: { label: 'Marketing', icon: 'fa-bullhorn', color: '#e67e22' },
      TRANSPORT: { label: 'Transport', icon: 'fa-car', color: '#1abc9c' },
      OTHER: { label: 'Other', icon: 'fa-clipboard-list', color: '#95a5a6' }
    };
    
    return {
      value: category,
      ...(compatibilityMap[category] || { label: category, icon: 'fa-clipboard-list', color: '#95a5a6' })
    };
  };

  const generatePDFReport = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      showCustomAlert('Please allow popups to download the report', 'error');
      return;
    }

    const filteredExpenses = allExpenses.filter(exp => 
      searchQuery ? exp.title.toLowerCase().includes(searchQuery.toLowerCase()) : true
    );

    const totalAmount = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const periodText = viewMode === 'day' 
      ? new Date(selectedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
      : viewMode === 'month'
      ? `${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][selectedMonth - 1]} ${selectedYear}`
      : viewMode === 'year'
      ? `${selectedYear}`
      : `${new Date(customStartDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} to ${new Date(customEndDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;

    const reportHTML = `
<!DOCTYPE html>
<html>
<head>
  <title>Expense Report - ${periodText}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
    
    @page { 
      size: A4; 
      margin: 15mm; 
    }
    @media print {
      body { 
        margin: 0; 
        padding: 0; 
        background: white; 
        -webkit-print-color-adjust: exact; 
        print-color-adjust: exact; 
      }
      .no-print { display: none !important; }
      .summary-item { 
        -webkit-print-color-adjust: exact !important; 
        print-color-adjust: exact !important; 
        box-shadow: none !important;
        border: 1px solid #e2e8f0 !important;
      }
      .category-badge { 
        -webkit-print-color-adjust: exact !important; 
        print-color-adjust: exact !important; 
      }
    }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      padding: 10px 20px;
      background: white;
      color: #0f172a;
      line-height: 1.5;
    }
    .header-container {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 20px;
      margin-bottom: 25px;
    }
    .header-text h1 {
      margin: 0 0 6px 0;
      color: #0f172a;
      font-size: 26px;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
    .business-name {
      margin: 0 0 12px 0;
      color: #ef4444;
      font-size: 14px;
      font-weight: 700;
      letter-spacing: 0.05em;
      text-transform: uppercase;
    }
    .meta-grid {
      display: grid;
      grid-template-columns: repeat(1, auto);
      gap: 4px;
    }
    .meta-item {
      margin: 0;
      color: #475569;
      font-size: 12px;
    }
    .meta-item strong {
      color: #0f172a;
    }
    .header-logo {
      flex-shrink: 0;
    }
    .header-logo img {
      height: 60px;
      width: auto;
      max-width: 180px;
      object-fit: contain;
    }
    
    .summary {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 16px;
      margin-bottom: 25px;
    }
    .summary-item {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 16px 20px;
      border-radius: 12px;
      text-align: left;
      position: relative;
      overflow: hidden;
    }
    .summary-item::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      width: 4px;
      height: 100%;
    }
    .summary-item.total::before { background: #ef4444; }
    .summary-item.records::before { background: #3b82f6; }
    .summary-item.avg::before { background: #10b981; }

    .summary-item .label {
      font-size: 10px;
      color: #64748b;
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: 0.05em;
      margin-bottom: 6px;
    }
    .summary-item .value {
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.01em;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    thead {
      background: #0f172a;
      color: white;
    }
    th {
      padding: 12px 14px;
      text-align: left;
      font-weight: 700;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    th:first-child { border-radius: 6px 0 0 0; }
    th:last-child { border-radius: 0 6px 0 0; text-align: right; }
    td {
      padding: 10px 14px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 12px;
      color: #334155;
    }
    tbody tr:nth-child(even) {
      background: #f8fafc;
    }
    .category-badge {
      display: inline-flex;
      align-items: center;
      padding: 3px 10px;
      border-radius: 12px;
      font-size: 10px;
      font-weight: 700;
      color: white;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .amount {
      font-weight: 700;
      color: #0f172a;
      text-align: right;
    }
    .total-row {
      background: #f1f5f9;
      font-weight: 700;
    }
    .total-row td {
      border-top: 2px solid #0f172a;
      border-bottom: 2px solid #0f172a;
      font-size: 14px;
      color: #0f172a;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      color: #94a3b8;
      font-size: 11px;
    }
    .no-print {
      text-align: center;
      margin: 20px 0;
    }
    .print-btn {
      background: #ef4444;
      color: white;
      border: none;
      padding: 12px 30px;
      border-radius: 8px;
      font-size: 15px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.2s;
      box-shadow: 0 4px 6px -1px rgba(239, 68, 68, 0.2);
    }
    .print-btn:hover {
      background: #dc2626;
      box-shadow: 0 10px 15px -3px rgba(239, 68, 68, 0.3);
    }
  </style>
</head>
<body>
  <div class="no-print">
    <button class="print-btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
  </div>

  <div class="header-container">
    <div class="header-text">
      <h1>EXPENSE REPORT</h1>
      <div class="business-name">GenZ Laundry</div>
      <div class="meta-grid">
        <p class="meta-item"><strong>Period:</strong> ${periodText}</p>
        <p class="meta-item"><strong>Generated:</strong> ${new Date().toLocaleString('en-IN')}</p>
        ${searchQuery ? `<p class="meta-item"><strong>Search Filter:</strong> "${searchQuery}"</p>` : ''}
        ${selectedCategories.length > 0 ? `<p class="meta-item"><strong>Categories:</strong> ${selectedCategories.map(c => getCategoryInfo(c).label).join(', ')}</p>` : ''}
      </div>
    </div>
    <div class="header-logo">
      <img src="/bill_logo.png" alt="GenZ Laundry Logo" onerror="this.onerror=null; this.src='/bill_logo.jpg';" />
    </div>
  </div>

  <div class="summary">
    <div class="summary-item total">
      <div class="label">Total Expenses</div>
      <div class="value">₹${totalAmount.toLocaleString('en-IN')}</div>
    </div>
    <div class="summary-item records">
      <div class="label">Total Records</div>
      <div class="value">${filteredExpenses.length}</div>
    </div>
    <div class="summary-item avg">
      <div class="label">Average Amount</div>
      <div class="value">₹${filteredExpenses.length > 0 ? (totalAmount / filteredExpenses.length).toLocaleString('en-IN', { maximumFractionDigits: 2 }) : 0}</div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 5%;">S.No</th>
        <th style="width: 15%;">Date</th>
        <th style="width: 25%;">Title</th>
        <th style="width: 30%;">Description</th>
        <th style="width: 10%;">Category</th>
        <th style="width: 15%;">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${filteredExpenses.map((expense, index) => {
        const categoryInfo = getCategoryInfo(expense.category);
        return `
          <tr>
            <td>${index + 1}</td>
            <td>${new Date(expense.date).toLocaleDateString('en-IN')}</td>
            <td><strong>${expense.title}</strong></td>
            <td>${expense.description || '-'}</td>
            <td>
              <span class="category-badge" style="background: ${categoryInfo.color};">
                ${categoryInfo.label}
              </span>
            </td>
            <td class="amount">₹${expense.amount.toLocaleString('en-IN')}</td>
          </tr>
        `;
      }).join('')}
      <tr class="total-row">
        <td colspan="5" style="text-align: right; padding-right: 20px;">TOTAL:</td>
        <td class="amount">₹${totalAmount.toLocaleString('en-IN')}</td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    <p><strong>GenZ Laundry Management System</strong></p>
    <p>This is a computer-generated report. No signature required.</p>
  </div>

  <script>
    // Auto print after a short delay
    setTimeout(() => {
      // window.print();
    }, 500);
  </script>
</body>
</html>
    `;

    printWindow.document.write(reportHTML);
    printWindow.document.close();
  };

  const downloadExcelReport = () => {
    const filteredExpenses = allExpenses.filter(exp => 
      searchQuery ? exp.title.toLowerCase().includes(searchQuery.toLowerCase()) : true
    );

    const totalAmount = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    const periodText = viewMode === 'day' 
      ? new Date(selectedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
      : viewMode === 'month'
      ? `${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][selectedMonth - 1]} ${selectedYear}`
      : viewMode === 'year'
      ? `${selectedYear}`
      : `${new Date(customStartDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} to ${new Date(customEndDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;

    // Create CSV content
    let csvContent = `Expense Report - ${periodText}\n`;
    csvContent += `Generated on: ${new Date().toLocaleString('en-IN')}\n`;
    if (searchQuery) csvContent += `Filter: "${searchQuery}"\n`;
    csvContent += `\n`;
    csvContent += `Total Expenses:,₹${totalAmount.toLocaleString('en-IN')}\n`;
    csvContent += `Total Records:,${filteredExpenses.length}\n`;
    csvContent += `Average Amount:,₹${filteredExpenses.length > 0 ? (totalAmount / filteredExpenses.length).toFixed(2) : 0}\n`;
    csvContent += `\n`;
    csvContent += `S.No,Date,Title,Description,Category,Amount\n`;

    filteredExpenses.forEach((expense, index) => {
      const categoryInfo = getCategoryInfo(expense.category);
      csvContent += `${index + 1},`;
      csvContent += `${new Date(expense.date).toLocaleDateString('en-IN')},`;
      csvContent += `"${expense.title.replace(/"/g, '""')}",`;
      csvContent += `"${(expense.description || '-').replace(/"/g, '""')}",`;
      csvContent += `${categoryInfo.label},`;
      csvContent += `₹${expense.amount.toLocaleString('en-IN')}\n`;
    });

    csvContent += `\n`;
    csvContent += `TOTAL:,,,,,₹${totalAmount.toLocaleString('en-IN')}\n`;

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `Expense_Report_${periodText.replace(/\s+/g, '_')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showCustomAlert('Excel report downloaded successfully!', 'success');
  };

  const inputStyle: React.CSSProperties = {
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    background: 'rgba(9, 9, 11, 0.6)',
    color: 'white',
    fontSize: '13px',
    outline: 'none',
    width: '100%',
    transition: 'all 0.15s ease'
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '11px',
    fontWeight: 'bold',
    color: 'var(--text-secondary)',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '6px'
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
        
        {/* No Header here since it is managed by FinanceManager */}

        {/* Summary Cards */}
        {expenseSummary && (
          <div style={{ padding: '24px', borderBottom: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px' }}>
              
              {/* Total Expenses Card */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.015)',
                padding: '24px',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.3s ease',
                backdropFilter: 'blur(12px)'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(239, 68, 68, 0.05)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
                e.currentTarget.style.boxShadow = 'none';
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
                    Total Expenses ({viewMode === 'day' ? 'Day' : viewMode === 'month' ? 'Month' : 'Year'})
                  </div>
                  <div style={{
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    padding: '10px',
                    borderRadius: '10px',
                    color: '#f87171',
                    width: '38px',
                    height: '38px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '15px'
                  }}>
                    <i className="fas fa-file-invoice-dollar"></i>
                  </div>
                </div>
                <div style={{ fontSize: '30px', fontWeight: '800', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', letterSpacing: '-0.02em' }}>
                  {formatCurrency(expenseSummary.totalExpenses || 0)}
                </div>
              </div>
              
              {/* Categories Used Card */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.015)',
                padding: '24px',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.3s ease',
                backdropFilter: 'blur(12px)'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = 'rgba(14, 165, 233, 0.3)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(14, 165, 233, 0.05)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
                e.currentTarget.style.boxShadow = 'none';
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
                    Categories Used
                  </div>
                  <div style={{
                    background: 'rgba(14, 165, 233, 0.08)',
                    border: '1px solid rgba(14, 165, 233, 0.25)',
                    padding: '10px',
                    borderRadius: '10px',
                    color: '#38bdf8',
                    width: '38px',
                    height: '38px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '15px'
                  }}>
                    <i className="fas fa-tags"></i>
                  </div>
                </div>
                <div style={{ fontSize: '30px', fontWeight: '800', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', letterSpacing: '-0.02em' }}>
                  {expenseSummary.expensesByCategory?.length || 0}
                </div>
              </div>

              {/* Total Records Card */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.015)',
                padding: '24px',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.06)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                position: 'relative',
                overflow: 'hidden',
                transition: 'all 0.3s ease',
                backdropFilter: 'blur(12px)'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.3)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(16, 185, 129, 0.05)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
                e.currentTarget.style.boxShadow = 'none';
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
                    Total Records
                  </div>
                  <div style={{
                    background: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    padding: '10px',
                    borderRadius: '10px',
                    color: '#34d399',
                    width: '38px',
                    height: '38px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '15px'
                  }}>
                    <i className="fas fa-receipt"></i>
                  </div>
                </div>
                <div style={{ fontSize: '30px', fontWeight: '800', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', letterSpacing: '-0.02em' }}>
                  {expenseSummary.recentExpenses?.length || 0}
                </div>
              </div>

              {/* Selected Category Summary Card */}
              {selectedCategories.length > 0 && (() => {
                const isSingle = selectedCategories.length === 1;
                const activeLabel = isSingle ? getCategoryInfo(selectedCategories[0]).label : `${selectedCategories.length} Categories`;
                const activeColor = isSingle ? getCategoryInfo(selectedCategories[0]).color : 'var(--accent)';
                const activeIcon = isSingle ? getCategoryInfo(selectedCategories[0]).icon : 'fa-tags';

                const selectedTotals = selectedCategories.map(catVal => {
                  const categorySummary = expenseSummary?.expensesByCategory?.find((cat: any) => cat._id === catVal);
                  return categorySummary?.total || 0;
                });
                const selectedCounts = selectedCategories.map(catVal => {
                  const categorySummary = expenseSummary?.expensesByCategory?.find((cat: any) => cat._id === catVal);
                  return categorySummary?.count || 0;
                });
                const totalExpenses = selectedTotals.reduce((sum, t) => sum + t, 0);
                const totalCounts = selectedCounts.reduce((sum, c) => sum + c, 0);

                return (
                  <div style={{
                    background: 'rgba(255, 255, 255, 0.015)',
                    padding: '24px',
                    borderRadius: '16px',
                    border: `1px solid ${activeColor}35`,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'all 0.3s ease',
                    backdropFilter: 'blur(12px)',
                    boxShadow: `0 4px 20px ${activeColor}08`
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.borderColor = activeColor;
                    e.currentTarget.style.boxShadow = `0 8px 24px ${activeColor}15`;
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = `${activeColor}35`;
                    e.currentTarget.style.boxShadow = `0 4px 20px ${activeColor}08`;
                  }}>
                    {/* Clear Filter Icon */}
                    <button 
                      onClick={() => { setSelectedCategories([]); setCurrentPage(1); }}
                      style={{
                        position: 'absolute',
                        top: '16px',
                        right: '16px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        border: 'none',
                        color: 'var(--text-secondary)',
                        borderRadius: '50%',
                        width: '24px',
                        height: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                        e.currentTarget.style.color = '#f87171';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                        e.currentTarget.style.color = 'var(--text-secondary)';
                      }}
                      title="Clear filter"
                    >
                      <i className="fas fa-times" style={{ fontSize: '11px' }}></i>
                    </button>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: '20px' }}>
                      <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: '600', letterSpacing: '0.03em', textTransform: 'uppercase' }}>
                        {activeLabel} Total
                      </div>
                      <div style={{
                        background: `${activeColor}12`,
                        border: `1px solid ${activeColor}45`,
                        padding: '10px',
                        borderRadius: '10px',
                        color: activeColor,
                        width: '38px',
                        height: '38px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '15px'
                      }}>
                        <i className={`fas ${activeIcon}`}></i>
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ fontSize: '30px', fontWeight: '800', color: 'var(--text-primary)', fontFamily: 'var(--font-sans)', letterSpacing: '-0.02em' }}>
                        {formatCurrency(totalExpenses)}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {totalCounts} transaction{totalCounts !== 1 ? 's' : ''} recorded
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* Controls */}
        <div style={{ padding: '24px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Row 1: Actions Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
            <button
              onClick={() => setShowAddForm(true)}
              style={{
                background: 'var(--gradient-primary)',
                border: 'none',
                borderRadius: '10px',
                padding: '12px 22px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: 'var(--shadow-glow)'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.filter = 'brightness(1.1)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.filter = 'none';
              }}
            >
              <i className="fas fa-plus"></i> Add Expense
            </button>

            {/* Daily/Monthly/Yearly/Range Switcher */}
            <div style={{ 
              display: 'inline-flex', 
              background: 'rgba(255, 255, 255, 0.02)', 
              borderRadius: '10px', 
              padding: '4px',
              border: '1px solid rgba(255, 255, 255, 0.06)'
            }}>
              <button
                type="button"
                onClick={() => { setViewMode('day'); setCurrentPage(1); }}
                style={{
                  background: viewMode === 'day' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                  border: '1px solid transparent',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  color: viewMode === 'day' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: viewMode === 'day' ? '600' : 'normal',
                  transition: 'all 0.15s'
                }}
              >
                Daily
              </button>
              <button
                type="button"
                onClick={() => { setViewMode('month'); setCurrentPage(1); }}
                style={{
                  background: viewMode === 'month' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                  border: '1px solid transparent',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  color: viewMode === 'month' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: viewMode === 'month' ? '600' : 'normal',
                  transition: 'all 0.15s'
                }}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => { setViewMode('year'); setCurrentPage(1); }}
                style={{
                  background: viewMode === 'year' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                  border: '1px solid transparent',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  color: viewMode === 'year' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: viewMode === 'year' ? '600' : 'normal',
                  transition: 'all 0.15s'
                }}
              >
                Yearly
              </button>
              <button
                type="button"
                onClick={() => { setViewMode('range'); setCurrentPage(1); }}
                style={{
                  background: viewMode === 'range' ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                  border: '1px solid transparent',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  color: viewMode === 'range' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: viewMode === 'range' ? '600' : 'normal',
                  transition: 'all 0.15s'
                }}
              >
                Custom Range
              </button>
            </div>
          </div>

          {/* Category Pills (Multi-Select) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Filter by Categories (Select Multiple)
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => {
                  setSelectedCategories([]);
                  setCurrentPage(1);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 14px',
                  borderRadius: '20px',
                  background: selectedCategories.length === 0 ? 'var(--gradient-primary)' : 'rgba(255, 255, 255, 0.02)',
                  border: `1px solid ${selectedCategories.length === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.06)'}`,
                  color: selectedCategories.length === 0 ? 'white' : 'var(--text-secondary)',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  boxShadow: selectedCategories.length === 0 ? 'var(--shadow-glow)' : 'none'
                }}
              >
                <i className="fas fa-tags"></i> All Categories
              </button>
              
              {categories.map(cat => {
                const isSelected = selectedCategories.includes(cat.value);
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => {
                      const newSelected = isSelected
                        ? selectedCategories.filter(c => c !== cat.value)
                        : [...selectedCategories, cat.value];
                      setSelectedCategories(newSelected);
                      setCurrentPage(1);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 14px',
                      borderRadius: '20px',
                      background: isSelected ? `${cat.color}20` : 'rgba(255, 255, 255, 0.02)',
                      border: `1px solid ${isSelected ? cat.color : 'rgba(255, 255, 255, 0.06)'}`,
                      color: isSelected ? 'white' : 'var(--text-secondary)',
                      fontSize: '12px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: isSelected ? `0 0 10px ${cat.color}20` : 'none'
                    }}
                  >
                    <i className={`fas ${cat.icon}`} style={{ color: isSelected ? cat.color : 'var(--text-muted)', fontSize: '11px' }}></i>
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Row 2: Search & Reports */}
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Search Bar */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', flex: 1, minWidth: '240px' }}>
              <i className="fas fa-search" style={{ position: 'absolute', left: '14px', color: 'var(--text-muted)', fontSize: '13px' }}></i>
              <input
                type="text"
                placeholder="Search expenses by title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  ...inputStyle,
                  paddingLeft: '38px'
                }}
              />
            </div>

            {/* PDF Report */}
            <button
              onClick={generatePDFReport}
              style={{
                background: 'rgba(239, 68, 68, 0.03)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: '8px',
                padding: '10px 18px',
                color: '#f87171',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '13px',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; }}
              onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.03)'; }}
            >
              <i className="fas fa-file-pdf"></i> PDF Report
            </button>

            {/* Excel Report */}
            <button
              onClick={downloadExcelReport}
              style={{
                background: 'rgba(16, 185, 129, 0.03)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: '8px',
                padding: '10px 18px',
                color: '#34d399',
                cursor: 'pointer',
                fontWeight: '600',
                fontSize: '13px',
                transition: 'all 0.15s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
              onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)'; }}
              onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(16, 185, 129, 0.03)'; }}
            >
              <i className="fas fa-file-excel"></i> Excel Report
            </button>
          </div>

          {/* Date Selection Inset */}
          <div style={{
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            background: 'rgba(255, 255, 255, 0.01)',
            padding: '12px 18px',
            borderRadius: '10px',
            border: '1px solid rgba(255, 255, 255, 0.04)'
          }}>
            <i className="fas fa-calendar-alt" style={{ color: 'var(--accent)', fontSize: '15px' }}></i>
            
            {viewMode === 'day' && (
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setCurrentPage(1);
                }}
                style={{
                  ...inputStyle,
                  width: 'auto',
                  padding: '6px 12px',
                  colorScheme: 'dark'
                }}
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
                  style={{
                    ...inputStyle,
                    width: 'auto',
                    padding: '6px 12px',
                    cursor: 'pointer'
                  }}
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
                  style={{
                    ...inputStyle,
                    width: 'auto',
                    padding: '6px 12px',
                    cursor: 'pointer'
                  }}
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
                style={{
                  ...inputStyle,
                  width: 'auto',
                  padding: '6px 12px',
                  cursor: 'pointer'
                }}
              >
                {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i).map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            )}

            {viewMode === 'range' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>From:</span>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => {
                    setCustomStartDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  style={{
                    ...inputStyle,
                    width: 'auto',
                    padding: '6px 12px',
                    colorScheme: 'dark'
                  }}
                />
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>To:</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => {
                    setCustomEndDate(e.target.value);
                    setCurrentPage(1);
                  }}
                  style={{
                    ...inputStyle,
                    width: 'auto',
                    padding: '6px 12px',
                    colorScheme: 'dark'
                  }}
                />
              </div>
            )}

            <span style={{ fontSize: '13px', color: 'var(--text-secondary)', marginLeft: '6px', fontWeight: '500' }}>
              {viewMode === 'day' && `Showing expenses for ${new Date(selectedDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}`}
              {viewMode === 'month' && `Showing expenses for ${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][selectedMonth - 1]} ${selectedYear}`}
              {viewMode === 'year' && `Showing expenses for ${selectedYear}`}
              {viewMode === 'range' && `Showing expenses from ${new Date(customStartDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} to ${new Date(customEndDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`}
            </span>
          </div>
        </div>

                {/* Add/Edit Form - Modal Popup Overlay */}
        {showAddForm && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}>
            <div style={{
              background: 'rgba(20, 20, 25, 0.98)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-xl)',
              boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
              width: '100%',
              maxWidth: '680px',
              maxHeight: '90vh',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              padding: '30px',
              gap: '20px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '16px' }}>
                <h3 style={{ margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '18px', fontWeight: '700' }}>
                  <i className={`fas ${editingExpense ? 'fa-edit' : 'fa-plus-circle'}`} style={{ color: 'var(--accent)' }}></i>
                  {editingExpense ? 'Edit Expense Record' : 'Create New Expense Record'}
                </h3>
                <button 
                  onClick={resetForm} 
                  type="button"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: 'none',
                    borderRadius: '50%',
                    width: '32px',
                    height: '32px',
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: '16px',
                    transition: 'all 0.2s'
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'; e.currentTarget.style.color = '#f87171'; }}
                  onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                >
                  <i className="fas fa-times"></i>
                </button>
              </div>

            {/* Quick Templates Carousel */}
            {!editingExpense && (
              <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '16px' }}>
                <div style={{ fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                  Quick Templates (Click to fill)
                </div>
                <div style={{
                  display: 'flex',
                  gap: '10px',
                  overflowX: 'auto',
                  paddingBottom: '8px',
                  scrollbarWidth: 'thin'
                }}>
                  {quickExpenses.map((tpl, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          title: tpl.title,
                          category: tpl.category,
                          date: getLocalDateString()
                        });
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 14px',
                        borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.02)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        color: 'var(--text-primary)',
                        fontSize: '12px',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                        e.currentTarget.style.borderColor = tpl.color + '60';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
                      }}
                    >
                      <i className={`fas ${tpl.icon}`} style={{ color: tpl.color }}></i>
                      <span>{tpl.title}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '16px' }}>
                
                {/* Row 1 */}
                <div style={{ gridColumn: 'span 6' }}>
                  <label style={labelStyle}>Expense Title *</label>
                  <input
                    type="text"
                    placeholder="e.g. Electricity Bill May"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    style={inputStyle}
                    required
                  />
                </div>
                
                <div style={{ gridColumn: 'span 3' }}>
                  <label style={labelStyle}>Amount (₹) *</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    style={inputStyle}
                    required
                    min="0"
                    step="0.01"
                  />
                </div>

                <div style={{ gridColumn: 'span 3' }}>
                  <label style={labelStyle}>Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    style={{ ...inputStyle, cursor: 'pointer' }}
                  >
                    {categories.map(cat => (
                      <option key={cat.value} value={cat.value}>{cat.label}</option>
                    ))}
                  </select>
                </div>

                {/* Row 2 */}
                <div style={{ gridColumn: 'span 3' }}>
                  <label style={labelStyle}>Date *</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    style={inputStyle}
                  />
                </div>

                <div style={{ gridColumn: 'span 3' }}>
                  <label style={labelStyle}>Payment Method</label>
                  <select
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    style={{ ...inputStyle, cursor: 'pointer' }}
                  >
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="CARD">Card</option>
                    <option value="BANK_TRANSFER">Bank Transfer</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div style={{ gridColumn: 'span 3' }}>
                  <label style={labelStyle}>Paid To</label>
                  <input
                    type="text"
                    placeholder="Vendor / Staff name"
                    value={formData.paidTo}
                    onChange={(e) => setFormData({ ...formData, paidTo: e.target.value })}
                    style={inputStyle}
                  />
                </div>

                <div style={{ gridColumn: 'span 3' }}>
                  <label style={labelStyle}>Receipt / Reference No.</label>
                  <input
                    type="text"
                    placeholder="REC-XXXX"
                    value={formData.receiptNumber}
                    onChange={(e) => setFormData({ ...formData, receiptNumber: e.target.value })}
                    style={inputStyle}
                  />
                </div>

                {/* Recurring Options */}
                <div style={{ gridColumn: 'span 12', display: 'flex', gap: '24px', alignItems: 'center', padding: '4px 0' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    <input
                      type="checkbox"
                      checked={formData.isRecurring}
                      onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                      style={{ width: '16px', height: '16px', margin: 0, accentColor: 'var(--accent)' }}
                    />
                    Recurring Expense
                  </label>

                  {formData.isRecurring && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Frequency:</span>
                      <select
                        value={formData.recurringFrequency}
                        onChange={(e) => setFormData({ ...formData, recurringFrequency: e.target.value })}
                        style={{ ...inputStyle, width: 'auto', padding: '6px 12px', cursor: 'pointer' }}
                      >
                        <option value="daily">Daily</option>
                        <option value="weekly">Weekly</option>
                        <option value="monthly">Monthly</option>
                        <option value="yearly">Yearly</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Row 3 */}
                <div style={{ gridColumn: 'span 12' }}>
                  <label style={labelStyle}>Description / Notes (Optional)</label>
                  <input
                    type="text"
                    placeholder="Add additional description..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    style={inputStyle}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-start' }}>
                <button type="submit" className="btn btn-primary" style={{ borderRadius: '8px', height: '40px', padding: '0 20px' }}>
                  <i className="fas fa-save"></i> {editingExpense ? 'Update Expense' : 'Save Expense'}
                </button>
                <button type="button" onClick={resetForm} className="btn btn-ghost" style={{ borderRadius: '8px', height: '40px', padding: '0 20px', border: '1px solid rgba(255,255,255,0.06)' }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
          </div>
        )}

        {/* Main Body Layout: Two columns if categories are selected */}
        <div style={{
          display: 'flex',
          flexDirection: 'row',
          flex: 1,
          overflow: 'hidden',
          flexWrap: 'wrap'
        }}>
          {/* Left Column: Expenses List & Pagination */}
          <div style={{
            flex: '1 1 600px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'auto',
            borderRight: selectedCategories.length > 0 ? '1px solid var(--border-subtle)' : 'none'
          }}>
            {/* Expenses List */}
            <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
          {/* Search Results Summary */}
          {searchQuery && (
            <div style={{
              background: 'rgba(99, 102, 241, 0.04)',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              color: '#c7d2fe',
              padding: '16px 20px',
              borderRadius: '12px',
              marginBottom: '20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              boxShadow: '0 4px 20px rgba(99, 102, 241, 0.05)'
            }}>
              <div>
                <div style={{ fontSize: '13px', opacity: 0.8, marginBottom: '2px', fontWeight: '500' }}>
                  <i className="fas fa-search" style={{ marginRight: '6px' }}></i> Search results for "{searchQuery}"
                </div>
                <div style={{ fontSize: '18px', fontWeight: '700' }}>
                  {allExpenses.filter(exp => exp.title.toLowerCase().includes(searchQuery.toLowerCase())).length} records matched
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '13px', opacity: 0.8, marginBottom: '2px', fontWeight: '500' }}>Total Amount</div>
                <div style={{ fontSize: '20px', fontWeight: '700', color: '#f43f5e' }}>
                  ₹{allExpenses
                    .filter(exp => exp.title.toLowerCase().includes(searchQuery.toLowerCase()))
                    .reduce((sum, exp) => sum + exp.amount, 0)
                    .toLocaleString('en-IN')}
                </div>
              </div>
            </div>
          )}

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
              <i className="fas fa-circle-notch fa-spin fa-2x" style={{ color: 'var(--accent)', marginBottom: '16px' }}></i>
              <div>Loading expenses...</div>
            </div>
          ) : (searchQuery ? allExpenses.filter(exp => exp.title.toLowerCase().includes(searchQuery.toLowerCase())) : expenses).length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 40px', color: 'var(--text-secondary)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-lg)', border: '1px dashed var(--border-subtle)' }}>
              <i className="fas fa-file-invoice-dollar fa-3x" style={{ opacity: 0.5, marginBottom: '20px' }}></i>
              <h3 style={{ color: 'var(--text-primary)', margin: '0 0 8px 0' }}>
                {searchQuery ? `No expenses found for "${searchQuery}"` : 'No expenses found'}
              </h3>
              <p style={{ margin: 0 }}>
                {searchQuery ? 'Try a different search term' : 'Add your first expense to start tracking'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '12px' }}>
              {(searchQuery ? allExpenses : expenses)
                .filter(exp => searchQuery ? exp.title.toLowerCase().includes(searchQuery.toLowerCase()) : true)
                .map((expense) => {
                const categoryInfo = getCategoryInfo(expense.category);
                return (
                  <div key={expense._id} style={{
                    background: 'rgba(255, 255, 255, 0.015)', 
                    borderRadius: '12px', 
                    padding: '18px 20px',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    gap: '16px',
                    transition: 'all 0.2s ease',
                    backdropFilter: 'blur(8px)'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.015)';
                    e.currentTarget.style.transform = 'none';
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flex: 1 }}>
                      {/* Left neon indicator */}
                      <div style={{
                        width: '4px',
                        height: '36px',
                        borderRadius: '2px',
                        background: categoryInfo.color,
                        boxShadow: `0 0 10px ${categoryInfo.color}a0`,
                        flexShrink: 0
                      }} />

                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                          <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '600', color: 'var(--text-primary)' }}>
                            {expense.title}
                          </h4>
                          
                          <span style={{
                            background: `${categoryInfo.color}12`, 
                            border: `1px solid ${categoryInfo.color}35`,
                            color: categoryInfo.color,
                            padding: '3px 10px', 
                            borderRadius: '9999px', 
                            fontSize: '11px', 
                            fontWeight: '600',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px'
                          }}>
                            <i className={`fas ${categoryInfo.icon}`} style={{ fontSize: '10px' }}></i> {categoryInfo.label}
                          </span>
                        </div>

                        {expense.description && (
                          <p style={{ margin: '6px 0 0 0', color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.4' }}>
                            {expense.description}
                          </p>
                        )}

                        {/* Metadata bar */}
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginTop: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <i className="far fa-calendar-alt" style={{ color: 'var(--text-muted)' }}></i>
                            {new Date(expense.date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </span>

                          {expense.paymentMethod && (
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <i className="fas fa-credit-card" style={{ color: 'var(--text-muted)' }}></i>
                              {expense.paymentMethod}
                            </span>
                          )}

                          {expense.paidTo && (
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <i className="fas fa-user" style={{ color: 'var(--text-muted)' }}></i>
                              {expense.paidTo}
                            </span>
                          )}

                          {expense.receiptNumber && (
                            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <i className="fas fa-file-alt" style={{ color: 'var(--text-muted)' }}></i>
                              #{expense.receiptNumber}
                            </span>
                          )}

                          {expense.isRecurring && (
                            <span style={{
                              fontSize: '10px',
                              background: 'rgba(99, 102, 241, 0.1)',
                              border: '1px solid rgba(99, 102, 241, 0.25)',
                              color: '#a5b4fc',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              textTransform: 'uppercase',
                              fontWeight: 'bold'
                            }}>
                              <i className="fas fa-sync-alt" style={{ fontSize: '9px' }}></i>
                              {expense.recurringFrequency || 'monthly'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '18px', fontWeight: '700', color: '#f43f5e' }}>
                          -{formatCurrency(expense.amount)}
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleEdit(expense)}
                          style={{
                            background: 'rgba(255, 255, 255, 0.02)',
                            border: '1px solid rgba(255, 255, 255, 0.06)',
                            borderRadius: '8px',
                            padding: '8px',
                            width: '36px',
                            height: '36px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.4)';
                            e.currentTarget.style.color = '#a5b4fc';
                            e.currentTarget.style.background = 'rgba(99, 102, 241, 0.05)';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
                            e.currentTarget.style.color = 'var(--text-secondary)';
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                          }}
                          title="Edit"
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                        <button
                          onClick={() => handleDelete(expense._id)}
                          style={{
                            background: 'rgba(255, 255, 255, 0.02)',
                            border: '1px solid rgba(255, 255, 255, 0.06)',
                            borderRadius: '8px',
                            padding: '8px',
                            width: '36px',
                            height: '36px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--text-secondary)',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.4)';
                            e.currentTarget.style.color = '#f87171';
                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)';
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
                            e.currentTarget.style.color = 'var(--text-secondary)';
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                          }}
                          title="Delete"
                        >
                          <i className="fas fa-trash-alt"></i>
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
        {!searchQuery && totalPages > 1 && (
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

      {/* Right Column: Interactive Analytics & Budgets Sidebar */}
      {(() => {
        const categoriesToAnalyze = selectedCategories.length > 0 ? selectedCategories : categories.map(c => c.value);
        
        const selectedTotals = categoriesToAnalyze.map(catVal => {
          const categoryInfo = getCategoryInfo(catVal);
          const categorySummary = expenseSummary?.expensesByCategory?.find((cat: any) => cat._id === catVal);
          const total = categorySummary?.total || 0;
          const count = categorySummary?.count || 0;
          const budgetLimit = budgetLimits[catVal] || 0;
          const budgetPercent = budgetLimit > 0 ? (total / budgetLimit) * 100 : 0;
          const isOver = total > budgetLimit;

          return {
            info: categoryInfo,
            total,
            count,
            budgetLimit,
            budgetPercent,
            isOver
          };
        }).filter(item => selectedCategories.length > 0 ? true : item.total > 0);

        const grandTotal = selectedTotals.reduce((sum, item) => sum + item.total, 0);
        const grandCount = selectedTotals.reduce((sum, item) => sum + item.count, 0);

        // Donut Chart calculations
        const chartRadius = 30;
        const chartCircumference = 2 * Math.PI * chartRadius; // ~188.49
        let currentOffset = 0;

        const handleBudgetChange = (cat: string, value: string) => {
          setTempBudgets(prev => ({
            ...prev,
            [cat]: value
          }));
        };

        const saveBudgets = () => {
          const newBudgets = { ...budgetLimits };
          Object.keys(tempBudgets).forEach(cat => {
            const val = parseFloat(tempBudgets[cat]);
            if (!isNaN(val) && val >= 0) {
              newBudgets[cat] = val;
            }
          });
          setBudgetLimits(newBudgets);
          localStorage.setItem('genz_laundry_expense_budgets', JSON.stringify(newBudgets));
          setIsEditingBudgets(false);
          showCustomAlert('Budget limits updated successfully!', 'success');
        };

        const startEditingBudgets = () => {
          const initialTemp: Record<string, string> = {};
          categories.forEach(cat => {
            initialTemp[cat.value] = (budgetLimits[cat.value] || 0).toString();
          });
          setTempBudgets(initialTemp);
          setIsEditingBudgets(true);
        };

        return (
          <div style={{
            flex: '1 1 320px',
            maxWidth: '380px',
            padding: '24px',
            background: 'rgba(255, 255, 255, 0.005)',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px',
            overflowY: 'auto',
            borderLeft: '1px solid var(--border-subtle)'
          }}>
            
            {/* Sidebar Title */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '15px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <i className="fas fa-chart-pie" style={{ color: 'var(--accent)' }}></i>
                  {selectedCategories.length > 0 ? 'Selected Filters' : 'Spending Analytics'}
                </h3>
                {selectedCategories.length > 0 && (
                  <button
                    onClick={() => {
                      setSelectedCategories([]);
                      setCurrentPage(1);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#f87171',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontWeight: '600'
                    }}
                  >
                    Clear Filter
                  </button>
                )}
              </div>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '12px' }}>
                {selectedCategories.length > 0 
                  ? 'Real-time category filter breakdown' 
                  : 'Total monthly spending insights'}
              </p>
            </div>

            {/* Interactive SVG Donut Chart */}
            {grandTotal > 0 && (
              <div style={{
                background: 'rgba(255, 255, 255, 0.01)',
                border: '1px solid rgba(255, 255, 255, 0.04)',
                borderRadius: '16px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '16px'
              }}>
                <div style={{ position: 'relative', width: '150px', height: '150px' }}>
                  <svg width="100%" height="100%" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
                    {/* Background Circle */}
                    <circle
                      cx="50"
                      cy="50"
                      r={chartRadius}
                      fill="transparent"
                      stroke="rgba(255, 255, 255, 0.03)"
                      strokeWidth="8"
                    />
                    
                    {/* Category Slices */}
                    {selectedTotals.map((item, index) => {
                      if (item.total === 0) return null;
                      const sliceSize = (item.total / grandTotal) * chartCircumference;
                      const strokeOffset = currentOffset;
                      currentOffset -= sliceSize; // Move counter-clockwise

                      return (
                        <circle
                          key={item.info.value}
                          cx="50"
                          cy="50"
                          r={chartRadius}
                          fill="transparent"
                          stroke={item.info.color}
                          strokeWidth="8"
                          strokeDasharray={`${sliceSize} ${chartCircumference}`}
                          strokeDashoffset={strokeOffset}
                          strokeLinecap="round"
                          style={{
                            transition: 'stroke-width 0.2s ease, opacity 0.2s ease',
                            cursor: 'pointer'
                          }}
                          onMouseOver={(e) => {
                            e.currentTarget.setAttribute('stroke-width', '10');
                          }}
                          onMouseOut={(e) => {
                            e.currentTarget.setAttribute('stroke-width', '8');
                          }}
                          onClick={() => {
                            // Toggle category in multi-select filter
                            if (selectedCategories.includes(item.info.value)) {
                              setSelectedCategories(selectedCategories.filter(c => c !== item.info.value));
                            } else {
                              setSelectedCategories([...selectedCategories, item.info.value]);
                            }
                            setCurrentPage(1);
                          }}
                        >
                          <title>{item.info.label}: {formatCurrency(item.total)} ({Math.round((item.total / grandTotal) * 100)}%)</title>
                        </circle>
                      );
                    })}
                  </svg>
                  
                  {/* Center Total Label */}
                  <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    textAlign: 'center',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    pointerEvents: 'none'
                  }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.05em' }}>
                      Total
                    </span>
                    <span style={{ fontSize: '16px', fontWeight: '800', color: 'white' }}>
                      {formatCurrency(grandTotal)}
                    </span>
                  </div>
                </div>

                {/* Donut Chart Legend */}
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '8px 12px',
                  justifyContent: 'center',
                  width: '100%'
                }}>
                  {selectedTotals.map(item => {
                    if (item.total === 0) return null;
                    const percent = Math.round((item.total / grandTotal) * 100);
                    return (
                      <div
                        key={item.info.value}
                        onClick={() => {
                          if (selectedCategories.includes(item.info.value)) {
                            setSelectedCategories(selectedCategories.filter(c => c !== item.info.value));
                          } else {
                            setSelectedCategories([...selectedCategories, item.info.value]);
                          }
                          setCurrentPage(1);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '11px',
                          color: 'var(--text-primary)',
                          cursor: 'pointer',
                          opacity: selectedCategories.length > 0 && !selectedCategories.includes(item.info.value) ? 0.4 : 1,
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.info.color }}></div>
                        <span>{item.info.label} ({percent}%)</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Total / Records Box */}
            <div style={{
              background: 'rgba(99, 102, 241, 0.03)',
              border: '1px solid rgba(99, 102, 241, 0.15)',
              padding: '20px',
              borderRadius: '14px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.02)'
            }}>
              <span style={{ fontSize: '11px', color: '#a5b4fc', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {selectedCategories.length > 0 ? 'Filtered Grand Total' : 'Total Expenses Overview'}
              </span>
              <div style={{ fontSize: '26px', fontWeight: '800', color: 'white' }}>
                {formatCurrency(grandTotal)}
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Across {grandCount} transaction{grandCount !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Budget Editor / Category List Section */}
            {isEditingBudgets ? (
              /* Inline Budget Targets Editor */
              <div style={{
                background: 'rgba(255, 255, 255, 0.015)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '16px',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '700', color: 'white', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                    Adjust Budget Limits
                  </h4>
                  <i className="fas fa-sliders-h" style={{ color: 'var(--accent)', fontSize: '12px' }}></i>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto', paddingRight: '4px' }}>
                  {categories.map(cat => (
                    <div key={cat.value} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <i className={`fas ${cat.icon}`} style={{ color: cat.color, fontSize: '10px' }}></i>
                          {cat.label}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '10px', fontSize: '12px', color: 'var(--text-muted)' }}>₹</span>
                        <input
                          type="number"
                          value={tempBudgets[cat.value] || ''}
                          onChange={(e) => handleBudgetChange(cat.value, e.target.value)}
                          style={{
                            padding: '8px 8px 8px 24px',
                            borderRadius: '6px',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            background: 'rgba(9, 9, 11, 0.6)',
                            color: 'white',
                            fontSize: '12px',
                            width: '100%',
                            outline: 'none'
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                  <button
                    onClick={saveBudgets}
                    className="btn btn-primary"
                    style={{ flex: 1, padding: '8px', fontSize: '12px', borderRadius: '6px', cursor: 'pointer' }}
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={() => setIsEditingBudgets(false)}
                    className="btn btn-ghost"
                    style={{ flex: 1, padding: '8px', fontSize: '12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              /* Category Breakdown with Budget progress bars */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {selectedCategories.length > 0 ? 'Category Breakdown' : 'Active Category Spending'}
                  </span>
                  
                  <button
                    onClick={startEditingBudgets}
                    style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      borderRadius: '6px',
                      padding: '4px 10px',
                      fontSize: '11px',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                      e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.3)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                      e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)';
                    }}
                  >
                    <i className="fas fa-edit" style={{ fontSize: '10px' }}></i>
                    Set Budgets
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {selectedTotals.map(item => (
                    <div
                      key={item.info.value}
                      style={{
                        background: 'rgba(255, 255, 255, 0.01)',
                        border: '1px solid rgba(255, 255, 255, 0.04)',
                        padding: '14px',
                        borderRadius: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px',
                        transition: 'all 0.2s ease',
                        cursor: 'pointer'
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.01)';
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.04)';
                      }}
                      onClick={() => {
                        // Toggle filter
                        if (selectedCategories.includes(item.info.value)) {
                          setSelectedCategories(selectedCategories.filter(c => c !== item.info.value));
                        } else {
                          setSelectedCategories([...selectedCategories, item.info.value]);
                        }
                        setCurrentPage(1);
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '6px',
                            background: `${item.info.color}15`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: item.info.color,
                            fontSize: '11px'
                          }}>
                            <i className={`fas ${item.info.icon}`}></i>
                          </div>
                          <span style={{ fontSize: '13px', fontWeight: '600', color: 'white' }}>
                            {item.info.label}
                          </span>
                        </div>
                        
                        {selectedCategories.includes(item.info.value) && (
                          <span style={{ fontSize: '10px', color: '#f87171', fontWeight: 'bold' }}>
                            <i className="fas fa-filter" style={{ marginRight: '4px' }}></i> Active
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                        <span style={{ fontSize: '16px', fontWeight: '700', color: item.info.color }}>
                          {formatCurrency(item.total)}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          {item.count} transaction{item.count !== 1 ? 's' : ''}
                        </span>
                      </div>

                      {item.budgetLimit > 0 && (
                        <div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                            <span>Budget Usage ({Math.round(item.budgetPercent)}%)</span>
                            <span style={{ color: item.isOver ? '#f87171' : 'var(--text-secondary)' }}>
                              {formatCurrency(item.total)} / {formatCurrency(item.budgetLimit)}
                            </span>
                          </div>
                          <div style={{ width: '100%', height: '4px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{
                              width: `${Math.min(100, item.budgetPercent)}%`,
                              height: '100%',
                              background: item.isOver ? 'linear-gradient(90deg, #f87171, #ef4444)' : `linear-gradient(90deg, ${item.info.color}a0, ${item.info.color})`,
                              borderRadius: '2px'
                            }} />
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })()}
        </div>
      </div>
    </div>
  );
};

export default ExpenseManager;
