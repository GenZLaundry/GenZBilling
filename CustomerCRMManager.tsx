import React, { useState, useEffect } from 'react';
import apiService from './api';
import { useAlert } from './GlobalAlert';

interface Customer {
  _id: string;
  name: string;
  phone: string;
  email: string;
  loyaltyPoints: number;
  totalSpent: number;
  totalOrders: number;
  vipTier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  notes: string;
  lastVisit?: string;
  createdAt: string;
  updatedAt: string;
}

interface BillItem {
  name: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface BillHistoryItem {
  _id: string;
  billNumber: string;
  grandTotal: number;
  status: 'pending' | 'completed' | 'delivered';
  paymentStatus: 'paid' | 'unpaid' | 'partial';
  createdAt: string;
  items: BillItem[];
}

interface ManualEntryHistoryItem {
  id: string;
  serviceType: 'WASH' | 'IRON' | 'WASH+IRON' | 'DRY CLEAN';
  quantity: number;
  pickupDate: string;
  deliveryDate: string;
  paymentStatus: 'paid' | 'unpaid' | 'partial';
  partialAmount?: number;
  remark?: string;
  createdAt: string;
}

interface CustomerDetails {
  profile: Customer;
  history: {
    bills: BillHistoryItem[];
    manualEntries: ManualEntryHistoryItem[];
  };
}

const CustomerCRMManager: React.FC = () => {
  const { showAlert } = useAlert();
  
  // State variables
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [tier, setTier] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('totalSpent');
  const [sortOrder, setSortOrder] = useState<string>('desc');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  
  // Modals state
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerDetails, setCustomerDetails] = useState<CustomerDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState<boolean>(false);
  
  // Edit profile state
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    notes: ''
  });
  const [editSubmitting, setEditSubmitting] = useState<boolean>(false);

  // Points adjustment state
  const [showPointsModal, setShowPointsModal] = useState<boolean>(false);
  const [pointsAdjust, setPointsAdjust] = useState<string>('10');
  const [pointsNote, setPointsNote] = useState<string>('');
  const [pointsSubmitting, setPointsSubmitting] = useState<boolean>(false);

  // Migration state
  const [migrationLoading, setMigrationLoading] = useState<boolean>(false);

  // Fetch customers list
  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const response = await apiService.getCustomers({
        page,
        limit: 15,
        search,
        tier,
        sortBy,
        sortOrder
      });
      if (response.success && response.data) {
        setCustomers(response.data);
        if (response.pagination) {
          setTotalPages(response.pagination.totalPages);
        }
      }
    } catch (error: any) {
      console.error('Error fetching customers:', error);
      showAlert({ message: error.message || 'Failed to fetch customer list', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [page, tier, sortBy, sortOrder]);

  // Debounced search trigger
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      setPage(1);
      fetchCustomers();
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [search]);

  // View customer details and timeline history
  const handleViewDetails = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setDetailsLoading(true);
    setCustomerDetails(null);
    try {
      const response = await apiService.getCustomerDetails(customer.phone);
      if (response.success && response.data) {
        setCustomerDetails(response.data as any);
      }
    } catch (error: any) {
      console.error('Error fetching customer details:', error);
      showAlert({ message: error.message || 'Failed to load customer history', type: 'error' });
      setSelectedCustomer(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  // Open edit profile modal
  const handleOpenEdit = (customer: Customer, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCustomer(customer);
    setEditForm({
      name: customer.name,
      email: customer.email || '',
      notes: customer.notes || ''
    });
    setShowEditModal(true);
  };

  // Save profile updates
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    setEditSubmitting(true);
    try {
      const response = await apiService.updateCustomerProfile(selectedCustomer.phone, editForm);
      if (response.success) {
        showAlert({ message: 'Profile updated successfully', type: 'success' });
        setShowEditModal(false);
        fetchCustomers();
        // Update details view if open
        if (customerDetails) {
          setCustomerDetails({
            ...customerDetails,
            profile: response.data as Customer
          });
        }
      }
    } catch (error: any) {
      console.error('Error updating customer profile:', error);
      showAlert({ message: error.message || 'Failed to update profile', type: 'error' });
    } finally {
      setEditSubmitting(false);
    }
  };

  // Open points adjustment modal
  const handleOpenPoints = (customer: Customer, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedCustomer(customer);
    setPointsAdjust('10');
    setPointsNote('');
    setShowPointsModal(true);
  };

  // Save loyalty points adjustments
  const handleAdjustPointsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;

    const val = parseInt(pointsAdjust);
    if (isNaN(val) || val === 0) {
      showAlert({ message: 'Please enter a valid points adjustment value', type: 'warning' });
      return;
    }

    setPointsSubmitting(true);
    try {
      const response = await apiService.adjustCustomerPoints(selectedCustomer.phone, val, pointsNote);
      if (response.success) {
        showAlert({ message: `Loyalty points adjusted by ${val > 0 ? '+' : ''}${val}`, type: 'success' });
        setShowPointsModal(false);
        fetchCustomers();
        // Update details view if open
        if (customerDetails) {
          setCustomerDetails({
            ...customerDetails,
            profile: response.data as Customer
          });
        }
      }
    } catch (error: any) {
      console.error('Error adjusting points:', error);
      showAlert({ message: error.message || 'Failed to adjust points', type: 'error' });
    } finally {
      setPointsSubmitting(false);
    }
  };

  // Trigger migration
  const handleRunMigration = async () => {
    if (window.confirm('Recalculate all customer statistics and loyalty points from the database? This might take a few seconds.')) {
      setMigrationLoading(true);
      try {
        const response = await apiService.triggerCustomerMigration();
        if (response.success) {
          showAlert({ message: `Database synced! Recalculated ${response.count} customer profiles.`, type: 'success' });
          fetchCustomers();
        }
      } catch (error: any) {
        console.error('Error running migration:', error);
        showAlert({ message: error.message || 'Sync failed', type: 'error' });
      } finally {
        setMigrationLoading(false);
      }
    }
  };

  // Render VIP Tier Badge
  const renderTierBadge = (vipTier: string) => {
    let color = '';
    let bg = '';
    let label = vipTier;

    switch (vipTier) {
      case 'Platinum':
        color = '#f1f5f9';
        bg = 'linear-gradient(135deg, #475569, #94a3b8)';
        break;
      case 'Gold':
        color = '#1e293b';
        bg = 'linear-gradient(135deg, #d97706, #fbbf24)';
        break;
      case 'Silver':
        color = '#1e293b';
        bg = 'linear-gradient(135deg, #4b5563, #cbd5e1)';
        break;
      case 'Bronze':
      default:
        color = '#ffffff';
        bg = 'linear-gradient(135deg, #c2410c, #ea580c)';
        label = 'Bronze';
        break;
    }

    return (
      <span style={{
        padding: '3px 8px',
        borderRadius: '12px',
        fontSize: '11px',
        fontWeight: 'bold',
        color,
        background: bg,
        display: 'inline-block',
        boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
      }}>
        {label}
      </span>
    );
  };

  // Sort toggle handler
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setPage(1);
  };

  // Sorting Indicators
  const renderSortArrow = (field: string) => {
    if (sortBy !== field) return <i className="fas fa-sort" style={{ marginLeft: '4px', opacity: 0.3 }}></i>;
    return sortOrder === 'desc' 
      ? <i className="fas fa-sort-down" style={{ marginLeft: '4px', color: 'var(--accent)' }}></i> 
      : <i className="fas fa-sort-up" style={{ marginLeft: '4px', color: 'var(--accent)' }}></i>;
  };

  // VIP Statistics
  const totalPlatinum = customers.filter(c => c.vipTier === 'Platinum').length;
  const totalGold = customers.filter(c => c.vipTier === 'Gold').length;

  return (
    <div style={{ animation: 'fadeIn 0.4s ease-out' }}>
      
      {/* Title & Actions Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '20px', fontWeight: 'bold', display: 'flex', alignItems: 'center' }}>
            <i className="fas fa-users" style={{ marginRight: '10px', color: 'var(--accent)' }}></i> Customer CRM & Loyalty Center
          </h2>
          <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0', fontSize: '13px' }}>
            Track customer spendings, VIP rankings, and manage loyalty points reward programs.
          </p>
        </div>
        <button
          onClick={handleRunMigration}
          className="btn btn-outline"
          disabled={migrationLoading}
          style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }}
        >
          <i className={`fas fa-sync ${migrationLoading ? 'fa-spin' : ''}`}></i>
          {migrationLoading ? 'Syncing...' : 'Sync Database Stats'}
        </button>
      </div>

      {/* Metrics Row (OLED Glassmorphism) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {[
          { label: 'Total CRM Profiles', value: customers.length, icon: 'fa-user-tag', color: '#ea580c' },
          { label: 'Loyalty points Active', value: customers.reduce((sum, c) => sum + c.loyaltyPoints, 0) + ' pts', icon: 'fa-coins', color: '#fbbf24' },
          { label: 'Platinum VIP Tier', value: totalPlatinum, icon: 'fa-crown', color: '#cbd5e1' },
          { label: 'Gold VIP Tier', value: totalGold, icon: 'fa-gem', color: '#f59e0b' }
        ].map((card, i) => (
          <div key={i} style={{
            background: 'rgba(17, 24, 39, 0.55)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'transform 0.2s',
            cursor: 'default'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
          >
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{card.label}</div>
              <div style={{ color: 'var(--text-primary)', fontSize: '22px', fontWeight: 'bold', marginTop: '6px' }}>{card.value}</div>
            </div>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: `${card.color}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: card.color,
              fontSize: '18px'
            }}>
              <i className={`fas ${card.icon}`}></i>
            </div>
          </div>
        ))}
      </div>

      {/* Search and Filters Section */}
      <div style={{
        background: 'rgba(17, 24, 39, 0.3)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        padding: '16px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: '1', minWidth: '240px' }}>
          <i className="fas fa-search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}></i>
          <input
            type="text"
            placeholder="Search by name or 10-digit phone number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px 10px 36px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              outline: 'none'
            }}
          />
        </div>

        {/* Filters & Sorting controls */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <select
            value={tier}
            onChange={(e) => { setTier(e.target.value); setPage(1); }}
            style={{
              padding: '10px 16px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              background: 'rgba(17, 24, 39, 0.8)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="">All VIP Tiers</option>
            <option value="Bronze">Bronze Tier</option>
            <option value="Silver">Silver Tier</option>
            <option value="Gold">Gold Tier</option>
            <option value="Platinum">Platinum Tier</option>
          </select>
        </div>
      </div>

      {/* Main Customers Table */}
      <div style={{
        background: 'rgba(17, 24, 39, 0.3)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        overflow: 'hidden'
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', marginBottom: '12px', color: 'var(--accent)' }}></i>
            <p>Loading customer database...</p>
          </div>
        ) : customers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
            <i className="fas fa-users-slash" style={{ fontSize: '32px', marginBottom: '12px', opacity: 0.4 }}></i>
            <p>No customer profiles found matching filters</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border-subtle)' }}>
                  <th style={{ padding: '14px 16px', color: 'var(--text-muted)', fontWeight: '600' }}>Customer</th>
                  <th style={{ padding: '14px 16px', color: 'var(--text-muted)', fontWeight: '600' }}>Phone Number</th>
                  <th style={{ padding: '14px 16px', color: 'var(--text-muted)', fontWeight: '600', cursor: 'pointer' }} onClick={() => handleSort('vipTier')}>
                    VIP Tier {renderSortArrow('vipTier')}
                  </th>
                  <th style={{ padding: '14px 16px', color: 'var(--text-muted)', fontWeight: '600', cursor: 'pointer' }} onClick={() => handleSort('totalSpent')}>
                    Total Spendings {renderSortArrow('totalSpent')}
                  </th>
                  <th style={{ padding: '14px 16px', color: 'var(--text-muted)', fontWeight: '600', cursor: 'pointer' }} onClick={() => handleSort('totalOrders')}>
                    Orders {renderSortArrow('totalOrders')}
                  </th>
                  <th style={{ padding: '14px 16px', color: 'var(--text-muted)', fontWeight: '600', cursor: 'pointer' }} onClick={() => handleSort('loyaltyPoints')}>
                    Loyalty Balance {renderSortArrow('loyaltyPoints')}
                  </th>
                  <th style={{ padding: '14px 16px', color: 'var(--text-muted)', fontWeight: '600', cursor: 'pointer' }} onClick={() => handleSort('lastVisit')}>
                    Last Visit {renderSortArrow('lastVisit')}
                  </th>
                  <th style={{ padding: '14px 16px', color: 'var(--text-muted)', fontWeight: '600', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer, index) => {
                  const initial = customer.name.trim().charAt(0).toUpperCase() || '?';
                  return (
                    <tr
                      key={customer._id}
                      onClick={() => handleViewDetails(customer)}
                      style={{
                        borderBottom: index < customers.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                        cursor: 'pointer',
                        transition: 'background 0.2s',
                        background: 'transparent'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      {/* Name Card */}
                      <td style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: 'var(--accent-muted)',
                          color: 'var(--accent)',
                          fontWeight: 'bold',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '13px'
                        }}>
                          {initial}
                        </div>
                        <div>
                          <div style={{ color: 'var(--text-primary)', fontWeight: '500' }}>{customer.name}</div>
                          {customer.email && <div style={{ color: 'var(--text-muted)', fontSize: '11px' }}>{customer.email}</div>}
                        </div>
                      </td>

                      {/* Phone */}
                      <td style={{ padding: '12px 16px', color: 'var(--text-primary)' }}>
                        +91 {customer.phone}
                      </td>

                      {/* VIP Tier */}
                      <td style={{ padding: '12px 16px' }}>
                        {renderTierBadge(customer.vipTier)}
                      </td>

                      {/* Total Spent */}
                      <td style={{ padding: '12px 16px', color: 'var(--text-primary)', fontWeight: '500' }}>
                        ₹{(customer.totalSpent || 0).toLocaleString()}
                      </td>

                      {/* Visits */}
                      <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>
                        <i className="fas fa-receipt" style={{ marginRight: '6px', opacity: 0.5 }}></i>
                        {customer.totalOrders || 0} orders
                      </td>

                      {/* Loyalty points */}
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#fbbf24', fontWeight: 'bold' }}>
                          <i className="fas fa-coins" style={{ fontSize: '12px' }}></i>
                          {customer.loyaltyPoints || 0} pts
                        </div>
                      </td>

                      {/* Last Visit */}
                      <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>
                        {customer.lastVisit 
                          ? new Date(customer.lastVisit).toLocaleDateString('en-IN') 
                          : 'No visits'}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          {/* Award Points button */}
                          <button
                            title="Adjust Loyalty Points"
                            onClick={(e) => handleOpenPoints(customer, e)}
                            className="btn btn-outline btn-sm"
                            style={{ padding: '6px 10px', borderRadius: '4px', borderColor: 'rgba(251,191,36,0.3)', color: '#fbbf24', background: 'transparent' }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(251,191,36,0.1)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            <i className="fas fa-coins"></i>
                          </button>

                          {/* Edit profile button */}
                          <button
                            title="Edit Profile"
                            onClick={(e) => handleOpenEdit(customer, e)}
                            className="btn btn-outline btn-sm"
                            style={{ padding: '6px 10px', borderRadius: '4px', borderColor: 'rgba(59,130,246,0.3)', color: '#3b82f6', background: 'transparent' }}
                            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(59,130,246,0.1)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                          >
                            <i className="fas fa-pen"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination bar */}
        {!loading && totalPages > 1 && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '14px 16px',
            borderTop: '1px solid var(--border-subtle)',
            background: 'rgba(255,255,255,0.01)',
            fontSize: '12px'
          }}>
            <div style={{ color: 'var(--text-secondary)' }}>
              Page <strong>{page}</strong> of <strong>{totalPages}</strong>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="btn btn-outline btn-sm"
                style={{ padding: '4px 10px', opacity: page <= 1 ? 0.4 : 1 }}
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                className="btn btn-outline btn-sm"
                style={{ padding: '4px 10px', opacity: page >= totalPages ? 0.4 : 1 }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL 1: Customer Details & Timeline History */}
      {selectedCustomer && !showEditModal && !showPointsModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(9, 9, 11, 0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px',
          animation: 'fadeIn 0.3s ease-out'
        }}
        onClick={() => setSelectedCustomer(null)}
        >
          <div style={{
            width: '100%',
            maxWidth: '900px',
            maxHeight: '85vh',
            background: '#18181b',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'rgba(255,255,255,0.01)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: 'var(--accent-muted)',
                  color: 'var(--accent)',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '15px'
                }}>
                  {selectedCustomer.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '16px', fontWeight: 'bold' }}>
                    {selectedCustomer.name}
                  </h3>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '12px', marginTop: '2px' }}>
                    +91 {selectedCustomer.phone}
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '20px', cursor: 'pointer' }}
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ overflowY: 'auto', padding: '20px', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
              {detailsLoading ? (
                <div style={{ flex: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '50px 0', color: 'var(--text-secondary)' }}>
                  <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px', marginBottom: '12px', color: 'var(--accent)' }}></i>
                  <p>Loading customer profile & logs...</p>
                </div>
              ) : (
                <>
                  {/* Left Column: Stats & Profile Card */}
                  <div style={{ flex: '1', minWidth: '280px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {/* VIP Cards panel */}
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      borderRadius: 'var(--radius-md)',
                      padding: '16px',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <span style={{ color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>VIP Status Badge</span>
                        {renderTierBadge(customerDetails?.profile.vipTier || selectedCustomer.vipTier)}
                      </div>
                      
                      {/* Loyalty gauges */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px 0', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Loyalty Balance:</span>
                          <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>{customerDetails?.profile.loyaltyPoints || selectedCustomer.loyaltyPoints} points</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Total Spends:</span>
                          <span style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>₹{(customerDetails?.profile.totalSpent || selectedCustomer.totalSpent || 0).toLocaleString()}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>Total Orders:</span>
                          <span style={{ color: 'var(--text-primary)', fontWeight: 'bold' }}>{customerDetails?.profile.totalOrders || selectedCustomer.totalOrders} visits</span>
                        </div>
                      </div>
                    </div>

                    {/* Email, preferences, notes */}
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      borderRadius: 'var(--radius-md)',
                      padding: '16px',
                      fontSize: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px'
                    }}>
                      <div>
                        <div style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>Email Address</div>
                        <div style={{ color: 'var(--text-primary)', fontStyle: customerDetails?.profile.email ? 'normal' : 'italic' }}>
                          {customerDetails?.profile.email || 'No email registered'}
                        </div>
                      </div>
                      <div>
                        <div style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>Custom Laundry Notes / Preferences</div>
                        <div style={{
                          color: 'var(--text-primary)',
                          background: 'rgba(0,0,0,0.2)',
                          padding: '10px',
                          borderRadius: '6px',
                          fontStyle: customerDetails?.profile.notes ? 'normal' : 'italic',
                          minHeight: '60px'
                        }}>
                          {customerDetails?.profile.notes || 'No special laundry instructions added. Click "Edit Profile" below to add notes (e.g. "prefers heavy starch", "fragile clothes").'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                        <button
                          onClick={(e) => handleOpenEdit(customerDetails?.profile || selectedCustomer, e)}
                          className="btn btn-outline btn-sm"
                          style={{ flex: 1, padding: '8px', fontSize: '11px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
                        >
                          <i className="fas fa-user-edit"></i> Edit Profile
                        </button>
                        <button
                          onClick={(e) => handleOpenPoints(customerDetails?.profile || selectedCustomer, e)}
                          className="btn btn-outline btn-sm"
                          style={{ flex: 1, padding: '8px', fontSize: '11px', color: '#fbbf24', borderColor: 'rgba(251,191,36,0.3)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}
                        >
                          <i className="fas fa-coins"></i> Adjust Points
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Timeline History */}
                  <div style={{ flex: '1.6', minWidth: '320px' }}>
                    <h4 style={{ color: 'var(--text-primary)', margin: '0 0 16px 0', fontSize: '14px', fontWeight: 'bold' }}>
                      <i className="fas fa-clock-rotate-left" style={{ marginRight: '6px', color: 'var(--accent)' }}></i> Chronological Order Timeline
                    </h4>

                    {/* Timeline items list */}
                    {customerDetails && (customerDetails.history.bills.length === 0 && customerDetails.history.manualEntries.length === 0) ? (
                      <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '30px' }}>
                        No history found for this customer profile yet.
                      </div>
                    ) : (
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                        borderLeft: '2px solid rgba(255,255,255,0.06)',
                        paddingLeft: '16px',
                        marginLeft: '8px'
                      }}>
                        {/* Combine and sort timeline items */}
                        {(() => {
                          const billsMapped = (customerDetails?.history.bills || []).map(b => ({
                            type: 'bill',
                            date: new Date(b.createdAt),
                            data: b
                          }));
                          const manualMapped = (customerDetails?.history.manualEntries || []).map(e => ({
                            type: 'manual',
                            date: new Date(e.createdAt),
                            data: e
                          }));
                          
                          const combined = [...billsMapped, ...manualMapped].sort((a, b) => b.date.getTime() - a.date.getTime());
                          
                          return combined.map((item, idx) => {
                            const formattedDate = item.date.toLocaleDateString('en-IN', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric'
                            });

                            if (item.type === 'bill') {
                              const bill = item.data as BillHistoryItem;
                              return (
                                <div key={`bill-${bill._id}-${idx}`} style={{ position: 'relative', background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '8px', padding: '12px' }}>
                                  {/* Timeline marker */}
                                  <div style={{ position: 'absolute', width: '10px', height: '10px', borderRadius: '50%', background: '#3b82f6', left: '-22px', top: '16px', border: '2px solid #18181b' }} />
                                  
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <span style={{ color: 'var(--accent)', fontWeight: 'bold' }}>{bill.billNumber}</span>
                                      <span style={{ fontSize: '11px', padding: '1px 6px', borderRadius: '4px', background: bill.status === 'delivered' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)', color: bill.status === 'delivered' ? '#10b981' : '#f59e0b' }}>
                                        {bill.status}
                                      </span>
                                    </div>
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formattedDate}</span>
                                  </div>
                                  
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>
                                      {bill.items.map(i => `${i.name} (${i.quantity})`).join(', ').substring(0, 40)}
                                      {bill.items.length > 2 && '...'}
                                    </span>
                                    <strong style={{ color: 'var(--text-primary)' }}>₹{bill.grandTotal}</strong>
                                  </div>
                                </div>
                              );
                            } else {
                              const entry = item.data as ManualEntryHistoryItem;
                              return (
                                <div key={`manual-${entry.id}-${idx}`} style={{ position: 'relative', background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.03)', borderRadius: '8px', padding: '12px' }}>
                                  {/* Timeline marker */}
                                  <div style={{ position: 'absolute', width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', left: '-22px', top: '16px', border: '2px solid #18181b' }} />
                                  
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <span style={{ color: '#10b981', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <i className="fas fa-hand-holding-hand" style={{ fontSize: '11px' }}></i> Walk-in Entry
                                      </span>
                                      <span style={{ fontSize: '11px', padding: '1px 6px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-secondary)' }}>
                                        {entry.serviceType}
                                      </span>
                                    </div>
                                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formattedDate}</span>
                                  </div>
                                  
                                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>
                                      {entry.quantity} pcs clothes
                                      {entry.remark && <span style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Note: "{entry.remark}"</span>}
                                    </span>
                                    <span style={{
                                      fontSize: '11px',
                                      padding: '1px 6px',
                                      borderRadius: '4px',
                                      height: 'fit-content',
                                      background: entry.paymentStatus === 'paid' ? 'rgba(16,185,129,0.1)' : entry.paymentStatus === 'partial' ? 'rgba(245,158,11,0.1)' : 'rgba(239,68,68,0.1)',
                                      color: entry.paymentStatus === 'paid' ? '#10b981' : entry.paymentStatus === 'partial' ? '#f59e0b' : '#ef4444'
                                    }}>
                                      {entry.paymentStatus === 'partial' ? `Partial Paid (₹${entry.partialAmount})` : entry.paymentStatus}
                                    </span>
                                  </div>
                                </div>
                              );
                            }
                          });
                        })()}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '12px 20px',
              borderTop: '1px solid rgba(255,255,255,0.06)',
              textAlign: 'right',
              background: 'rgba(255,255,255,0.01)'
            }}>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="btn btn-outline"
                style={{ padding: '8px 20px', fontSize: '13px' }}
              >
                Close Profile
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Edit Customer Profile Details */}
      {showEditModal && selectedCustomer && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(9, 9, 11, 0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1010,
          padding: '20px',
          animation: 'fadeIn 0.25s ease-out'
        }}
        onClick={() => setShowEditModal(false)}
        >
          <div style={{
            width: '100%',
            maxWidth: '500px',
            background: '#18181b',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            overflow: 'hidden'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '15px', fontWeight: 'bold' }}>
                <i className="fas fa-user-edit" style={{ marginRight: '8px', color: 'var(--accent)' }}></i> Edit Profile Details
              </h3>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '20px', cursor: 'pointer' }}>&times;</button>
            </div>

            {/* Body Form */}
            <form onSubmit={handleSaveProfile}>
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Phone Readonly */}
                <div>
                  <label style={{ display: 'block', color: 'var(--text-muted)', fontSize: '12px', marginBottom: '6px' }}>Registered Mobile Number</label>
                  <input
                    type="text"
                    disabled
                    value={`+91 ${selectedCustomer.phone}`}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                      background: 'rgba(255,255,255,0.02)',
                      color: 'var(--text-muted)',
                      fontSize: '13px',
                      cursor: 'not-allowed'
                    }}
                  />
                </div>

                {/* Name */}
                <div>
                  <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '6px' }}>Customer Name *</label>
                  <input
                    type="text"
                    required
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                      background: 'rgba(255,255,255,0.05)',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Email */}
                <div>
                  <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '6px' }}>Email Address (Optional)</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                      background: 'rgba(255,255,255,0.05)',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Notes */}
                <div>
                  <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '6px' }}>Preferences / Delivery Instructions</label>
                  <textarea
                    value={editForm.notes}
                    onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                    placeholder="e.g. starch on shirts, separate washing for towels, double iron, etc."
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                      background: 'rgba(255,255,255,0.05)',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      outline: 'none',
                      minHeight: '80px',
                      resize: 'vertical'
                    }}
                  />
                </div>
              </div>

              {/* Footer */}
              <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'flex-end', gap: '8px', background: 'rgba(255,255,255,0.01)' }}>
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="btn btn-outline"
                  style={{ padding: '8px 16px', fontSize: '13px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="btn btn-primary"
                  style={{ padding: '8px 20px', fontSize: '13px' }}
                >
                  {editSubmitting ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Adjust Loyalty Points manually */}
      {showPointsModal && selectedCustomer && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(9, 9, 11, 0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1010,
          padding: '20px',
          animation: 'fadeIn 0.25s ease-out'
        }}
        onClick={() => setShowPointsModal(false)}
        >
          <div style={{
            width: '100%',
            maxWidth: '450px',
            background: '#18181b',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            overflow: 'hidden'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '15px', fontWeight: 'bold' }}>
                <i className="fas fa-coins" style={{ marginRight: '8px', color: '#fbbf24' }}></i> Adjust Loyalty Points balance
              </h3>
              <button onClick={() => setShowPointsModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '20px', cursor: 'pointer' }}>&times;</button>
            </div>

            {/* Body Form */}
            <form onSubmit={handleAdjustPointsSubmit}>
              <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ textAlign: 'center', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Current Balance for <strong>{selectedCustomer.name}</strong></div>
                  <div style={{ color: '#fbbf24', fontSize: '32px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '6px' }}>
                    <i className="fas fa-coins"></i>
                    {selectedCustomer.loyaltyPoints} points
                  </div>
                </div>

                {/* Adjustment Input */}
                <div>
                  <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '6px' }}>
                    Points Adjustment (positive to add, negative to deduct)
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. 50 or -30"
                    value={pointsAdjust}
                    onChange={(e) => setPointsAdjust(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: 'var(--text-primary)',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      textAlign: 'center',
                      outline: 'none'
                    }}
                  />
                  
                  {/* Quick Select Buttons */}
                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginTop: '10px' }}>
                    {['+10', '+50', '+100', '-10', '-50'].map((btn) => (
                      <button
                        key={btn}
                        type="button"
                        onClick={() => setPointsAdjust(btn)}
                        className="btn btn-outline btn-sm"
                        style={{ padding: '4px 8px', fontSize: '11px' }}
                      >
                        {btn}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reason Note */}
                <div>
                  <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '12px', marginBottom: '6px' }}>Reason / Log note</label>
                  <input
                    type="text"
                    placeholder="e.g. VIP bonus points, customer satisfaction refund, etc."
                    value={pointsNote}
                    onChange={(e) => setPointsNote(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-subtle)',
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              {/* Footer */}
              <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'flex-end', gap: '8px', background: 'rgba(255,255,255,0.01)' }}>
                <button
                  type="button"
                  onClick={() => setShowPointsModal(false)}
                  className="btn btn-outline"
                  style={{ padding: '8px 16px', fontSize: '13px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pointsSubmitting}
                  className="btn btn-primary"
                  style={{ padding: '8px 20px', fontSize: '13px', background: 'linear-gradient(45deg, #fbbf24, #f59e0b)', border: 'none', color: '#1e293b', fontWeight: 'bold' }}
                >
                  {pointsSubmitting ? 'Updating...' : 'Apply Adjustments'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Local keyframe animation inject */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default CustomerCRMManager;
