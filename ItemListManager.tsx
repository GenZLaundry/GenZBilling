import React, { useState } from 'react';
import { useAlert } from './GlobalAlert';

interface OrderItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  washType: 'WASH' | 'IRON' | 'WASH+IRON' | 'DRY CLEAN';
  total: number;
}

interface ItemListManagerProps {
  orderItems: OrderItem[];
  onUpdateOrderItems: (items: OrderItem[]) => void;
  onClose: () => void;
}

const ItemListManager: React.FC<ItemListManagerProps> = ({
  orderItems,
  onUpdateOrderItems,
  onClose
}) => {
  const { showAlert, showConfirm } = useAlert();
  const [editingItem, setEditingItem] = useState<OrderItem | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    quantity: 1,
    price: 0,
    washType: 'WASH' as 'WASH' | 'IRON' | 'WASH+IRON' | 'DRY CLEAN'
  });

  const handleEditItem = (item: OrderItem) => {
    setEditingItem(item);
    setEditForm({
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      washType: item.washType
    });
  };

  const handleSaveEdit = () => {
    if (!editingItem) return;

    if (!editForm.name.trim()) {
      showAlert({ message: 'Item name is required', type: 'warning' });
      return;
    }

    if (editForm.price <= 0) {
      showAlert({ message: 'Price must be greater than 0', type: 'warning' });
      return;
    }

    if (editForm.quantity <= 0) {
      showAlert({ message: 'Quantity must be greater than 0', type: 'warning' });
      return;
    }

    const updatedItems = orderItems.map(item => 
      item.id === editingItem.id 
        ? {
            ...item,
            name: editForm.name.trim(),
            quantity: editForm.quantity,
            price: editForm.price,
            washType: editForm.washType,
            total: editForm.price * editForm.quantity
          }
        : item
    );

    onUpdateOrderItems(updatedItems);
    setEditingItem(null);
    showAlert({ message: 'Item updated successfully', type: 'success' });
  };

  const handleRemoveItem = (itemId: string) => {
    showConfirm(
      'Remove this item from the order?',
      () => {
        const updatedItems = orderItems.filter(item => item.id !== itemId);
        onUpdateOrderItems(updatedItems);
        showAlert({ message: 'Item removed successfully', type: 'success' });
      }
    );
  };

  const handleDuplicateItem = (item: OrderItem) => {
    const duplicatedItem: OrderItem = {
      ...item,
      id: `${Date.now()}-${Math.random()}`,
      name: `${item.name} (Copy)`
    };
    
    const updatedItems = [...orderItems, duplicatedItem];
    onUpdateOrderItems(updatedItems);
    showAlert({ message: 'Item duplicated successfully', type: 'success' });
  };

  const handleClearAll = () => {
    showConfirm(
      'Clear all items from the order?',
      () => {
        onUpdateOrderItems([]);
        showAlert({ message: 'All items cleared successfully', type: 'success' });
      }
    );
  };

  const serviceTypeColors: Record<string, string> = {
    'WASH': '#3b82f6',
    'IRON': '#f59e0b',
    'WASH+IRON': '#8b5cf6',
    'DRY CLEAN': '#ec4899'
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.65)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(8px)',
      padding: '16px'
    }}>
      <div style={{
        background: '#1f2937',
        borderRadius: '16px',
        width: '95%',
        maxWidth: '740px',
        maxHeight: '88vh',
        color: '#f9fafb',
        boxShadow: '0 20px 48px rgba(0,0,0,0.6)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(255, 255, 255, 0.03)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #7c3aed, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '18px', boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)'
            }}>
              <i className="fas fa-tasks" style={{ color: '#fff' }}></i>
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: '#f9fafb' }}>
                Item List Manager
              </h2>
              <p style={{ margin: '2px 0 0 0', opacity: 0.8, fontSize: '12px', color: '#9ca3af' }}>
                Edit and manage your order items
              </p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              background: 'rgba(124, 58, 237, 0.15)',
              color: '#a78bfa',
              padding: '6px 14px',
              borderRadius: '20px',
              border: '1px solid rgba(124, 58, 237, 0.3)',
              fontSize: '12px',
              fontWeight: '600'
            }}>
              {orderItems.length} {orderItems.length === 1 ? 'Item' : 'Items'} ({orderItems.reduce((sum, item) => {
                const pcsMatch = item.name.match(/\((\d+)\s*pcs\)/i);
                if (pcsMatch) return sum + parseInt(pcsMatch[1], 10);
                const kgMatch = item.name.match(/\((\d+\.?\d*)\s*kg/i);
                return sum + (kgMatch ? 0 : item.quantity);
              }, 0)} Pcs)
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.06)',
                border: 'none',
                borderRadius: '8px',
                width: '36px',
                height: '36px',
                color: '#9ca3af',
                fontSize: '18px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s ease'
              }}
              onMouseOver={(e) => {
                (e.target as HTMLElement).style.background = 'rgba(239, 68, 68, 0.15)';
                (e.target as HTMLElement).style.color = '#f87171';
              }}
              onMouseOut={(e) => {
                (e.target as HTMLElement).style.background = 'rgba(255, 255, 255, 0.06)';
                (e.target as HTMLElement).style.color = '#9ca3af';
              }}
            >
              ×
            </button>
          </div>
        </div>
 
        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {orderItems.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              color: '#6b7280'
            }}>
              <div style={{ fontSize: '40px', marginBottom: '12px', opacity: 0.4 }}>📋</div>
              <h3 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: '600', color: '#9ca3af' }}>No Items to Manage</h3>
              <p style={{ margin: 0, fontSize: '13px' }}>
                Add items to your order to manage them here
              </p>
            </div>
          ) : (
            <div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px'
              }}>
                <h3 style={{ margin: 0, fontSize: '15px', color: '#e5e7eb', fontWeight: '600' }}>
                  Current Items list
                </h3>
                <button
                  onClick={handleClearAll}
                  style={{
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    color: '#f87171',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                  onMouseOver={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(239, 68, 68, 0.18)'; }}
                  onMouseOut={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(239, 68, 68, 0.08)'; }}
                >
                  <i className="fas fa-trash-alt"></i> Clear All
                </button>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {orderItems.map((item) => {
                  const typeColor = serviceTypeColors[item.washType] || '#10b981';
                  return (
                    <div key={item.id} style={{
                      background: 'rgba(255, 255, 255, 0.02)',
                      borderRadius: '12px',
                      padding: '16px 20px',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      transition: 'border-color 0.15s ease'
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)'; }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ 
                            color: '#f9fafb', 
                            fontWeight: '600', 
                            fontSize: '15px', 
                            marginBottom: '6px'
                          }}>
                            {item.name}
                          </div>
                          <div style={{ 
                            fontSize: '12px', 
                            color: '#9ca3af',
                            display: 'flex',
                            gap: '16px',
                            alignItems: 'center'
                          }}>
                            <span style={{ 
                              background: `${typeColor}15`,
                              color: typeColor,
                              padding: '2px 8px',
                              borderRadius: '5px',
                              fontSize: '11px',
                              fontWeight: '600',
                              border: `1px solid ${typeColor}30`
                            }}>
                              {item.washType}
                            </span>
                            <span>Qty: <strong style={{ color: '#fff' }}>{item.quantity}</strong></span>
                            <span>Rate: <strong style={{ color: '#fff' }}>₹{item.price}</strong></span>
                            <span style={{ color: '#10b981', fontWeight: 'bold' }}>
                              Total: ₹{item.total}
                            </span>
                          </div>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <button
                            onClick={() => handleEditItem(item)}
                            style={{
                              background: 'rgba(59, 130, 246, 0.08)',
                              border: '1px solid rgba(59, 130, 246, 0.25)',
                              borderRadius: '8px',
                              padding: '6px 12px',
                              color: '#60a5fa',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: '600',
                              transition: 'all 0.15s ease',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.18)'; }}
                            onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(59, 130, 246, 0.08)'; }}
                          >
                            <i className="fas fa-edit"></i> Edit
                          </button>
                          
                          <button
                            onClick={() => handleDuplicateItem(item)}
                            style={{
                              background: 'rgba(245, 158, 11, 0.08)',
                              border: '1px solid rgba(245, 158, 11, 0.25)',
                              borderRadius: '8px',
                              padding: '6px 12px',
                              color: '#fbbf24',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: '600',
                              transition: 'all 0.15s ease',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(245, 158, 11, 0.18)'; }}
                            onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(245, 158, 11, 0.08)'; }}
                          >
                            <i className="fas fa-copy"></i> Copy
                          </button>
                          
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            style={{
                              background: 'rgba(239, 68, 68, 0.08)',
                              border: '1px solid rgba(239, 68, 68, 0.25)',
                              borderRadius: '8px',
                              padding: '6px 12px',
                              color: '#f87171',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: '600',
                              transition: 'all 0.15s ease',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.18)'; }}
                            onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)'; }}
                          >
                            <i className="fas fa-trash-alt"></i> Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
 
        {/* Edit Modal */}
        {editingItem && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 10,
            backdropFilter: 'blur(4px)'
          }}>
            <div style={{
              background: '#1f2937',
              borderRadius: '16px',
              padding: '24px 28px',
              width: '90%',
              maxWidth: '400px',
              boxShadow: '0 20px 48px rgba(0, 0, 0, 0.6)',
              border: '1px solid rgba(255, 255, 255, 0.08)'
            }}>
              <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '700', color: '#f9fafb' }}>
                <i className="fas fa-edit" style={{ color: '#0ea5e9', marginRight: '8px' }}></i> Edit Item
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '500', color: '#9ca3af' }}>
                    Item Name
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.1)', fontSize: '14px',
                      background: 'rgba(9,9,11,0.6)', color: '#fff', fontWeight: '500',
                      outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s ease'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#0ea5e9'}
                    onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                  />
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '500', color: '#9ca3af' }}>
                      Quantity
                    </label>
                    <input
                      type="number"
                      value={editForm.quantity}
                      onChange={(e) => setEditForm({ ...editForm, quantity: parseInt(e.target.value) || 1 })}
                      min="1"
                      style={{
                        width: '100%', padding: '10px 12px', borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.1)', fontSize: '14px',
                        background: 'rgba(9,9,11,0.6)', color: '#fff', fontWeight: '600',
                        outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s ease',
                        textAlign: 'center'
                      }}
                      onFocus={(e) => { e.target.style.borderColor = '#0ea5e9'; e.target.select(); }}
                      onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                    />
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '500', color: '#9ca3af' }}>
                      Price (₹)
                    </label>
                    <input
                      type="number"
                      value={editForm.price}
                      onChange={(e) => setEditForm({ ...editForm, price: parseFloat(e.target.value) || 0 })}
                      min="0"
                      step="0.01"
                      style={{
                        width: '100%', padding: '10px 12px', borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.1)', fontSize: '14px',
                        background: 'rgba(9,9,11,0.6)', color: '#fff', fontWeight: '600',
                        outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.15s ease',
                        textAlign: 'center'
                      }}
                      onFocus={(e) => { e.target.style.borderColor = '#0ea5e9'; e.target.select(); }}
                      onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                    />
                  </div>
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '12px', fontWeight: '500', color: '#9ca3af' }}>
                    Wash Type
                  </label>
                  <select
                    value={editForm.washType}
                    onChange={(e) => setEditForm({ ...editForm, washType: e.target.value as any })}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.1)', fontSize: '14px',
                      background: 'rgba(9,9,11,0.6)', color: '#fff', fontWeight: '500',
                      outline: 'none', boxSizing: 'border-box', cursor: 'pointer',
                      transition: 'border-color 0.15s ease'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#0ea5e9'}
                    onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                  >
                    <option value="WASH">🧺 WASH</option>
                    <option value="IRON">🔥 IRON</option>
                    <option value="WASH+IRON">🧺🔥 WASH+IRON</option>
                    <option value="DRY CLEAN">✨ DRY CLEAN</option>
                  </select>
                </div>
                
                <div style={{
                  background: 'rgba(16, 185, 129, 0.06)',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(16, 185, 129, 0.2)',
                  textAlign: 'center',
                  marginTop: '6px'
                }}>
                  <div style={{ fontSize: '11px', color: '#a7f3d0', marginBottom: '4px', fontWeight: '500' }}>
                    Total Amount
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: '#10b981' }}>
                    ₹{(editForm.price * editForm.quantity).toFixed(2)}
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button
                  onClick={handleSaveEdit}
                  style={{
                    flex: 1, padding: '10px 16px', borderRadius: '8px', border: 'none',
                    background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)',
                    color: '#fff', fontSize: '14px', fontWeight: '600', cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(14, 165, 233, 0.3)', transition: 'all 0.2s ease'
                  }}
                  onMouseOver={(e) => { (e.target as HTMLElement).style.transform = 'translateY(-1px)'; }}
                  onMouseOut={(e) => { (e.target as HTMLElement).style.transform = 'translateY(0)'; }}
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setEditingItem(null)}
                  style={{
                    flex: 1, padding: '10px 16px', borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.1)',
                    background: 'rgba(255,255,255,0.03)', color: '#9ca3af',
                    fontSize: '14px', fontWeight: '600', cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
 
export default ItemListManager;