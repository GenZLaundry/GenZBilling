// TYPE DEFINITIONS FOR LAUNDRY POS SYSTEM
// TSC TL240 + SP POS891US Bill & Tag Printing Software

// Web Serial API types (for TypeScript compatibility)
declare global {
  interface Navigator {
    serial: Serial;
  }
  
  interface Serial {
    requestPort(options?: SerialPortRequestOptions): Promise<SerialPort>;
    getPorts(): Promise<SerialPort[]>;
  }
  
  interface SerialPortRequestOptions {
    filters?: SerialPortFilter[];
  }
  
  interface SerialPortFilter {
    usbVendorId?: number;
    usbProductId?: number;
  }
  
  interface SerialPort {
    open(options: SerialOptions): Promise<void>;
    close(): Promise<void>;
    readable: ReadableStream<Uint8Array> | null;
    writable: WritableStream<Uint8Array> | null;
  }
  
  interface SerialOptions {
    baudRate: number;
    dataBits?: 7 | 8;
    stopBits?: 1 | 2;
    parity?: 'none' | 'even' | 'odd';
    bufferSize?: number;
    flowControl?: 'none' | 'hardware';
  }
}

// Laundry business types
export interface LaundryItem {
  id: string;
  name: string;
  price: number;
  category?: string;
}

export interface OrderItem extends LaundryItem {
  quantity: number;
}

export interface Order {
  id: string;
  customerName: string;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  total: number;
  createdAt: Date;
}

export interface ShopConfig {
  shopName: string;
  address: string;
  contact: string;
  gstNumber?: string;
}

export interface PendingBill extends BillData {
  id: string;
  status: 'pending' | 'completed' | 'delivered';
  createdAt: string;
  deliveredAt?: string;
}

// Printer-specific types
export interface PrinterStatus {
  connected: boolean;
  name: string;
  status: 'READY' | 'DISCONNECTED' | 'ERROR' | 'BUSY';
}

export interface BillData {
  businessName: string;
  address: string;
  phone: string;
  billNumber: string;
  customerName: string;
  customerPhone?: string;
  items: Array<{
    name: string;
    quantity: number;
    rate: number;
    amount: number;
  }>;
  previousBills?: Array<{
    billNumber: string;
    items: Array<{
      name: string;
      quantity: number;
      rate: number;
      amount: number;
    }>;
    total: number;
  }>;
  subtotal: number;
  discount?: number;
  gst?: number;
  deliveryCharge?: number;
  previousBalance?: number;
  grandTotal: number;
  thankYouMessage?: string;
  status?: 'pending' | 'completed' | 'delivered';
  createdAt?: string;
  deliveredAt?: string;
}

export interface LaundryTag {
  laundryName: string;
  billNumber: string;
  customerName: string;
  customerPhone?: string;
  itemName: string;
  washType?: 'DRY CLEAN' | 'WASH' | 'IRON' | 'WASH+IRON';
  barcode?: string;
  qrCode?: string;
  tagIndex?: number;
  totalTags?: number;
}

// Storage keys
export const STORAGE_KEYS = {
  ORDER_COUNT: 'laundry_order_count',
  SAVED_ITEMS: 'laundry_saved_items',
  SHOP_CONFIG: 'laundry_shop_config',
  PRINTER_SETTINGS: 'laundry_printer_settings'
} as const;

// Default laundry items
export const DEFAULT_ITEMS: LaundryItem[] = [
  { id: '1', name: 'Shirt (Cotton)', price: 50 },
  { id: '2', name: 'Shirt (Formal)', price: 60 },
  { id: '3', name: 'T-Shirt', price: 40 },
  { id: '4', name: 'Pant (Casual)', price: 70 },
  { id: '5', name: 'Pant (Formal)', price: 80 },
  { id: '6', name: 'Jeans', price: 75 },
  { id: '7', name: 'Saree (Cotton)', price: 150 },
  { id: '8', name: 'Saree (Silk)', price: 200 },
  { id: '9', name: 'Dress (Casual)', price: 90 },
  { id: '10', name: 'Dress (Party)', price: 120 },
  { id: '11', name: 'Jacket', price: 100 },
  { id: '12', name: 'Blazer', price: 150 },
  { id: '13', name: 'Kurta', price: 80 },
  { id: '14', name: 'Dupatta', price: 30 },
  { id: '15', name: 'Bedsheet', price: 100 }
];

export default {
  STORAGE_KEYS,
  DEFAULT_ITEMS
};