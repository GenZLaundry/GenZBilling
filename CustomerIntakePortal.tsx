import React, { useState, useEffect } from 'react';
import { useAlert } from './GlobalAlert';
import apiService from './api';

interface CustomerIntakePortalProps {
  onBackToLogin?: () => void;
}

interface RequestItem {
  itemName: string;
  serviceType: 'WASH' | 'IRON' | 'WASH+IRON' | 'DRY CLEAN';
  quantity: number;
  unit: 'pcs' | 'kg';
}

const COMMON_ITEMS = [
  'Shirt', 'T-Shirt', 'Jeans', 'Pant / Trouser', 'Kurta', 'Pyjama', 
  'Jacket (Heavy)', 'Jacket (Light)', 'Sweater', 'Blanket (Single)', 
  'Blanket (Double Bed)', 'Saree', 'Suit', 'Dress Pieces', 'Other'
];

const CustomerIntakePortal: React.FC<CustomerIntakePortalProps> = ({ onBackToLogin }) => {
  const { showAlert } = useAlert();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form States
  const [customerName, setCustomerName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [pickupDate, setPickupDate] = useState(new Date().toISOString().split('T')[0]);
  const [pickupTime, setPickupTime] = useState('10:00');
  const [remark, setRemark] = useState('');

  // Item Selector States
  const [selectedItemName, setSelectedItemName] = useState('Shirt');
  const [customItemName, setCustomItemName] = useState('');
  const [serviceType, setServiceType] = useState<'WASH' | 'IRON' | 'WASH+IRON' | 'DRY CLEAN'>('WASH');
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState<'pcs' | 'kg'>('pcs');
  const [items, setItems] = useState<RequestItem[]>([]);

  // Submission Status
  const [submittedRequest, setSubmittedRequest] = useState<any>(null);

  // Auto-fill time slots based on selection
  const timeSlots = [
    '09:00 - 12:00 (Morning)',
    '12:00 - 16:00 (Afternoon)',
    '16:00 - 20:00 (Evening)'
  ];
  const [timeSlot, setTimeSlot] = useState(timeSlots[0]);

  // Sync custom item field
  useEffect(() => {
    if (selectedItemName !== 'Other') {
      setCustomItemName('');
    }
  }, [selectedItemName]);

  const handleAddItem = () => {
    const finalItemName = selectedItemName === 'Other' ? customItemName.trim() : selectedItemName;
    if (!finalItemName) {
      showAlert({ message: 'Please specify the item name', type: 'warning' });
      return;
    }
    if (quantity <= 0) {
      showAlert({ message: 'Quantity must be greater than 0', type: 'warning' });
      return;
    }

    const newItem: RequestItem = {
      itemName: finalItemName,
      serviceType,
      quantity,
      unit
    };

    setItems([...items, newItem]);
    
    // Reset item input states
    setSelectedItemName('Shirt');
    setCustomItemName('');
    setServiceType('WASH');
    setQuantity(1);
    setUnit('pcs');
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!customerName.trim()) {
      showAlert({ message: 'Full Name is required', type: 'warning' });
      return;
    }
    if (!phone.trim() || phone.trim().length < 10) {
      showAlert({ message: 'Please enter a valid 10-digit phone number', type: 'warning' });
      return;
    }
    if (items.length === 0) {
      showAlert({ message: 'Please add at least one item to your request', type: 'warning' });
      return;
    }

    setLoading(true);
    try {
      const payload = {
        customerName: customerName.trim(),
        customerPhone: phone.trim(),
        address: address.trim(),
        pickupDate,
        pickupTime: timeSlot,
        items,
        remark: remark.trim()
      };

      const response = await apiService.createCustomerRequest(payload);
      if (response.success) {
        setSubmittedRequest(response.data);
        setStep(4); // Success Step
        showAlert({ message: 'Your intake request has been submitted!', type: 'success' });
      } else {
        showAlert({ message: response.message || 'Submission failed', type: 'error' });
      }
    } catch (error: any) {
      showAlert({ message: error.message || 'An error occurred while submitting', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSendWhatsApp = () => {
    if (!submittedRequest) return;
    const WHATSAPP_NUMBER = '918233853727'; // Shop number

    let msg = `*🧺 NEW LAUNDRY INTAKE REQUEST*\n`;
    msg += `*Request No:* ${submittedRequest.requestNumber}\n`;
    msg += `*Name:* ${submittedRequest.customerName}\n`;
    msg += `*Phone:* ${submittedRequest.customerPhone}\n`;
    if (submittedRequest.address) msg += `*Address:* ${submittedRequest.address}\n`;
    msg += `*Pickup:* ${submittedRequest.pickupDate} (${submittedRequest.pickupTime})\n`;
    msg += `\n*Items List:*\n`;
    
    submittedRequest.items.forEach((item: any, idx: number) => {
      msg += `  ${idx + 1}. ${item.itemName ? item.itemName + ' · ' : ''}${item.serviceType}: ${item.quantity} ${item.unit}\n`;
    });

    if (submittedRequest.remark) {
      msg += `\n*Note:* ${submittedRequest.remark}\n`;
    }

    msg += `\n_Please confirm my pickup request._`;

    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
    window.open(whatsappUrl, '_blank');
  };

  const nextStep = () => {
    if (step === 1) {
      if (!customerName.trim() || !phone.trim() || phone.trim().length < 10) {
        showAlert({ message: 'Name and a valid 10-digit phone number are required', type: 'warning' });
        return;
      }
    }
    setStep(step + 1);
  };

  const prevStep = () => {
    setStep(step - 1);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'radial-gradient(circle at top, #1e293b, #0f172a)',
      color: '#f8fafc',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '24px 16px',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      boxSizing: 'border-box'
    }}>
      {/* Header card */}
      <div style={{
        width: '100%',
        maxWidth: '640px',
        textAlign: 'center',
        marginBottom: '24px'
      }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '56px',
          height: '56px',
          borderRadius: '16px',
          background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)',
          fontSize: '26px',
          boxShadow: '0 8px 24px rgba(14, 165, 233, 0.4)',
          marginBottom: '14px'
        }}>🧺</div>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '800', letterSpacing: '-0.5px' }}>
          Gen-Z Laundry & Dry Cleaners
        </h1>
        <p style={{ margin: '6px 0 0', fontSize: '14px', color: '#94a3b8' }}>
          Customer Intake Booking Portal
        </p>
      </div>

      {/* Main card panel */}
      <div style={{
        width: '100%',
        maxWidth: '640px',
        background: 'rgba(30, 41, 59, 0.75)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '24px',
        padding: '28px',
        boxSizing: 'border-box',
        boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
      }}>
        
        {/* Step Indicator */}
        {step < 4 && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '32px',
            position: 'relative'
          }}>
            <div style={{
              position: 'absolute',
              top: '14px',
              left: '20px',
              right: '20px',
              height: '2px',
              background: 'rgba(255,255,255,0.06)',
              zIndex: 1
            }}>
              <div style={{
                height: '100%',
                background: 'linear-gradient(90deg, #0ea5e9, #06b6d4)',
                width: step === 1 ? '0%' : step === 2 ? '50%' : '100%',
                transition: 'width 0.3s ease'
              }} />
            </div>
            
            {[1, 2, 3].map((s) => {
              const active = step >= s;
              const current = step === s;
              return (
                <div key={s} style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  zIndex: 2,
                  width: '60px'
                }}>
                  <div style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    background: current ? '#0ea5e9' : active ? '#0f172a' : '#1e293b',
                    border: active ? '2px solid #0ea5e9' : '2px solid rgba(255,255,255,0.15)',
                    color: active ? '#fff' : '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '13px',
                    fontWeight: 'bold',
                    boxShadow: current ? '0 0 15px rgba(14, 165, 233, 0.5)' : 'none',
                    transition: 'all 0.3s ease'
                  }}>
                    {s}
                  </div>
                  <span style={{
                    fontSize: '11px',
                    color: current ? '#0ea5e9' : '#64748b',
                    fontWeight: current ? '600' : '400',
                    marginTop: '6px',
                    whiteSpace: 'nowrap'
                  }}>
                    {s === 1 ? 'Details' : s === 2 ? 'Items' : 'Confirm'}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Step 1: Customer Details */}
        {step === 1 && (
          <div>
            <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: '600' }}>👤 Customer & Pickup Details</h3>
            
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#94a3b8', marginBottom: '6px' }}>
                Full Name <span style={{ color: '#f43f5e' }}>*</span>
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Enter your full name"
                style={{
                  width: '100%', padding: '12px', borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15,23,42,0.6)',
                  color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#94a3b8', marginBottom: '6px' }}>
                Phone Number <span style={{ color: '#f43f5e' }}>*</span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="10-digit mobile number"
                maxLength={10}
                style={{
                  width: '100%', padding: '12px', borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15,23,42,0.6)',
                  color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '12px', marginBottom: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#94a3b8', marginBottom: '6px' }}>
                  Pickup Date <span style={{ color: '#f43f5e' }}>*</span>
                </label>
                <input
                  type="date"
                  value={pickupDate}
                  onChange={(e) => setPickupDate(e.target.value)}
                  style={{
                    width: '100%', padding: '12px', borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15,23,42,0.6)',
                    color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
                    colorScheme: 'dark'
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#94a3b8', marginBottom: '6px' }}>
                  Time Slot
                </label>
                <select
                  value={timeSlot}
                  onChange={(e) => setTimeSlot(e.target.value)}
                  style={{
                    width: '100%', padding: '12px', borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15,23,42,0.6)',
                    color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
                    cursor: 'pointer'
                  }}
                >
                  {timeSlots.map((s, idx) => (
                    <option key={idx} value={s}>{s.split(' ')[0]}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#94a3b8', marginBottom: '6px' }}>
                Pickup Address <span style={{ color: '#64748b' }}>(Optional for doorstep pickup)</span>
              </label>
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter complete pickup address if door-step collection is needed"
                rows={2}
                style={{
                  width: '100%', padding: '12px', borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15,23,42,0.6)',
                  color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
                  resize: 'vertical', fontFamily: 'inherit'
                }}
              />
            </div>

            <button
              onClick={nextStep}
              style={{
                width: '100%', padding: '14px', borderRadius: '12px', border: 'none',
                background: 'linear-gradient(135deg, #0ea5e9, #06b6d4)', color: '#fff',
                fontSize: '15px', fontWeight: '600', cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(14, 165, 233, 0.25)', transition: 'all 0.2s'
              }}
            >
              Continue to Items →
            </button>
          </div>
        )}

        {/* Step 2: Add Items */}
        {step === 2 && (
          <div>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>🧺 Add Items to Order</h3>
            
            {/* Item selector block */}
            <div style={{
              background: 'rgba(0,0,0,0.15)',
              borderRadius: '12px',
              padding: '16px',
              border: '1px solid rgba(255,255,255,0.04)',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Item Category</label>
                  <select
                    value={selectedItemName}
                    onChange={(e) => setSelectedItemName(e.target.value)}
                    style={{
                      width: '100%', padding: '10px', borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.08)', background: '#0f172a',
                      color: '#fff', fontSize: '13px', outline: 'none'
                    }}
                  >
                    {COMMON_ITEMS.map((item, idx) => (
                      <option key={idx} value={item}>{item}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Service Type</label>
                  <select
                    value={serviceType}
                    onChange={(e) => setServiceType(e.target.value as any)}
                    style={{
                      width: '100%', padding: '10px', borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.08)', background: '#0f172a',
                      color: '#fff', fontSize: '13px', outline: 'none'
                    }}
                  >
                    <option value="WASH">🧺 Wash</option>
                    <option value="IRON">🔥 Iron</option>
                    <option value="WASH+IRON">🧺🔥 Wash+Iron</option>
                    <option value="DRY CLEAN">✨ Dry Clean</option>
                  </select>
                </div>
              </div>

              {selectedItemName === 'Other' && (
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Specify Item Name</label>
                  <input
                    type="text"
                    value={customItemName}
                    onChange={(e) => setCustomItemName(e.target.value)}
                    placeholder="Enter item name (e.g. Silk Dupatta)"
                    style={{
                      width: '100%', padding: '10px', borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.08)', background: '#0f172a',
                      color: '#fff', fontSize: '13px', outline: 'none', boxSizing: 'border-box'
                    }}
                  />
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr auto', gap: '12px', alignItems: 'end' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Quantity</label>
                  <input
                    type="number"
                    min="1"
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                    style={{
                      width: '100%', padding: '10px', borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.08)', background: '#0f172a',
                      color: '#fff', fontSize: '13px', outline: 'none', boxSizing: 'border-box',
                      textAlign: 'center'
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>Unit</label>
                  <select
                    value={unit}
                    onChange={(e) => setUnit(e.target.value as any)}
                    style={{
                      width: '100%', padding: '10px', borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.08)', background: '#0f172a',
                      color: '#fff', fontSize: '13px', outline: 'none'
                    }}
                  >
                    <option value="pcs">pcs</option>
                    <option value="kg">kg</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={handleAddItem}
                  style={{
                    padding: '10px 18px', borderRadius: '8px', border: 'none',
                    background: 'rgba(14,165,233,0.2)', color: '#38bdf8',
                    fontSize: '13px', fontWeight: '600', cursor: 'pointer',
                    height: '38px', whiteSpace: 'nowrap'
                  }}
                >
                  + Add Item
                </button>
              </div>
            </div>

            {/* Cart list preview */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: '600', marginBottom: '10px' }}>
                Items List ({items.length})
              </div>
              {items.length === 0 ? (
                <div style={{
                  padding: '24px', textAlign: 'center', background: 'rgba(0,0,0,0.1)',
                  borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.08)',
                  color: '#64748b', fontSize: '13px'
                }}>
                  No items added yet. Choose a category and click "+ Add Item"
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
                  {items.map((item, idx) => (
                    <div key={idx} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.04)',
                      borderRadius: '8px', padding: '10px 14px', fontSize: '13px'
                    }}>
                      <div>
                        <span style={{ fontWeight: '600', color: '#0ea5e9', marginRight: '6px' }}>#{idx+1}</span>
                        <span style={{ color: '#fff', fontWeight: '500' }}>{item.itemName}</span>
                        <span style={{ margin: '0 8px', color: 'rgba(255,255,255,0.15)' }}>|</span>
                        <span style={{ color: '#cbd5e1' }}>{item.serviceType}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <span style={{ color: '#94a3b8', fontWeight: '600' }}>{item.quantity} {item.unit}</span>
                        <button
                          onClick={() => handleRemoveItem(idx)}
                          style={{
                            background: 'transparent', border: 'none', color: '#f87171',
                            cursor: 'pointer', fontSize: '14px', padding: '0 4px'
                          }}
                        >✕</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Nav buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={prevStep}
                style={{
                  flex: 0.8, padding: '14px', borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.1)', background: 'transparent',
                  color: '#94a3b8', fontSize: '15px', fontWeight: '600', cursor: 'pointer'
                }}
              >
                ← Back
              </button>
              <button
                onClick={nextStep}
                disabled={items.length === 0}
                style={{
                  flex: 1.2, padding: '14px', borderRadius: '12px', border: 'none',
                  background: items.length === 0 ? 'rgba(255,255,255,0.06)' : 'linear-gradient(135deg, #0ea5e9, #06b6d4)',
                  color: items.length === 0 ? '#64748b' : '#fff',
                  fontSize: '15px', fontWeight: '600', cursor: items.length === 0 ? 'not-allowed' : 'pointer',
                  boxShadow: items.length === 0 ? 'none' : '0 4px 12px rgba(14, 165, 233, 0.25)',
                  transition: 'all 0.2s'
                }}
              >
                Review Request →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Review & Confirm */}
        {step === 3 && (
          <div>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600' }}>🔍 Confirm Details</h3>
            
            {/* Info Summary */}
            <div style={{
              background: 'rgba(0,0,0,0.15)',
              borderRadius: '12px',
              padding: '16px',
              border: '1px solid rgba(255,255,255,0.04)',
              fontSize: '13px',
              lineHeight: '1.6',
              marginBottom: '16px'
            }}>
              <div><span style={{ color: '#94a3b8' }}>Name:</span> <strong style={{ color: '#fff' }}>{customerName}</strong></div>
              <div><span style={{ color: '#94a3b8' }}>Phone:</span> <strong style={{ color: '#fff' }}>{phone}</strong></div>
              {address && <div><span style={{ color: '#94a3b8' }}>Address:</span> <strong style={{ color: '#fff' }}>{address}</strong></div>}
              <div><span style={{ color: '#94a3b8' }}>Pickup Slot:</span> <strong style={{ color: '#fff' }}>{pickupDate} @ {timeSlot}</strong></div>
            </div>

            {/* Items Summary list */}
            <div style={{
              maxHeight: '160px',
              overflowY: 'auto',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '10px',
              padding: '8px',
              marginBottom: '20px'
            }}>
              {items.map((item, idx) => (
                <div key={idx} style={{
                  display: 'flex', justifyContent: 'space-between', padding: '8px 10px',
                  borderBottom: idx < items.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                  fontSize: '12px'
                }}>
                  <div>
                    <span style={{ color: '#0ea5e9', fontWeight: 'bold', marginRight: '6px' }}>#{idx+1}</span>
                    <span style={{ color: '#fff' }}>{item.itemName}</span>
                  </div>
                  <div style={{ color: '#94a3b8' }}>{item.serviceType} &middot; <strong style={{ color: '#fff' }}>{item.quantity} {item.unit}</strong></div>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '500', color: '#94a3b8', marginBottom: '6px' }}>
                Instructions / Remark <span style={{ color: '#64748b' }}>(Optional)</span>
              </label>
              <textarea
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder="Any special remarks (e.g. separate colors, hard stains)"
                rows={2}
                style={{
                  width: '100%', padding: '12px', borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(15,23,42,0.6)',
                  color: '#fff', fontSize: '14px', outline: 'none', boxSizing: 'border-box',
                  resize: 'vertical', fontFamily: 'inherit'
                }}
              />
            </div>

            {/* Nav buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={prevStep}
                disabled={loading}
                style={{
                  flex: 0.8, padding: '14px', borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.1)', background: 'transparent',
                  color: '#94a3b8', fontSize: '15px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer'
                }}
              >
                ← Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                style={{
                  flex: 1.2, padding: '14px', borderRadius: '12px', border: 'none',
                  background: 'linear-gradient(135deg, #10b981, #059669)', color: '#fff',
                  fontSize: '15px', fontWeight: '600', cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)', transition: 'all 0.2s'
                }}
              >
                {loading ? 'Submitting...' : 'Submit Booking ✓'}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Success Screen */}
        {step === 4 && submittedRequest && (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(16, 185, 129, 0.15)',
              border: '2px solid #10b981',
              color: '#10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '28px',
              margin: '0 auto 16px'
            }}>✓</div>
            
            <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '700', color: '#10b981' }}>Intake Request Submitted!</h3>
            <p style={{ margin: '8px 0 24px', fontSize: '13px', color: '#94a3b8', lineHeight: '1.5' }}>
              Thank you! Your booking request has been successfully recorded in our system.<br />
              Your request number is <strong style={{ color: '#fff', fontFamily: 'monospace' }}>{submittedRequest.requestNumber}</strong>.
            </p>

            <div style={{
              background: 'rgba(37, 211, 102, 0.08)',
              border: '1px solid rgba(37, 211, 102, 0.15)',
              borderRadius: '16px',
              padding: '18px',
              marginBottom: '28px',
              textAlign: 'left'
            }}>
              <h4 style={{ margin: '0 0 6px 0', fontSize: '13px', fontWeight: '600', color: '#25D366' }}>
                💬 Sync to WhatsApp (Recommended)
              </h4>
              <p style={{ margin: '0 0 14px 0', fontSize: '11px', color: '#94a3b8', lineHeight: '1.4' }}>
                Send a pre-formatted message directly to our laundry WhatsApp number to get instant verification and updates.
              </p>
              <button
                onClick={handleSendWhatsApp}
                style={{
                  width: '100%', padding: '12px', borderRadius: '10px', border: 'none',
                  background: '#25D366', color: '#fff', fontSize: '13px', fontWeight: '700',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: '8px', boxShadow: '0 4px 12px rgba(37, 211, 102, 0.3)'
                }}
              >
                <i className="fab fa-whatsapp" style={{ fontSize: '16px' }} /> Send Booking via WhatsApp
              </button>
            </div>

            <button
              onClick={() => {
                // Reset portal to step 1
                setStep(1);
                setItems([]);
                setCustomerName('');
                setPhone('');
                setAddress('');
                setRemark('');
                setSubmittedRequest(null);
              }}
              style={{
                width: '100%', padding: '12px', borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)',
                color: '#cbd5e1', fontSize: '13px', fontWeight: '600', cursor: 'pointer'
              }}
            >
              Book Another Order
            </button>
          </div>
        )}

      </div>

      {/* Back to Login link */}
      {onBackToLogin && (
        <button
          onClick={onBackToLogin}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#64748b',
            fontSize: '13px',
            marginTop: '20px',
            cursor: 'pointer',
            textDecoration: 'underline'
          }}
        >
          Go Back to Admin Console
        </button>
      )}
    </div>
  );
};

export default CustomerIntakePortal;
