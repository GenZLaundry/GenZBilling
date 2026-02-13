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
}

const BillManager: React.FC<BillManagerProps> = ({ onClose }) => {
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

  const loadBills = async () => {
    try {
      setLoading(true);
      const params: any = { 
        page: currentPage, 
        limit: 10 
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

          // Remove from localStorage
          const saved = localStorage.getItem('laundry_bill_history');
          if (saved) {
            const localBills = JSON.parse(saved);
            const updatedBills = localBills.filter((b: Bill) => 
              b._id !== bill._id && b.billNumber !== bill.billNumber
            );
            localStorage.setItem('laundry_bill_history', JSON.stringify(updatedBills));
          }

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
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center',
      zIndex: 1000, backdropFilter: 'blur(10px)'
    }}>
      <div style={{
        background: 'white', borderRadius: '20px', width: '95%', maxWidth: '1400px',
        height: '90%', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 25px 50px rgba(0,0,0,0.3)'
      }}>
        
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #3498db, #2980b9)',
          color: 'white', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>🧾 Bill Management</h2>
            <p style={{ margin: '5px 0 0 0', opacity: 0.9, fontSize: '14px' }}>
              Edit and manage all bills
            </p>
          </div>
          <button onClick={onClose} style={{
            background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '10px',
            padding: '10px 15px', color: 'white', cursor: 'pointer', fontSize: '16px'
          }}>
            ✕ Close
          </button>
        </div>

        {/* Filters */}
        <div style={{ padding: '20px', borderBottom: '1px solid #dee2e6', display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="🔍 Search by customer name..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              flex: 1, minWidth: '200px', padding: '10px', borderRadius: '8px', 
              border: '2px solid #dee2e6', fontSize: '14px'
            }}
          />

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              padding: '10px', borderRadius: '8px', border: '2px solid #dee2e6',
              fontSize: '14px', cursor: 'pointer', minWidth: '150px'
            }}
          >
            <option value="ALL">All Status</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Edit Form */}
        {showEditForm && editingBill && (
          <div style={{ padding: '20px', background: '#f8f9fa', borderBottom: '1px solid #dee2e6' }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#2c3e50' }}>
              ✏️ Edit Bill: {editingBill.billNumber}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px' }}>
              <input
                type="text"
                placeholder="Customer Name"
                value={editFormData.customerName}
                onChange={(e) => setEditFormData({ ...editFormData, customerName: e.target.value })}
                style={{ padding: '10px', borderRadius: '8px', border: '2px solid #dee2e6', fontSize: '14px' }}
              />
              
              <input
                type="tel"
                placeholder="Customer Phone"
                value={editFormData.customerPhone}
                onChange={(e) => setEditFormData({ ...editFormData, customerPhone: e.target.value })}
                style={{ padding: '10px', borderRadius: '8px', border: '2px solid #dee2e6', fontSize: '14px' }}
              />

              <input
                type="number"
                placeholder="Discount (₹)"
                value={editFormData.discount}
                onChange={(e) => setEditFormData({ ...editFormData, discount: parseFloat(e.target.value) || 0 })}
                style={{ padding: '10px', borderRadius: '8px', border: '2px solid #dee2e6', fontSize: '14px' }}
                min="0"
                step="0.01"
              />

              <input
                type="number"
                placeholder="Delivery Charge (₹)"
                value={editFormData.deliveryCharge}
                onChange={(e) => setEditFormData({ ...editFormData, deliveryCharge: parseFloat(e.target.value) || 0 })}
                style={{ padding: '10px', borderRadius: '8px', border: '2px solid #dee2e6', fontSize: '14px' }}
                min="0"
                step="0.01"
              />

              <input
                type="number"
                placeholder="Previous Due (₹)"
                value={editFormData.previousBalance}
                onChange={(e) => setEditFormData({ ...editFormData, previousBalance: parseFloat(e.target.value) || 0 })}
                style={{ padding: '10px', borderRadius: '8px', border: '2px solid #dee2e6', fontSize: '14px' }}
                min="0"
                step="0.01"
              />

              <select
                value={editFormData.status}
                onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                style={{ padding: '10px', borderRadius: '8px', border: '2px solid #dee2e6', fontSize: '14px' }}
              >
                <option value="completed">Completed</option>
                <option value="pending">Pending</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
              <button
                onClick={handleSaveEdit}
                style={{
                  background: 'linear-gradient(135deg, #27ae60, #2ecc71)', color: 'white',
                  border: 'none', borderRadius: '8px', padding: '10px 20px',
                  cursor: 'pointer', fontWeight: 'bold'
                }}
              >
                💾 Save Changes
              </button>
              <button
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

            <div style={{ marginTop: '10px', padding: '10px', background: '#e8f5e8', borderRadius: '8px', fontSize: '14px' }}>
              <strong>New Total: ₹{(editingBill.subtotal - editFormData.discount + editFormData.deliveryCharge).toLocaleString()}</strong>
              <span style={{ marginLeft: '15px', color: '#666' }}>
                (Subtotal: ₹{editingBill.subtotal} - Discount: ₹{editFormData.discount} + Delivery: ₹{editFormData.deliveryCharge})
              </span>
            </div>
          </div>
        )}

        {/* Bills List */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              <div style={{ fontSize: '40px', marginBottom: '10px' }}>⏳</div>
              Loading bills...
            </div>
          ) : bills.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              <div style={{ fontSize: '60px', marginBottom: '15px' }}>🧾</div>
              <h3>No bills found</h3>
              <p>No bills match your current filters</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '15px' }}>
              {bills.map((bill) => (
                <div key={bill._id || bill.billNumber} style={{
                  background: 'white', borderRadius: '10px', padding: '20px',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                  border: '1px solid #dee2e6'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '15px' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                        <h4 style={{ margin: 0, fontSize: '18px', fontWeight: 'bold', color: '#2c3e50' }}>
                          {bill.billNumber}
                        </h4>
                        <span style={{
                          background: getStatusColor(bill.status), color: 'white',
                          padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold'
                        }}>
                          {bill.status.toUpperCase()}
                        </span>
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px', marginBottom: '10px' }}>
                        <div>
                          <strong>Customer:</strong> {bill.customerName}
                          {bill.customerPhone && <div style={{ fontSize: '12px', color: '#666' }}>📱 {bill.customerPhone}</div>}
                        </div>
                        <div>
                          <strong>Items:</strong> {bill.items?.length || 0} items
                          <div style={{ fontSize: '12px', color: '#666' }}>Subtotal: ₹{bill.subtotal?.toLocaleString()}</div>
                        </div>
                        <div>
                          <strong>Total:</strong> <span style={{ color: '#27ae60', fontWeight: 'bold', fontSize: '16px' }}>₹{bill.grandTotal?.toLocaleString()}</span>
                          {(bill.discount > 0 || bill.deliveryCharge > 0) && (
                            <div style={{ fontSize: '12px', color: '#666' }}>
                              {bill.discount > 0 && `Discount: -₹${bill.discount} `}
                              {bill.deliveryCharge > 0 && `Delivery: +₹${bill.deliveryCharge}`}
                            </div>
                          )}
                        </div>
                        <div>
                          <strong>Date:</strong> {new Date(bill.createdAt).toLocaleDateString('en-IN')}
                          <div style={{ fontSize: '12px', color: '#666' }}>
                            {new Date(bill.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>

                      {bill.items && bill.items.length > 0 && (
                        <div style={{ marginTop: '10px' }}>
                          <strong>Items:</strong>
                          <div style={{ marginTop: '5px', fontSize: '14px' }}>
                            {bill.items.slice(0, 3).map((item, index) => (
                              <span key={index} style={{ 
                                display: 'inline-block', 
                                background: '#f8f9fa', 
                                padding: '2px 8px', 
                                borderRadius: '12px', 
                                margin: '2px 5px 2px 0',
                                fontSize: '12px'
                              }}>
                                {item.name} x{item.quantity} (₹{item.amount})
                              </span>
                            ))}
                            {bill.items.length > 3 && (
                              <span style={{ color: '#666', fontSize: '12px' }}>
                                +{bill.items.length - 3} more items
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div style={{ display: 'flex', gap: '8px', marginLeft: '15px', flexDirection: 'column' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleEdit(bill)}
                          style={{
                            background: '#3498db', color: 'white', border: 'none',
                            borderRadius: '6px', padding: '8px 12px', cursor: 'pointer', fontSize: '12px',
                            fontWeight: 'bold'
                          }}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          onClick={() => handleDelete(bill)}
                          style={{
                            background: '#e74c3c', color: 'white', border: 'none',
                            borderRadius: '6px', padding: '8px 12px', cursor: 'pointer', fontSize: '12px',
                            fontWeight: 'bold'
                          }}
                        >
                          🗑️ Delete
                        </button>
                      </div>
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
                        variant="icon"
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

export default BillManager;