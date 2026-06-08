import apiService from './api';

export const syncOfflineBills = async (): Promise<{ success: boolean; syncedCount: number }> => {
  try {
    const localRaw = localStorage.getItem('laundry_bill_history');
    if (!localRaw) return { success: true, syncedCount: 0 };
    
    const localBills: any[] = JSON.parse(localRaw);
    if (!Array.isArray(localBills) || localBills.length === 0) {
      return { success: true, syncedCount: 0 };
    }

    // Find all unsynced bills
    // A bill is unsynced if:
    // 1. _syncedToDb is false
    // 2. Its _id or id starts with "local_"
    // 3. It has _dirty set to true (meaning it was updated offline)
    const unsyncedBills = localBills.filter((b: any) => 
      b._syncedToDb === false || 
      (b._id && b._id.toString().startsWith('local_')) ||
      (b.id && b.id.toString().startsWith('local_')) ||
      b._dirty === true
    );

    if (unsyncedBills.length === 0) {
      return { success: true, syncedCount: 0 };
    }

    console.log(`🔄 [SyncService] Found ${unsyncedBills.length} unsynced/modified bills. Syncing...`);
    let syncedCount = 0;
    const updatedLocalBills = [...localBills];
    
    // Also load laundry_pending_bills to update them in tandem
    const pendingRaw = localStorage.getItem('laundry_pending_bills');
    const localPending: any[] = pendingRaw ? JSON.parse(pendingRaw) : [];
    let pendingUpdated = false;
    let updatedLocalPending = [...localPending];

    for (const bill of unsyncedBills) {
      try {
        const isNewBill = !bill._id || bill._id.toString().startsWith('local_');
        
        // Strip client-only fields to avoid Mongoose CastErrors
        const { id, _id, _syncedToDb, _dirty, ...cleanBillData } = bill;

        let res;
        if (isNewBill) {
          console.log(`💾 [SyncService] Syncing new offline bill: ${bill.billNumber}`);
          res = await apiService.createBill(cleanBillData);
        } else {
          console.log(`📝 [SyncService] Syncing offline update for existing bill: ${bill.billNumber} (${bill._id})`);
          res = await apiService.updateBill(bill._id, cleanBillData);
        }

        if (res.success) {
          const serverBill = res.data;
          const serverId = serverBill?._id || serverBill?.id || bill._id;
          
          console.log(`✅ [SyncService] Successfully synced bill: ${bill.billNumber} to DB.`);
          syncedCount++;

          // Update laundry_bill_history record
          const idx = updatedLocalBills.findIndex((b: any) => b.billNumber === bill.billNumber);
          if (idx !== -1) {
            updatedLocalBills[idx] = {
              ...updatedLocalBills[idx],
              ...serverBill,
              _syncedToDb: true,
              _id: serverId,
              id: serverId
            };
            // Remove any client-only temporary flags
            delete updatedLocalBills[idx]._dirty;
          }

          // Update laundry_pending_bills record if it exists
          const pIdx = updatedLocalPending.findIndex((b: any) => b.billNumber === bill.billNumber);
          if (pIdx !== -1) {
            if (serverBill.status === 'completed' || serverBill.status === 'delivered') {
              // Remove from pending list if completed/delivered
              updatedLocalPending.splice(pIdx, 1);
            } else {
              // Update in pending list
              updatedLocalPending[pIdx] = {
                ...updatedLocalPending[pIdx],
                ...serverBill,
                _id: serverId,
                id: serverId
              };
            }
            pendingUpdated = true;
          }
        }
      } catch (err) {
        console.warn(`⚠️ [SyncService] Sync failed for bill ${bill.billNumber}:`, err);
      }
    }

    if (syncedCount > 0) {
      localStorage.setItem('laundry_bill_history', JSON.stringify(updatedLocalBills));
      if (pendingUpdated) {
        localStorage.setItem('laundry_pending_bills', JSON.stringify(updatedLocalPending));
      }
    }

    // Automatically sync offline tags as well
    await syncOfflineTags().catch(err => console.error('❌ [SyncService] Tag sync error:', err));

    return { success: true, syncedCount };
  } catch (error) {
    console.error('❌ [SyncService] Critical error during sync:', error);
    return { success: false, syncedCount: 0 };
  }
};

export const syncOfflineTags = async (): Promise<{ success: boolean; syncedCount: number }> => {
  try {
    const localRaw = localStorage.getItem('laundry_unsynced_tags');
    if (!localRaw) return { success: true, syncedCount: 0 };
    
    const unsyncedGroups: any[] = JSON.parse(localRaw);
    if (!Array.isArray(unsyncedGroups) || unsyncedGroups.length === 0) {
      return { success: true, syncedCount: 0 };
    }

    console.log(`🔄 [SyncService] Found ${unsyncedGroups.length} unsynced tag groups. Syncing...`);
    let syncedCount = 0;
    const remainingGroups = [];

    for (const group of unsyncedGroups) {
      try {
        const res = await apiService.post('/tag-history', { tags: group.tags });
        if (res.success) {
          console.log(`✅ [SyncService] Successfully synced ${group.tags.length} tags for bill ${group.tags[0]?.billNumber}`);
          syncedCount++;
        } else {
          remainingGroups.push(group);
        }
      } catch (err) {
        console.warn(`⚠️ [SyncService] Sync failed for tag group:`, err);
        remainingGroups.push(group);
      }
    }

    if (remainingGroups.length > 0) {
      localStorage.setItem('laundry_unsynced_tags', JSON.stringify(remainingGroups));
    } else {
      localStorage.removeItem('laundry_unsynced_tags');
    }

    return { success: true, syncedCount };
  } catch (error) {
    console.error('❌ [SyncService] Critical error during tag sync:', error);
    return { success: false, syncedCount: 0 };
  }
};
