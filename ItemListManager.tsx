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

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.85)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(10px)'
    }}>
      <div style={{
        background: 'linear-gradient(135deg, #2c3e50 0%, #34495e 100%)',
        borderRadius: '20px',
        width: '90%',
        maxWidth: '800px',
        maxHeight: '85%',
        color: 'white',
        boxShadow: '0 25px 50px rgba(0, 0, 0, 0.4)',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        
        {/* Header */}
        <div style={{
          padding: '25px 30px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #34495e, #2c3e50)'
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 'bold' }}>
              🛠️ Professional Item Manager
            </h2>
            <p style={{ margin: '5px 0 0 0', opacity: 0.8, fontSize: '14px' }}>
              Edit and manage your order items
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{
              background: 'rgba(46, 204, 113, 0.2)',
              padding: '8px 15px',
              borderRadius: '20px',
              border: '1px solid rgba(46, 204, 113, 0.4)',
              fontSize: '14px',
              fontWeight: 'bold'
            }}>
              {orderItems.length} Items
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                border: 'none',
                borderRadius: '50%',
                width: '40px',
                height: '40px',
                color: 'white',
                fontSize: '18px',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseOver={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.25)'}
              onMouseOut={(e) => e.target.style.background = 'rgba(255, 255, 255, 0.15)'}
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px 30px' }}>
          {orderItems.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: 'rgba(255, 255, 255, 0.6)'
            }}>
              <div style={{ fontSize: '80px', opacity: 0.4 }}>🛍️</div>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '20px' }}>No Items to Manage</h3>
              <p style={{ margin: 0, fontSize: '14px', opacity: 0.8 }}>
                Add items to your order to manage them here
              </p>
            </div>
          ) : (
            <div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px'
              }}>
                <h3 style={{ margin: 0, fontSize: '18px' }}>
                  Order Items ({orderItems.length})
                </h3>
                <button
                  onClick={handleClearAll}
                  style={{
                    background: 'linear-gradient(135deg, #e74c3c, #c0392b)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    color: 'white',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                  onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                >
                  🗑️ Clear All
                </button>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {orderItems.map((item) => (
                  <div key={item.id} style={{
                    background: 'rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    padding: '20px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    transition: 'all 0.3s ease'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ 
                          color: 'white', 
                          fontWeight: '700', 
                          fontSize: '16px', 
                          marginBottom: '8px'
                        }}>
                          {item.name}
                        </div>
                        <div style={{ 
                          fontSize: '14px', 
                          color: 'rgba(255, 255, 255, 0.7)',
                          display: 'flex',
                          gap: '20px',
                          alignItems: 'center',
                          marginBottom: '12px'
                        }}>
                          <span style={{ 
                            background: 'rgba(52, 152, 219, 0.2)',
                            padding: '4px 12px',
                            borderRadius: '6px',
                            fontSize: '12px',
                            fontWeight: '600',
                            border: '1px solid rgba(52, 152, 219, 0.4)'
                          }}>
                            {item.washType}
                          </span>
                          <span>Qty: <strong>{item.quantity}</strong></span>
                          <span>Rate: <strong>₹{item.price}</strong></span>
                          <span style={{ color: '#2ecc71', fontWeight: 'bold' }}>
                            Total: ₹{item.total}
                          </span>
                        </div>
                      </div>
                      
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button
                          onClick={() => handleEditItem(item)}
                          style={{
                            background: 'linear-gradient(135deg, #3498db, #2980b9)',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '8px 12px',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            transition: 'all 0.3s ease'
                          }}
                          onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                          onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                        >
                          ✏️ Edit
                        </button>
                        
                        <button
                          onClick={() => handleDuplicateItem(item)}
                          style={{
                            background: 'linear-gradient(135deg, #f39c12, #e67e22)',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '8px 12px',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            transition: 'all 0.3s ease'
                          }}
                          onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                          onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                        >
                          📋 Copy
                        </button>
                        
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          style={{
                            background: 'linear-gradient(135deg, #e74c3c, #c0392b)',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '8px 12px',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            transition: 'all 0.3s ease'
                          }}
                          onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                          onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                        >
                          🗑️ Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
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
            background: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 10
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #34495e, #2c3e50)',
              borderRadius: '15px',
              padding: '30px',
              width: '400px',
              boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5)',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <h3 style={{ margin: '0 0 20px 0', fontSize: '20px', fontWeight: 'bold' }}>
                ✏️ Edit Item
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold', color: '#bdc3c7' }}>
                    Item Name
                  </label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '2px solid rgba(255, 255, 255, 0.2)',
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: 'white',
                      fontSize: '14px',
                      outline: 'none',
                      transition: 'all 0.3s ease'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'rgba(52, 152, 219, 0.8)'}
                    onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)'}
                  />
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold', color: '#bdc3c7' }}>
                      Quantity
                    </label>
                    <input
                      type="number"
                      value={editForm.quantity}
                      onChange={(e) => setEditForm({ ...editForm, quantity: parseInt(e.target.value) || 1 })}
                      min="1"
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '8px',
                        border: '2px solid rgba(255, 255, 255, 0.2)',
                        background: 'rgba(255, 255, 255, 0.1)',
                        color: 'white',
                        fontSize: '14px',
                        outline: 'none',
                        transition: 'all 0.3s ease'
                      }}
                      onFocus={(e) => e.target.style.borderColor = 'rgba(52, 152, 219, 0.8)'}
                      onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)'}
                    />
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold', color: '#bdc3c7' }}>
                      Price (₹)
                    </label>
                    <input
                      type="number"
                      value={editForm.price}
                      onChange={(e) => setEditForm({ ...editForm, price: parseFloat(e.target.value) || 0 })}
                      min="0"
                      step="0.01"
                      style={{
                        width: '100%',
                        padding: '12px',
                        borderRadius: '8px',
                        border: '2px solid rgba(255, 255, 255, 0.2)',
                        background: 'rgba(255, 255, 255, 0.1)',
                        color: 'white',
                        fontSize: '14px',
                        outline: 'none',
                        transition: 'all 0.3s ease'
                      }}
                      onFocus={(e) => e.target.style.borderColor = 'rgba(52, 152, 219, 0.8)'}
                      onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)'}
                    />
                  </div>
                </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold', color: '#bdc3c7' }}>
                    Wash Type
                  </label>
                  <select
                    value={editForm.washType}
                    onChange={(e) => setEditForm({ ...editForm, washType: e.target.value as any })}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '2px solid rgba(255, 255, 255, 0.2)',
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: 'white',
                      fontSize: '14px',
                      outline: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'rgba(52, 152, 219, 0.8)'}
                    onBlur={(e) => e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)'}
                  >
                    <option value="WASH">🧺 WASH</option>
                    <option value="IRON">🔥 IRON</option>
                    <option value="WASH+IRON">🧺🔥 WASH+IRON</option>
                    <option value="DRY CLEAN">✨ DRY CLEAN</option>
                  </select>
                </div>
                
                <div style={{
                  background: 'rgba(46, 204, 113, 0.1)',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(46, 204, 113, 0.3)',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.8)', marginBottom: '4px' }}>
                    Total Amount
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#2ecc71' }}>
                    ₹{(editForm.price * editForm.quantity).toFixed(2)}
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '12px', marginTop: '25px' }}>
                <button
                  onClick={handleSaveEdit}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #27ae60, #2ecc71)',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={(e) => e.target.style.transform = 'translateY(-2px)'}
                  onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
                >
                  💾 Save Changes
                </button>
                <button
                  onClick={() => setEditingItem(null)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '8px',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    background: 'transparent',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                    e.target.style.transform = 'translateY(-2px)';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.background = 'transparent';
                    e.target.style.transform = 'translateY(0)';
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