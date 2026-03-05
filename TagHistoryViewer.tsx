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
    @page { size: 4.25in auto; margin: 0; }
    @media print {
      body { margin: 0; padding: 0; }
      .tag { page-break-after: always; }
      .tag:last-child { page-break-after: avoid; }
    }
    body { 
      font-family: 'Arial Black', 'Arial', sans-serif; 
      margin: 0; 
      padding: 3mm; 
      background: #f5f5f5; 
      width: 4.25in; 
    }
    .tag { 
      width: 60mm; 
      height: 40mm; 
      border: 2px solid #000; 
      margin: 3mm auto; 
      padding: 3mm; 
      background: white; 
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      box-sizing: border-box; 
      page-break-inside: avoid;
      overflow: hidden;
    }
    .top-row { 
      display: flex; 
      justify-content: space-between; 
      align-items: center; 
      font-size: 8px; 
      font-weight: bold;
      padding-bottom: 2mm;
      border-bottom: 1px solid #000;
    }
    .customer-name { 
      text-align: center; 
      font-size: 16px; 
      font-weight: 900; 
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 2mm 0;
      line-height: 1.3;
    }
    .bill-info { 
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 14px; 
      font-weight: bold; 
      letter-spacing: 1px; 
      font-family: 'Courier New', monospace;
      margin: 1mm 0;
    }
    .tag-number { 
      font-size: 12px; 
      font-weight: 900;
      border: 2px solid #000;
      padding: 4px 10px;
      border-radius: 5px;
      background: white;
    }
    .website { 
      text-align: center;
      font-size: 9px; 
      font-weight: bold;
      margin-top: 1mm;
      padding-top: 1.5mm;
      border-top: 1px solid #000;
    }
  </style>
</head>
<body>
  ${bill.tags.map(tag => `
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
    @page { size: 4.25in auto; margin: 0; }
    @media print {
      body { margin: 0; padding: 0; }
    }
    body { 
      font-family: 'Arial Black', 'Arial', sans-serif; 
      margin: 0; 
      padding: 3mm; 
      background: #f5f5f5; 
      width: 4.25in; 
    }
    .tag { 
      width: 60mm; 
      height: 40mm; 
      border: 2px solid #000; 
      margin: 3mm auto; 
      padding: 3mm; 
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
      font-size: 8px; 
      font-weight: bold;
      padding-bottom: 2mm;
      border-bottom: 1px solid #000;
    }
    .customer-name { 
      text-align: center; 
      font-size: 16px; 
      font-weight: 900; 
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 2mm 0;
      line-height: 1.3;
    }
    .bill-info { 
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 14px; 
      font-weight: bold; 
      letter-spacing: 1px; 
      font-family: 'Courier New', monospace;
      margin: 1mm 0;
    }
    .tag-number { 
      font-size: 12px; 
      font-weight: 900;
      border: 2px solid #000;
      padding: 4px 10px;
      border-radius: 5px;
      background: white;
    }
    .website { 
      text-align: center;
      font-size: 9px; 
      font-weight: bold;
      margin-top: 1mm;
      padding-top: 1.5mm;
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
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Tag History</h1>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">Total Tags</h3>
            <p className="text-3xl font-bold text-blue-600">{stats.totalTags}</p>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">By Status</h3>
            <div className="space-y-1">
              {Object.entries(stats.byStatus).map(([status, count]) => (
                <div key={status} className="flex justify-between text-sm">
                  <span className="capitalize">{status}:</span>
                  <span className="font-semibold">{count}</span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-semibold mb-2">By Wash Type</h3>
            <div className="space-y-1">
              {Object.entries(stats.byWashType).map(([type, count]) => (
                <div key={type} className="flex justify-between text-sm">
                  <span>{type}:</span>
                  <span className="font-semibold">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <h3 className="text-lg font-semibold mb-3">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Bill Number"
            value={filters.billNumber}
            onChange={(e) => handleFilterChange('billNumber', e.target.value)}
            className="px-3 py-2 border rounded"
          />
          <input
            type="text"
            placeholder="Customer Name"
            value={filters.customerName}
            onChange={(e) => handleFilterChange('customerName', e.target.value)}
            className="px-3 py-2 border rounded"
          />
          <input
            type="text"
            placeholder="Customer Phone"
            value={filters.customerPhone}
            onChange={(e) => handleFilterChange('customerPhone', e.target.value)}
            className="px-3 py-2 border rounded"
          />
          <select
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
            className="px-3 py-2 border rounded"
          >
            <option value="">All Status</option>
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
            className="px-3 py-2 border rounded"
          />
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => handleFilterChange('endDate', e.target.value)}
            className="px-3 py-2 border rounded"
          />
        </div>
      </div>

      {/* Grouped Bills List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">Loading...</div>
        ) : groupedBills.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No bills found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Bill #</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Customer</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Total Tags</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Created</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {groupedBills.map((bill) => (
                  <React.Fragment key={bill.billNumber}>
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium">{bill.billNumber}</td>
                      <td className="px-4 py-3 text-sm">
                        <div className="font-medium">{bill.customerName}</div>
                        <div className="text-gray-500 text-xs">{bill.customerPhone}</div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <span className="font-semibold">{bill.totalTags}</span> tags
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(bill.status)}`}>
                          {bill.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {formatDate(bill.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex gap-2 flex-wrap">
                          <button
                            onClick={() => toggleBillExpansion(bill.billNumber)}
                            className="text-blue-600 hover:text-blue-800 font-medium text-xs px-2 py-1"
                          >
                            {expandedBills.has(bill.billNumber) ? '▼ Hide' : '▶ View'}
                          </button>
                          <button
                            onClick={() => reprintBillTags(bill)}
                            className="text-purple-600 hover:text-purple-800 font-medium text-xs px-2 py-1"
                          >
                            🖨️ Reprint
                          </button>
                          <button
                            onClick={() => setSelectedBill(bill)}
                            className="text-green-600 hover:text-green-800 font-medium text-xs px-2 py-1"
                          >
                            ⚙️ Manage
                          </button>
                          <button
                            onClick={() => handleDeleteAllBillTags(bill.billNumber, bill.customerName)}
                            className="text-red-600 hover:text-red-800 font-medium text-xs px-2 py-1"
                          >
                            🗑️ Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedBills.has(bill.billNumber) && (
                      <tr>
                        <td colSpan={6} className="px-4 py-3 bg-gray-50">
                          <div className="ml-8">
                            <h4 className="font-semibold mb-2 text-sm">Individual Tags:</h4>
                            <table className="w-full text-sm">
                              <thead className="bg-gray-100">
                                <tr>
                                  <th className="px-3 py-2 text-left">Tag #</th>
                                  <th className="px-3 py-2 text-left">Item</th>
                                  <th className="px-3 py-2 text-left">Wash Type</th>
                                  <th className="px-3 py-2 text-left">Status</th>
                                  <th className="px-3 py-2 text-left">QR Code</th>
                                  <th className="px-3 py-2 text-left">Actions</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y">
                                {bill.tags.sort((a, b) => a.tagIndex - b.tagIndex).map((tag) => (
                                  <tr key={tag._id} className="hover:bg-gray-100">
                                    <td className="px-3 py-2">{tag.tagIndex}/{tag.totalTags}</td>
                                    <td className="px-3 py-2">{tag.itemName}</td>
                                    <td className="px-3 py-2">{tag.washType}</td>
                                    <td className="px-3 py-2">
                                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(tag.status)}`}>
                                        {tag.status}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2 text-xs font-mono">{tag.qrCode || tag.barcode}</td>
                                    <td className="px-3 py-2">
                                      <div className="flex gap-1">
                                        <button
                                          onClick={() => reprintSingleTag(tag)}
                                          className="text-purple-600 hover:text-purple-800 text-xs font-medium"
                                          title="Reprint this tag"
                                        >
                                          🖨️
                                        </button>
                                        <button
                                          onClick={() => handleEditTag(tag)}
                                          className="text-blue-600 hover:text-blue-800 text-xs font-medium"
                                          title="Edit item name"
                                        >
                                          ✏️
                                        </button>
                                        <button
                                          onClick={() => handleDeleteTag(tag._id, `${tag.tagIndex}/${tag.totalTags} - ${tag.itemName}`)}
                                          className="text-red-600 hover:text-red-800 text-xs font-medium"
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
                      {selectedBill.tags.sort((a, b) => a.tagIndex - b.tagIndex).map((tag) => (
                        <tr key={tag._id} className="hover:bg-gray-50">
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
