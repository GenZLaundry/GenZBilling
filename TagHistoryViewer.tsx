import React, { useState, useEffect } from 'react';
import apiService from './api';
import ConfirmDialog from './ConfirmDialog';

interface TagHistoryEvent {
  status: string;
  timestamp: string;
  note?: string;
}

interface TagHistory {
  _id: string;
  billNumber: string;
  customerName: string;
  customerPhone: string;
  itemName: string;
  washType: string;
  tagIndex: number;
  totalTags: number;
  status: string;
  events: TagHistoryEvent[];
  createdAt: string;
  updatedAt: string;
}

interface GroupedBill {
  billNumber: string;
  customerName: string;
  customerPhone: string;
  totalTags: number;
  status: string;
  createdAt: string;
  tags: TagHistory[];
}

interface TagStats {
  totalTags: number;
  byStatus: Record<string, number>;
  byWashType: Record<string, number>;
}

interface ConfirmDialogState {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  type: 'danger' | 'warning' | 'info';
}

const TagHistoryViewer: React.FC = () => {
  const [tags, setTags] = useState<TagHistory[]>([]);
  const [groupedBills, setGroupedBills] = useState<GroupedBill[]>([]);
  const [stats, setStats] = useState<TagStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    billNumber: '',
    customerName: '',
    customerPhone: '',
    status: '',
    startDate: '',
    endDate: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedBill, setSelectedBill] = useState<GroupedBill | null>(null);
  const [expandedBills, setExpandedBills] = useState<Set<string>>(new Set());
  const [confirmDialog, setConfirmDialog] = useState<ConfirmDialogState>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'warning'
  });

  useEffect(() => {
    fetchTags();
    fetchStats();
  }, [currentPage, filters]);

  const fetchTags = async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: '1000', // Get all tags to group them
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, v]) => v !== '')
        )
      });

      const response = await apiService.get(`/tag-history?${queryParams}`);
      
      if (response.success && response.data) {
        setTags(response.data);
        groupTagsByBill(response.data);
        if (response.pagination) {
          setTotalPages(response.pagination.totalPages);
        }
      }
    } catch (error) {
      console.error('Error fetching tags:', error);
    } finally {
      setLoading(false);
    }
  };

  const groupTagsByBill = (allTags: TagHistory[]) => {
    const grouped = allTags.reduce((acc, tag) => {
      if (!acc[tag.billNumber]) {
        acc[tag.billNumber] = {
          billNumber: tag.billNumber,
          customerName: tag.customerName,
          customerPhone: tag.customerPhone,
          totalTags: tag.totalTags,
          status: tag.status,
          createdAt: tag.createdAt,
          tags: []
        };
      }
      acc[tag.billNumber].tags.push(tag);
      return acc;
    }, {} as Record<string, GroupedBill>);

    const billsArray = Object.values(grouped).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    setGroupedBills(billsArray);
  };

  const fetchStats = async () => {
    try {
      const queryParams = new URLSearchParams(
        Object.fromEntries(
          Object.entries(filters).filter(([k, v]) => 
            (k === 'startDate' || k === 'endDate') && v !== ''
          )
        )
      );

      const response = await apiService.get(`/tag-history/stats/overview?${queryParams}`);
      
      if (response.success && response.data) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const handleBulkStatusUpdate = async (billNumber: string, newStatus: string) => {
    try {
      const response = await apiService.patch(`/tag-history/bill/${billNumber}/status`, {
        status: newStatus,
        note: `Bulk status update to ${newStatus}`
      });

      if (response.success) {
        fetchTags();
        fetchStats();
        setSelectedBill(null);
      }
    } catch (error) {
      console.error('Error updating tag status:', error);
    }
  };

  const handleDeleteTag = async (tagId: string, tagInfo: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Tag',
      message: `Are you sure you want to delete tag ${tagInfo}?\n\nThis action cannot be undone.`,
      type: 'danger',
      onConfirm: async () => {
        setConfirmDialog({ ...confirmDialog, isOpen: false });
        try {
          const response = await apiService.delete(`/tag-history/${tagId}`);
          if (response.success) {
            alert('Tag deleted successfully');
            fetchTags();
            fetchStats();
            setSelectedBill(null);
          }
        } catch (error) {
          console.error('Error deleting tag:', error);
          alert('Failed to delete tag');
        }
      }
    });
  };

  const handleDeleteAllBillTags = async (billNumber: string, customerName: string) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete All Tags',
      message: `Are you sure you want to delete ALL tags for bill ${billNumber} (${customerName})?\n\nThis will permanently delete all tag records for this bill.\n\nThis action cannot be undone!`,
      type: 'danger',
      onConfirm: async () => {
        setConfirmDialog({ ...confirmDialog, isOpen: false });
        try {
          const response = await apiService.delete(`/tag-history/bill/${billNumber}`);
          if (response.success) {
            alert('All tags deleted successfully');
            fetchTags();
            fetchStats();
            setSelectedBill(null);
          }
        } catch (error) {
          console.error('Error deleting tags:', error);
          alert('Failed to delete tags');
        }
      }
    });
  };

  const handleEditTag = async (tag: TagHistory) => {
    const newItemName = prompt('Edit Item Name:', tag.itemName);
    if (!newItemName || newItemName === tag.itemName) return;

    try {
      const response = await apiService.patch(`/tag-history/${tag._id}`, {
        itemName: newItemName.toUpperCase()
      });
      
      if (response.success) {
        alert('Tag updated successfully');
        fetchTags();
      }
    } catch (error) {
      console.error('Error updating tag:', error);
      alert('Failed to update tag');
    }
  };

  const toggleBillExpansion = (billNumber: string) => {
    const newExpanded = new Set(expandedBills);
    if (newExpanded.has(billNumber)) {
      newExpanded.delete(billNumber);
    } else {
      newExpanded.add(billNumber);
    }
    setExpandedBills(newExpanded);
  };

  const reprintBillTags = (bill: GroupedBill) => {
    // Create print window with all tags for this bill
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      alert('Please allow popups for tag printing');
      return;
    }

    const tagHTML = `
<!DOCTYPE html>
<html>
<head>
  <title>Reprint Tags - ${bill.billNumber}</title>
  <style>
    @page { size: 2in auto; margin: 0; }
    @media print {
      body { margin: 0; padding: 0; }
      .tag { page-break-after: avoid; }
      .tag-separator { page-break-after: avoid; }
    }
    body { 
      font-family: 'Arial', sans-serif; 
      margin: 0; 
      padding: 0; 
      background: white; 
      width: 2in;
    }
    .tag { 
      width: 44mm;
      height: 35mm;
      border: 1.5px solid #000; 
      margin: 0 auto; 
      padding: 1.5mm; 
      background: white; 
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      box-sizing: border-box; 
      overflow: hidden;
    }
    .tag-separator {
      height: 10mm;
      width: 100%;
      margin: 0;
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .tag-separator::before {
      content: '';
      position: absolute;
      left: 0;
      right: 0;
      top: 50%;
      border-top: 1px dotted #666;
      z-index: 1;
    }
    .tag-separator::after {
      content: '✂';
      position: relative;
      font-size: 14px;
      color: #666;
      background: white;
      padding: 0 5px;
      z-index: 2;
    }
    .top-row { 
      display: flex; 
      justify-content: space-between; 
      align-items: center; 
      font-size: 6px; 
      font-weight: bold;
      padding-bottom: 1mm;
      border-bottom: 1px solid #000;
    }
    .customer-name { 
      text-align: center; 
      font-size: 12px; 
      font-weight: 900; 
      text-transform: uppercase;
      letter-spacing: 0.2px;
      margin: 1.5mm 0;
      line-height: 1.1;
      word-wrap: break-word;
      overflow-wrap: break-word;
      max-width: 100%;
    }
    .bill-info { 
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10px; 
      font-weight: bold; 
      letter-spacing: 0.3px; 
      font-family: 'Courier New', monospace;
      margin: 1mm 0;
    }
    .tag-number { 
      font-size: 9px; 
      font-weight: 900;
      border: 1.5px solid #000;
      padding: 1px 4px;
      border-radius: 2px;
      background: white;
    }
    .website { 
      text-align: center;
      font-size: 6px; 
      font-weight: bold;
      margin-top: 1mm;
      padding-top: 1mm;
      border-top: 1px solid #000;
    }
  </style>
</head>
<body>
  ${bill.tags.map((tag, index) => `
    <div class="tag">
      <div class="top-row">
        <span>GenZ Laundry</span>
        <span>${new Date(tag.createdAt).toLocaleDateString('en-GB')}</span>
      </div>
      <div class="customer-name">${tag.customerName}</div>
      <div class="bill-info">
        <span>${tag.billNumber}</span>
        <span class="tag-number">${tag.tagIndex} / ${tag.totalTags}</span>
      </div>
      <div class="website">www.genzlaundry.com</div>
    </div>
    ${index < bill.tags.length - 1 ? '<div class="tag-separator"></div>' : ''}
  `).join('')}
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
        setTimeout(function() { window.close(); }, 1000);
      }, 500);
    }
  </script>
</body>
</html>
    `;

    printWindow.document.write(tagHTML);
    printWindow.document.close();
  };

  const reprintSingleTag = (tag: TagHistory) => {
    // Create print window for single tag
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      alert('Please allow popups for tag printing');
      return;
    }

    const tagHTML = `
<!DOCTYPE html>
<html>
<head>
  <title>Reprint Tag - ${tag.billNumber} (${tag.tagIndex}/${tag.totalTags})</title>
  <style>
    @page { size: 2in auto; margin: 0; }
    @media print {
      body { margin: 0; padding: 0; }
    }
    body { 
      font-family: 'Arial', sans-serif; 
      margin: 0; 
      padding: 0; 
      background: white; 
      width: 2in;
    }
    .tag { 
      width: 44mm;
      height: 35mm;
      border: 1.5px solid #000; 
      margin: 0 auto; 
      padding: 1.5mm; 
      background: white; 
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      box-sizing: border-box; 
      overflow: hidden;
    }
    .top-row { 
      display: flex; 
      justify-content: space-between; 
      align-items: center; 
      font-size: 6px; 
      font-weight: bold;
      padding-bottom: 1mm;
      border-bottom: 1px solid #000;
    }
    .customer-name { 
      text-align: center; 
      font-size: 12px; 
      font-weight: 900; 
      text-transform: uppercase;
      letter-spacing: 0.2px;
      margin: 1.5mm 0;
      line-height: 1.1;
      word-wrap: break-word;
      overflow-wrap: break-word;
      max-width: 100%;
    }
    .bill-info { 
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 10px; 
      font-weight: bold; 
      letter-spacing: 0.3px; 
      font-family: 'Courier New', monospace;
      margin: 1mm 0;
    }
    .tag-number { 
      font-size: 9px; 
      font-weight: 900;
      border: 1.5px solid #000;
      padding: 1px 4px;
      border-radius: 2px;
      background: white;
    }
    .website { 
      text-align: center;
      font-size: 6px; 
      font-weight: bold;
      margin-top: 1mm;
      padding-top: 1mm;
      border-top: 1px solid #000;
    }
  </style>
</head>
<body>
  <div class="tag">
    <div class="top-row">
      <span>GenZ Laundry</span>
      <span>${new Date(tag.createdAt).toLocaleDateString('en-GB')}</span>
    </div>
    <div class="customer-name">${tag.customerName}</div>
    <div class="bill-info">
      <span>${tag.billNumber}</span>
      <span class="tag-number">${tag.tagIndex} / ${tag.totalTags}</span>
    </div>
    <div class="website">www.genzlaundry.com</div>
  </div>
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
        setTimeout(function() { window.close(); }, 1000);
      }, 500);
    }
  </script>
</body>
</html>
    `;

    printWindow.document.write(tagHTML);
    printWindow.document.close();
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'created': 'bg-gray-100 text-gray-800',
      'printed': 'bg-blue-100 text-blue-800',
      'in-process': 'bg-yellow-100 text-yellow-800',
      'completed': 'bg-green-100 text-green-800',
      'delivered': 'bg-purple-100 text-purple-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 25%, #0f3460 50%, #533483 75%, #7b2cbf 100%)',
      padding: '24px'
    }}>
      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.8;
          }
        }
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .stat-card {
          animation: fadeInUp 0.6s ease-out;
          transition: all 0.3s ease;
        }
        .stat-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
        }
        .bill-row {
          transition: all 0.2s ease;
        }
        .bill-row:hover {
          background: rgba(99, 102, 241, 0.1);
          transform: scale(1.01);
        }
        .action-btn {
          transition: all 0.2s ease;
        }
        .action-btn:hover {
          transform: scale(1.1);
        }
      `}</style>

      <div className="max-w-7xl mx-auto">
        <div style={{
          background: 'rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '24px',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          animation: 'fadeInUp 0.5s ease-out'
        }}>
          <h1 style={{
            fontSize: '36px',
            fontWeight: 'bold',
            color: 'white',
            marginBottom: '8px',
            textShadow: '0 2px 10px rgba(0, 0, 0, 0.3)'
          }}>
            📋 Tag History Dashboard
          </h1>
          <p style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>
            Manage and track all your laundry tags
          </p>
        </div>

        {/* Statistics */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="stat-card" style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              padding: '24px',
              borderRadius: '16px',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              animationDelay: '0.1s'
            }}>
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)', marginBottom: '12px' }}>
                📊 Total Tags
              </h3>
              <p style={{ fontSize: '48px', fontWeight: 'bold', color: 'white', textShadow: '0 2px 10px rgba(0, 0, 0, 0.3)' }}>
                {stats.totalTags}
              </p>
            </div>
            
            <div className="stat-card" style={{
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              padding: '24px',
              borderRadius: '16px',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              animationDelay: '0.2s'
            }}>
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)', marginBottom: '12px' }}>
                🎯 By Status
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {Object.entries(stats.byStatus).map(([status, count]) => (
                  <div key={status} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: 'white' }}>
                    <span style={{ textTransform: 'capitalize', fontWeight: '500' }}>{status}:</span>
                    <span style={{ fontWeight: 'bold', fontSize: '16px' }}>{count}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="stat-card" style={{
              background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
              padding: '24px',
              borderRadius: '16px',
              boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              animationDelay: '0.3s'
            }}>
              <h3 style={{ fontSize: '14px', fontWeight: '600', color: 'rgba(255, 255, 255, 0.9)', marginBottom: '12px' }}>
                🧺 By Wash Type
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {Object.entries(stats.byWashType).map(([type, count]) => (
                  <div key={type} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: 'white' }}>
                    <span style={{ fontWeight: '500' }}>{type}:</span>
                    <span style={{ fontWeight: 'bold', fontSize: '16px' }}>{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          padding: '24px',
          borderRadius: '16px',
          marginBottom: '24px',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
          animation: 'fadeInUp 0.6s ease-out'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1a1a2e' }}>🔍 Filters</h3>
            <button
              onClick={() => {
                setFilters({
                  billNumber: '',
                  customerName: '',
                  customerPhone: '',
                  status: '',
                  startDate: '',
                  endDate: ''
                });
                setCurrentPage(1);
              }}
              style={{
                padding: '8px 16px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.05)';
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
              }}
            >
              🔄 Clear All Filters
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="🔢 Bill Number"
              value={filters.billNumber}
              onChange={(e) => handleFilterChange('billNumber', e.target.value)}
              style={{
                padding: '12px 16px',
                border: '2px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '14px',
                transition: 'all 0.3s ease',
                outline: 'none'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#667eea'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#e0e0e0'}
            />
            <input
              type="text"
              placeholder="👤 Customer Name"
              value={filters.customerName}
              onChange={(e) => handleFilterChange('customerName', e.target.value)}
              style={{
                padding: '12px 16px',
                border: '2px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '14px',
                transition: 'all 0.3s ease',
                outline: 'none'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#667eea'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#e0e0e0'}
            />
            <input
              type="text"
              placeholder="📱 Customer Phone"
              value={filters.customerPhone}
              onChange={(e) => handleFilterChange('customerPhone', e.target.value)}
              style={{
                padding: '12px 16px',
                border: '2px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '14px',
                transition: 'all 0.3s ease',
                outline: 'none'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#667eea'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#e0e0e0'}
            />
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              style={{
                padding: '12px 16px',
                border: '2px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '14px',
                transition: 'all 0.3s ease',
                outline: 'none',
                cursor: 'pointer'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#667eea'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#e0e0e0'}
            >
              <option value="">📊 All Status</option>
              <option value="created">Created</option>
              <option value="printed">Printed</option>
              <option value="in-process">In Process</option>
              <option value="completed">Completed</option>
              <option value="delivered">Delivered</option>
            </select>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => handleFilterChange('startDate', e.target.value)}
              style={{
                padding: '12px 16px',
                border: '2px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '14px',
                transition: 'all 0.3s ease',
                outline: 'none'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#667eea'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#e0e0e0'}
            />
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => handleFilterChange('endDate', e.target.value)}
              style={{
                padding: '12px 16px',
                border: '2px solid #e0e0e0',
                borderRadius: '8px',
                fontSize: '14px',
                transition: 'all 0.3s ease',
                outline: 'none'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#667eea'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#e0e0e0'}
            />
          </div>
        </div>

        {/* Grouped Bills List */}
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
          animation: 'fadeInUp 0.7s ease-out'
        }}>
          <div style={{
            padding: '16px 24px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <span style={{ fontWeight: '700', color: 'white', fontSize: '16px' }}>
                📦 Showing {groupedBills.length} bill{groupedBills.length !== 1 ? 's' : ''} 
              </span>
              <span style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '14px', marginLeft: '12px' }}>
                ({tags.length} total tag{tags.length !== 1 ? 's' : ''})
              </span>
            </div>
            {(filters.billNumber || filters.customerName || filters.customerPhone || filters.status || filters.startDate || filters.endDate) && (
              <span style={{
                fontSize: '14px',
                color: 'white',
                fontWeight: '600',
                background: 'rgba(255, 255, 255, 0.2)',
                padding: '6px 12px',
                borderRadius: '20px'
              }}>
                🔍 Filters Active
              </span>
            )}
          </div>
          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#667eea', fontSize: '18px', fontWeight: '600' }}>
              <div style={{ animation: 'pulse 1.5s ease-in-out infinite' }}>⏳ Loading...</div>
            </div>
          ) : groupedBills.length === 0 ? (
            <div style={{ padding: '60px', textAlign: 'center', color: '#999', fontSize: '16px' }}>
              📭 No bills found
            </div>
          ) : (
            <div style={{ overflowX: 'auto', maxHeight: '600px', overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: '#f8f9fa', position: 'sticky', top: 0, zIndex: 10 }}>
                  <tr>
                    <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: '700', color: '#1a1a2e' }}>S.No</th>
                    <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: '700', color: '#1a1a2e' }}>Bill #</th>
                    <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: '700', color: '#1a1a2e' }}>Customer</th>
                    <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: '700', color: '#1a1a2e' }}>Total Tags</th>
                    <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: '700', color: '#1a1a2e' }}>Status</th>
                    <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: '700', color: '#1a1a2e' }}>Created</th>
                    <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: '700', color: '#1a1a2e' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedBills.map((bill, billIndex) => (
                    <React.Fragment key={bill.billNumber}>
                      <tr className="bill-row" style={{ borderBottom: '1px solid #e0e0e0' }}>
                        <td style={{ padding: '16px', fontSize: '14px' }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'bold',
                            fontSize: '14px'
                          }}>
                            {billIndex + 1}
                          </div>
                        </td>
                        <td style={{ padding: '16px', fontSize: '14px', fontWeight: '600', color: '#1a1a2e' }}>{bill.billNumber}</td>
                        <td style={{ padding: '16px', fontSize: '14px' }}>
                          <div style={{ fontWeight: '600', color: '#1a1a2e', marginBottom: '4px' }}>{bill.customerName}</div>
                          <div style={{ color: '#666', fontSize: '12px' }}>📱 {bill.customerPhone}</div>
                        </td>
                        <td style={{ padding: '16px', fontSize: '14px' }}>
                          <span style={{
                            fontWeight: '700',
                            color: '#667eea',
                            background: 'rgba(102, 126, 234, 0.1)',
                            padding: '4px 12px',
                            borderRadius: '12px'
                          }}>
                            {bill.totalTags} tags
                          </span>
                        </td>
                        <td style={{ padding: '16px' }}>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(bill.status)}`}>
                            {bill.status}
                          </span>
                        </td>
                        <td style={{ padding: '16px', fontSize: '13px', color: '#666' }}>
                          {formatDate(bill.createdAt)}
                        </td>
                        <td style={{ padding: '16px' }}>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                            <button
                              onClick={() => toggleBillExpansion(bill.billNumber)}
                              className="action-btn"
                              style={{
                                padding: '6px 12px',
                                background: expandedBills.has(bill.billNumber) ? '#667eea' : '#e0e0e0',
                                color: expandedBills.has(bill.billNumber) ? 'white' : '#333',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: '600',
                                cursor: 'pointer'
                              }}
                            >
                              {expandedBills.has(bill.billNumber) ? '▼ Hide' : '▶ View'}
                            </button>
                            <button
                              onClick={() => reprintBillTags(bill)}
                              className="action-btn"
                              style={{
                                padding: '6px 12px',
                                background: '#9333ea',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: '600',
                                cursor: 'pointer'
                              }}
                            >
                              🖨️ Reprint
                            </button>
                            <button
                              onClick={() => setSelectedBill(bill)}
                              className="action-btn"
                              style={{
                                padding: '6px 12px',
                                background: '#10b981',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: '600',
                                cursor: 'pointer'
                              }}
                            >
                              ⚙️ Manage
                            </button>
                            <button
                              onClick={() => handleDeleteAllBillTags(bill.billNumber, bill.customerName)}
                              className="action-btn"
                              style={{
                                padding: '6px 12px',
                                background: '#ef4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: '600',
                                cursor: 'pointer'
                              }}
                            >
                              🗑️ Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                      {expandedBills.has(bill.billNumber) && (
                        <tr>
                          <td colSpan={7} style={{ padding: '24px', background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)' }}>
                            <div style={{ marginLeft: '32px', animation: 'slideIn 0.3s ease-out' }}>
                              <h4 style={{ fontWeight: '700', marginBottom: '16px', fontSize: '16px', color: '#1a1a2e' }}>
                                🏷️ Individual Tags:
                              </h4>
                              <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', fontSize: '14px', background: 'white', borderRadius: '8px', overflow: 'hidden' }}>
                                  <thead style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                                    <tr>
                                      <th style={{ padding: '12px', textAlign: 'left' }}>S.No</th>
                                      <th style={{ padding: '12px', textAlign: 'left' }}>Tag #</th>
                                      <th style={{ padding: '12px', textAlign: 'left' }}>Item</th>
                                      <th style={{ padding: '12px', textAlign: 'left' }}>Wash Type</th>
                                      <th style={{ padding: '12px', textAlign: 'left' }}>Status</th>
                                      <th style={{ padding: '12px', textAlign: 'left' }}>QR Code</th>
                                      <th style={{ padding: '12px', textAlign: 'left' }}>Actions</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {bill.tags.sort((a, b) => a.tagIndex - b.tagIndex).map((tag, tagIndex) => (
                                      <tr key={tag._id} style={{ borderBottom: '1px solid #e0e0e0', transition: 'background 0.2s ease' }}
                                        onMouseEnter={(e) => e.currentTarget.style.background = '#f8f9fa'}
                                        onMouseLeave={(e) => e.currentTarget.style.background = 'white'}>
                                        <td style={{ padding: '12px' }}>
                                          <div style={{
                                            width: '28px',
                                            height: '28px',
                                            borderRadius: '50%',
                                            background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                                            color: 'white',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontWeight: 'bold',
                                            fontSize: '12px'
                                          }}>
                                            {tagIndex + 1}
                                          </div>
                                        </td>
                                        <td style={{ padding: '12px', fontWeight: '600' }}>{tag.tagIndex}/{tag.totalTags}</td>
                                        <td style={{ padding: '12px' }}>{tag.itemName}</td>
                                        <td style={{ padding: '12px' }}>{tag.washType}</td>
                                        <td style={{ padding: '12px' }}>
                                          <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(tag.status)}`}>
                                            {tag.status}
                                          </span>
                                        </td>
                                        <td style={{ padding: '12px', fontFamily: 'monospace', fontSize: '12px', color: '#666' }}>
                                          {tag.qrCode || tag.barcode}
                                        </td>
                                        <td style={{ padding: '12px' }}>
                                          <div style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                              onClick={() => reprintSingleTag(tag)}
                                              className="action-btn"
                                              style={{
                                                padding: '4px 8px',
                                                background: '#9333ea',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '4px',
                                                fontSize: '12px',
                                                cursor: 'pointer'
                                              }}
                                              title="Reprint this tag"
                                            >
                                              🖨️
                                            </button>
                                            <button
                                              onClick={() => handleEditTag(tag)}
                                              className="action-btn"
                                              style={{
                                                padding: '4px 8px',
                                                background: '#3b82f6',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '4px',
                                                fontSize: '12px',
                                                cursor: 'pointer'
                                              }}
                                              title="Edit item name"
                                            >
                                              ✏️
                                            </button>
                                            <button
                                              onClick={() => handleDeleteTag(tag._id, `${tag.tagIndex}/${tag.totalTags} - ${tag.itemName}`)}
                                              className="action-btn"
                                              style={{
                                                padding: '4px 8px',
                                                background: '#ef4444',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '4px',
                                                fontSize: '12px',
                                                cursor: 'pointer'
                                              }}
                                              title="Delete this tag"
                                            >
                                              🗑️
                                            </button>
                                          </div>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </div>

      {/* Bill Management Modal */}
      {selectedBill && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold">Manage Bill Tags</h2>
                  <p className="text-gray-600">Bill #{selectedBill.billNumber} - {selectedBill.customerName}</p>
                </div>
                <button
                  onClick={() => setSelectedBill(null)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              {/* Quick Actions */}
              <div className="mb-6 flex gap-3 flex-wrap">
                <button
                  onClick={() => reprintBillTags(selectedBill)}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 font-medium"
                >
                  🖨️ Reprint All Tags
                </button>
                <button
                  onClick={() => handleBulkStatusUpdate(selectedBill.billNumber, 'in-process')}
                  className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 font-medium"
                >
                  ⏳ Mark In-Process
                </button>
                <button
                  onClick={() => handleBulkStatusUpdate(selectedBill.billNumber, 'completed')}
                  className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 font-medium"
                >
                  ✅ Mark Completed
                </button>
                <button
                  onClick={() => handleBulkStatusUpdate(selectedBill.billNumber, 'delivered')}
                  className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 font-medium"
                >
                  🚚 Mark Delivered
                </button>
                <button
                  onClick={() => {
                    handleDeleteAllBillTags(selectedBill.billNumber, selectedBill.customerName);
                  }}
                  className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 font-medium ml-auto"
                >
                  🗑️ Delete All Tags
                </button>
              </div>

              {/* Bill Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-sm text-gray-600">Total Tags</div>
                  <div className="text-2xl font-bold">{selectedBill.totalTags}</div>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-sm text-gray-600">Customer</div>
                  <div className="font-semibold">{selectedBill.customerName}</div>
                  <div className="text-xs text-gray-500">{selectedBill.customerPhone}</div>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-sm text-gray-600">Status</div>
                  <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getStatusColor(selectedBill.status)}`}>
                    {selectedBill.status}
                  </span>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <div className="text-sm text-gray-600">Created</div>
                  <div className="text-sm font-medium">{formatDate(selectedBill.createdAt)}</div>
                </div>
              </div>

              {/* Individual Tags Table */}
              <div>
                <h3 className="font-semibold mb-3">Individual Tags</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-3 py-2 text-left">S.No</th>
                        <th className="px-3 py-2 text-left">Tag #</th>
                        <th className="px-3 py-2 text-left">Item</th>
                        <th className="px-3 py-2 text-left">Wash Type</th>
                        <th className="px-3 py-2 text-left">Status</th>
                        <th className="px-3 py-2 text-left">QR/Barcode</th>
                        <th className="px-3 py-2 text-left">Last Updated</th>
                        <th className="px-3 py-2 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {selectedBill.tags.sort((a, b) => a.tagIndex - b.tagIndex).map((tag, tagIndex) => (
                        <tr key={tag._id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-bold text-blue-600">{tagIndex + 1}</td>
                          <td className="px-3 py-2 font-medium">{tag.tagIndex}/{tag.totalTags}</td>
                          <td className="px-3 py-2">{tag.itemName}</td>
                          <td className="px-3 py-2">{tag.washType}</td>
                          <td className="px-3 py-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(tag.status)}`}>
                              {tag.status}
                            </span>
                          </td>
                          <td className="px-3 py-2 font-mono text-xs">{tag.qrCode || tag.barcode || '-'}</td>
                          <td className="px-3 py-2 text-xs text-gray-600">
                            {formatDate(tag.updatedAt)}
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex gap-1">
                              <button
                                onClick={() => reprintSingleTag(tag)}
                                className="text-purple-600 hover:text-purple-800 text-xs"
                                title="Reprint"
                              >
                                🖨️
                              </button>
                              <button
                                onClick={() => handleEditTag(tag)}
                                className="text-blue-600 hover:text-blue-800 text-xs"
                                title="Edit"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => handleDeleteTag(tag._id, `${tag.tagIndex}/${tag.totalTags} - ${tag.itemName}`)}
                                className="text-red-600 hover:text-red-800 text-xs"
                                title="Delete"
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Event History */}
              <div className="mt-6">
                <h3 className="font-semibold mb-3">Event History</h3>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {selectedBill.tags[0]?.events.map((event, index) => (
                    <div key={index} className="border-l-4 border-blue-500 pl-3 py-2 bg-gray-50">
                      <div className="flex justify-between items-start">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(event.status)}`}>
                          {event.status}
                        </span>
                        <span className="text-xs text-gray-500">
                          {formatDate(event.timestamp)}
                        </span>
                      </div>
                      {event.note && (
                        <p className="text-sm text-gray-600 mt-1">{event.note}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        type={confirmDialog.type}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
      />
    </div>
  );
};

export default TagHistoryViewer;
