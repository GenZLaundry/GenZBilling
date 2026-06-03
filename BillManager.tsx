import React, { useState, useEffect } from 'react';
import apiService from './api';
import { useAlert } from './GlobalAlert';
import BillShareButton from './BillShareButton';
import { ShareableBillData } from './BillShareUtils';

interface Bill {
  _id: string;
  billNumber: string;
  customerName: string;
  customerPhone: string;
  items: Array<{
    name: string;
    quantity: number;
    rate: number;
    amount: number;
  }>;
  subtotal: number;
  discount: number;
  deliveryCharge: number;
  previousBalance: number;
  grandTotal: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface BillManagerProps {
  onClose: () => void;
  initialEditBill?: Bill | null;
}

const BillManager: React.FC<BillManagerProps> = ({ onClose, initialEditBill }) => {
  const { showAlert, showConfirm } = useAlert();
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [showEditForm, setShowEditForm] = useState(false);

  const [editFormData, setEditFormData] = useState({
    customerName: '',
    customerPhone: '',
    discount: 0,
    deliveryCharge: 0,
    previousBalance: 0,
    status: 'completed'
  });

  useEffect(() => {
    loadBills();
  }, [currentPage, statusFilter, searchTerm]);

  useEffect(() => {
    if (initialEditBill) {
      handleEdit(initialEditBill);
    }
  }, [initialEditBill]);

  const loadBills = async () => {
    try {
      setLoading(true);
      const params: any = { 
        page: currentPage, 
        limit: 500 
      };
      
      if (statusFilter !== 'ALL') {
        params.status = statusFilter;
      }
      
      if (searchTerm.trim()) {
        params.customerName = searchTerm.trim();
      }
      
      const response = await apiService.getBills(params);
      if (response.success && response.data) {
        // Handle both array and paginated response
        if (Array.isArray(response.data)) {
          setBills(response.data);
          setTotalPages(1);
        } else {
          setBills(response.data.bills || response.data);
          setTotalPages(response.data.totalPages || 1);
        }
      }
    } catch (error) {
      console.error('Failed to load bills:', error);
      // Fallback to localStorage
      const saved = localStorage.getItem('laundry_bill_history');
      if (saved) {
        const localBills = JSON.parse(saved);
        setBills(localBills);
      }
      showAlert({ message: 'Failed to load bills. Showing local data if available.', type: 'warning' });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (bill: Bill) => {
    setEditingBill(bill);
    setEditFormData({
      customerName: bill.customerName,
      customerPhone: bill.customerPhone || '',
      discount: bill.discount || 0,
      deliveryCharge: bill.deliveryCharge || 0,
      previousBalance: bill.previousBalance || 0,
      status: bill.status
    });
    setShowEditForm(true);
  };

  const handleSaveEdit = async () => {
    if (!editingBill) return;

    try {
      // Calculate new grand total
      const newGrandTotal = editingBill.subtotal - editFormData.discount + editFormData.deliveryCharge;
      
      const updatedBill = {
        ...editingBill,
        customerName: editFormData.customerName,
        customerPhone: editFormData.customerPhone,
        discount: editFormData.discount,
        deliveryCharge: editFormData.deliveryCharge,
        previousBalance: editFormData.previousBalance,
        grandTotal: newGrandTotal,
        status: editFormData.status
      };

      // Try to update in database
      try {
        const response = await apiService.updateBill(editingBill._id, updatedBill);
        if (response.success) {
          // If status changed to pending, also sync with pending bills
          if (editFormData.status === 'pending' && editingBill.status !== 'pending') {
            console.log('📋 Bill status changed to pending, syncing with pending bills system');
            // The bill is now in the main bills collection with pending status
            // The PendingBillSelector will load it via getPendingBills() API
          }
          
          // If status changed from pending to completed, remove from pending bills
          if (editFormData.status === 'completed' && editingBill.status === 'pending') {
            console.log('✅ Bill status changed from pending to completed');
            // Remove from localStorage pending bills if exists
            const savedPending = localStorage.getItem('laundry_pending_bills');
            if (savedPending) {
              const pendingBills = JSON.parse(savedPending);
              const updatedPending = pendingBills.filter((bill: any) => 
                bill.id !== editingBill._id && bill._id !== editingBill._id && 
                bill.billNumber !== editingBill.billNumber
              );
              localStorage.setItem('laundry_pending_bills', JSON.stringify(updatedPending));
            }
          }
          
          showAlert({ message: 'Bill updated successfully!', type: 'success' });
        } else {
          showAlert({ message: 'Database update failed, updating locally only', type: 'warning' });
        }
      } catch (error) {
        console.warn('Database update failed:', error);
        showAlert({ message: 'Database unavailable, updating locally only', type: 'warning' });
      }

      // Update localStorage
      const saved = localStorage.getItem('laundry_bill_history');
      if (saved) {
        const localBills = JSON.parse(saved);
        const updatedBills = localBills.map((bill: Bill) => 
          bill._id === editingBill._id || bill.billNumber === editingBill.billNumber 
            ? { ...updatedBill, updatedAt: new Date().toISOString() }
            : bill
        );
        localStorage.setItem('laundry_bill_history', JSON.stringify(updatedBills));
      }

      // Handle pending bills localStorage synchronization
      if (editFormData.status === 'pending' && editingBill.status !== 'pending') {
        // Bill changed to pending - add to pending bills localStorage
        const savedPending = localStorage.getItem('laundry_pending_bills');
        const pendingBills = savedPending ? JSON.parse(savedPending) : [];
        
        // Check if bill already exists in pending bills
        const existsInPending = pendingBills.some((bill: any) => 
          bill.id === editingBill._id || bill._id === editingBill._id || 
          bill.billNumber === editingBill.billNumber
        );
        
        if (!existsInPending) {
          const pendingBill = {
            ...updatedBill,
            id: updatedBill._id,
            status: 'pending'
          };
          pendingBills.push(pendingBill);
          localStorage.setItem('laundry_pending_bills', JSON.stringify(pendingBills));
          console.log('📋 Added bill to pending bills localStorage');
        }
      }

      setShowEditForm(false);
      setEditingBill(null);
      loadBills();
    } catch (error) {
      console.error('Failed to update bill:', error);
      showAlert({ message: 'Failed to update bill. Please try again.', type: 'error' });
    }
  };

  const handleDelete = async (bill: Bill) => {
    showConfirm(
      `Are you sure you want to delete bill ${bill.billNumber}? This action cannot be undone.`,
      async () => {
        try {
          // Try to delete from database
          try {
            const response = await apiService.deleteBill(bill._id);
            if (response.success) {
              showAlert({ message: 'Bill deleted successfully!', type: 'success' });
            } else {
              showAlert({ message: 'Database deletion failed, removing locally only', type: 'warning' });
            }
          } catch (error) {
            console.warn('Database deletion failed:', error);
            showAlert({ message: 'Database unavailable, removing locally only', type: 'warning' });
          }

          // Add to deleted bills tracker to prevent offline re-sync
          try {
            const deletedRaw = localStorage.getItem('laundry_deleted_bills');
            const deletedList = deletedRaw ? JSON.parse(deletedRaw) : [];
            if (!deletedList.includes(bill.billNumber)) {
              deletedList.push(bill.billNumber);
              localStorage.setItem('laundry_deleted_bills', JSON.stringify(deletedList));
            }
          } catch (e) { /* ignore */ }

          // Remove from localStorage
          const saved = localStorage.getItem('laundry_bill_history');
          if (saved) {
            const localBills = JSON.parse(saved);
            const updatedBills = localBills.filter((b: Bill) => 
              b._id !== bill._id && b.billNumber !== bill.billNumber
            );
            localStorage.setItem('laundry_bill_history', JSON.stringify(updatedBills));
          }

          // Remove from laundry_pending_bills localStorage
          try {
            const savedPending = localStorage.getItem('laundry_pending_bills');
            if (savedPending) {
              const pendingBills = JSON.parse(savedPending);
              const updatedPending = pendingBills.filter((b: any) => 
                b._id !== bill._id && b.billNumber !== bill.billNumber && b.id !== bill._id
              );
              localStorage.setItem('laundry_pending_bills', JSON.stringify(updatedPending));
            }
          } catch (e) { /* ignore */ }

          loadBills();
        } catch (error) {
          console.error('Failed to delete bill:', error);
          showAlert({ message: 'Failed to delete bill. Please try again.', type: 'error' });
        }
      }
    );
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed': return '#27ae60';
      case 'pending': return '#f39c12';
      case 'delivered': return '#3498db';
      case 'cancelled': return '#e74c3c';
      default: return '#95a5a6';
    }
  };

  const resetForm = () => {
    setEditingBill(null);
    setShowEditForm(false);
    setEditFormData({
      customerName: '',
      customerPhone: '',
      discount: 0,
      deliveryCharge: 0,
      previousBalance: 0,
      status: 'completed'
    });
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
          color: 'var(--text-primary)', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          borderBottom: '1px solid var(--border-subtle)'
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: 'var(--text-primary)' }}>
              <i className="fas fa-file-invoice" style={{ marginRight: '8px', color: 'var(--accent)' }}></i>Bill Management
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: 'var(--text-secondary)' }}>
              Edit and manage all bills
            </p>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            <i className="fas fa-times"></i> Close
          </button>
        </div>

        {/* Filters */}
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search by customer name..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            style={{ flex: 1, minWidth: '200px', padding: '10px' }}
          />

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            style={{ padding: '10px', minWidth: '150px' }}
          >
            <option value="ALL">All Status</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Edit Form - Fixed Modal Overlay */}
        {showEditForm && editingBill && (
          <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.7)', zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '20px'
          }}>
            <div style={{
              background: 'var(--bg-surface)', borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)', width: '100%', maxWidth: '560px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.5)', overflow: 'hidden'
            }}>
              {/* Modal Header */}
              <div style={{
                padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: 'var(--bg-elevated)'
              }}>
                <h3 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '16px', fontWeight: '700' }}>
                  <i className="fas fa-pen" style={{ marginRight: '8px', color: 'var(--accent)' }}></i>
                  Edit Bill: {editingBill.billNumber}
                </h3>
                <button onClick={resetForm} className="btn btn-ghost btn-sm">
                  <i className="fas fa-times"></i>
                </button>
              </div>

              {/* Modal Body */}
              <div style={{ padding: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Customer Name</label>
                    <input
                      type="text"
                      placeholder="Customer Name"
                      value={editFormData.customerName}
                      onChange={(e) => setEditFormData({ ...editFormData, customerName: e.target.value })}
                      style={{ width: '100%', padding: '10px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Customer Phone</label>
                    <input
                      type="tel"
                      placeholder="Customer Phone"
                      value={editFormData.customerPhone}
                      onChange={(e) => setEditFormData({ ...editFormData, customerPhone: e.target.value })}
                      style={{ width: '100%', padding: '10px', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Discount (₹)</label>
                    <input
                      type="number"
                      placeholder="Discount (₹)"
                      value={editFormData.discount}
                      onChange={(e) => setEditFormData({ ...editFormData, discount: parseFloat(e.target.value) || 0 })}
                      style={{ width: '100%', padding: '10px', boxSizing: 'border-box' }}
                      min="0" step="0.01"
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Delivery Charge (₹)</label>
                    <input
                      type="number"
                      placeholder="Delivery Charge (₹)"
                      value={editFormData.deliveryCharge}
                      onChange={(e) => setEditFormData({ ...editFormData, deliveryCharge: parseFloat(e.target.value) || 0 })}
                      style={{ width: '100%', padding: '10px', boxSizing: 'border-box' }}
                      min="0" step="0.01"
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Previous Due (₹)</label>
                    <input
                      type="number"
                      placeholder="Previous Due (₹)"
                      value={editFormData.previousBalance}
                      onChange={(e) => setEditFormData({ ...editFormData, previousBalance: parseFloat(e.target.value) || 0 })}
                      style={{ width: '100%', padding: '10px', boxSizing: 'border-box' }}
                      min="0" step="0.01"
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Status</label>
                    <select
                      value={editFormData.status}
                      onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                      style={{ width: '100%', padding: '10px', boxSizing: 'border-box' }}
                    >
                      <option value="completed">Completed</option>
                      <option value="pending">Pending</option>
                      <option value="delivered">Delivered</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                {/* New Total Preview */}
                <div style={{
                  padding: '10px 14px', background: 'var(--accent-muted)',
                  borderRadius: 'var(--radius-md)', fontSize: '13px',
                  color: 'var(--text-primary)', marginBottom: '16px'
                }}>
                  <strong>New Total: ₹{(editingBill.subtotal - editFormData.discount + editFormData.deliveryCharge).toLocaleString()}</strong>
                  <span style={{ marginLeft: '12px', color: 'var(--text-secondary)', fontSize: '12px' }}>
                    Subtotal ₹{editingBill.subtotal} − Discount ₹{editFormData.discount} + Delivery ₹{editFormData.deliveryCharge}
                  </span>
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={handleSaveEdit} className="btn btn-success" style={{ flex: 1 }}>
                    <i className="fas fa-save" style={{ marginRight: '6px' }}></i>Save Changes
                  </button>
                  <button onClick={resetForm} className="btn btn-ghost">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bills List */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', marginBottom: '10px' }}></i>
              <div>Loading bills...</div>
            </div>
          ) : bills.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              <i className="fas fa-file-invoice" style={{ fontSize: '24px', marginBottom: '12px', opacity: 0.3 }}></i>
              <h3 style={{ color: 'var(--text-secondary)' }}>No bills found</h3>
              <p style={{ color: 'var(--text-muted)' }}>No bills match your current filters</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '15px' }}>
              {bills.map((bill) => (
                <div key={bill._id || bill.billNumber} style={{
                  background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)', position: 'relative'
                }}>
                  {/* Card body */}
                  <div style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                      <h4 style={{ margin: 0, fontSize: '15px', fontWeight: '700', color: 'var(--text-primary)' }}>
                        {bill.billNumber}
                      </h4>
                      <span style={{
                        background: getStatusColor(bill.status), color: 'white',
                        padding: '2px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: '600', textTransform: 'uppercase'
                      }}>
                        {bill.status}
                      </span>
                      <span style={{ marginLeft: 'auto', color: 'var(--accent-text)', fontWeight: '700', fontSize: '16px' }}>
                        ₹{bill.grandTotal?.toLocaleString()}
                      </span>
                    </div>
                      
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      <div>
                        <i className="fas fa-user" style={{ width: '14px', marginRight: '6px', fontSize: '11px', color: 'var(--text-muted)' }}></i>
                        {bill.customerName}
                        {bill.customerPhone && (
                          <span style={{ marginLeft: '8px', color: 'var(--text-muted)', fontSize: '12px' }}>
                            <i className="fas fa-phone" style={{ marginRight: '3px', fontSize: '10px' }}></i>{bill.customerPhone}
                          </span>
                        )}
                      </div>
                      <div>
                        <i className="fas fa-box" style={{ width: '14px', marginRight: '6px', fontSize: '11px', color: 'var(--text-muted)' }}></i>
                        {bill.items?.length || 0} items · Subtotal ₹{bill.subtotal?.toLocaleString()}
                      </div>
                      <div>
                        <i className="fas fa-calendar" style={{ width: '14px', marginRight: '6px', fontSize: '11px', color: 'var(--text-muted)' }}></i>
                        {new Date(bill.createdAt).toLocaleDateString('en-IN')} · {new Date(bill.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>

                    {bill.items && bill.items.length > 0 && (
                      <div style={{ marginTop: '8px' }}>
                        {bill.items.slice(0, 4).map((item, index) => (
                          <span key={index} style={{ 
                            display: 'inline-block', 
                            background: 'var(--bg-base)', 
                            padding: '2px 8px', 
                            borderRadius: '10px', 
                            margin: '2px 4px 2px 0',
                            fontSize: '11px',
                            color: 'var(--text-muted)'
                          }}>
                            {item.name} ×{item.quantity}
                          </span>
                        ))}
                        {bill.items.length > 4 && (
                          <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                            +{bill.items.length - 4} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Action bar */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '10px 16px',
                    borderTop: '1px solid var(--border-subtle)',
                    background: 'var(--bg-surface)'
                  }}>
                    <button onClick={() => handleEdit(bill)} className="btn btn-ghost btn-sm" style={{ fontSize: '12px' }}>
                      <i className="fas fa-pen" style={{ marginRight: '4px' }}></i>Edit
                    </button>
                    <button onClick={() => handleDelete(bill)} className="btn btn-ghost btn-sm" style={{ fontSize: '12px', color: 'var(--danger)' }}>
                      <i className="fas fa-trash" style={{ marginRight: '4px' }}></i>Delete
                    </button>
                    <div style={{ marginLeft: 'auto' }}>
                      <BillShareButton 
                        billData={{
                          billNumber: bill.billNumber,
                          customerName: bill.customerName,
                          customerPhone: bill.customerPhone,
                          items: bill.items,
                          subtotal: bill.subtotal,
                          discount: bill.discount,
                          deliveryCharge: bill.deliveryCharge,
                          previousBalance: bill.previousBalance,
                          grandTotal: bill.grandTotal,
                          businessName: 'GenZ Laundry',
                          businessPhone: '+91 9256930727',
                          billDate: bill.createdAt
                        }}
                        variant="button"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-subtle)', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', alignItems: 'center' }}>
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="btn btn-ghost btn-sm"
              >
                <i className="fas fa-chevron-left"></i> Previous
              </button>
              
              <span style={{ padding: '8px 12px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                Page {currentPage} of {totalPages}
              </span>
              
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="btn btn-ghost btn-sm"
              >
                Next <i className="fas fa-chevron-right"></i>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BillManager;