import React, { useState, useMemo, useEffect } from 'react';
import { useAlert } from './GlobalAlert';

interface StaffMember {
  id: string;
  name: string;
  role: string;
  steps: number;
  phoneMinutes: number;
  ironedCount: number;
  washLoads: number;
  foldingScore: number; // 1-10
  vibeRating: number;   // 1-5
  scentSprinkles: number;
  deliveryRuns: number;
  customPoints?: number;
}

interface HustleLog {
  id: string;
  staffId: string;
  staffName: string;
  actionType: string;
  details: string;
  timestamp: string;
}

const StaffHustleTracker: React.FC = () => {
  const { showAlert, showConfirm } = useAlert();
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [logs, setLogs] = useState<HustleLog[]>([]);
  
  // Selection & Search
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal visibility states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);

  // Hire Form States
  const [addName, setAddName] = useState('');
  const [addRole, setAddRole] = useState('Ironing Speedrunner ⚡');
  const [addSteps, setAddSteps] = useState(0);
  const [addPhone, setAddPhone] = useState(0);
  const [addIroned, setAddIroned] = useState(0);
  const [addWashing, setAddWashing] = useState(0);
  const [addFolding, setAddFolding] = useState(7.0);
  const [addVibe, setAddVibe] = useState(4.5);
  const [addScent, setAddScent] = useState(0);
  const [addDelivery, setAddDelivery] = useState(0);
  const [addCustomPoints, setAddCustomPoints] = useState(0);

  // Log Form States
  const [logStaffId, setLogStaffId] = useState('');
  const [logActionType, setLogActionType] = useState('ironing');
  const [logAmount, setLogAmount] = useState<number>(5);
  const [customActionDesc, setCustomActionDesc] = useState('');

  // Edit Form States
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState('');
  const [editSteps, setEditSteps] = useState(0);
  const [editPhoneMinutes, setEditPhoneMinutes] = useState(0);
  const [editIronedCount, setEditIronedCount] = useState(0);
  const [editWashLoads, setEditWashLoads] = useState(0);
  const [editFoldingScore, setEditFoldingScore] = useState(0);
  const [editVibeRating, setEditVibeRating] = useState(0);
  const [editScentSprinkles, setEditScentSprinkles] = useState(0);
  const [editDeliveryRuns, setEditDeliveryRuns] = useState(0);
  const [editCustomPoints, setEditCustomPoints] = useState(0);

  // Load Initial Data (Starts completely empty as requested)
  useEffect(() => {
    const savedStaff = localStorage.getItem('laundry_staff');
    const savedLogs = localStorage.getItem('laundry_staff_logs');
    
    if (savedStaff) {
      setStaffList(JSON.parse(savedStaff));
    } else {
      setStaffList([]);
      localStorage.setItem('laundry_staff', JSON.stringify([]));
    }
    
    if (savedLogs) {
      setLogs(JSON.parse(savedLogs));
    } else {
      setLogs([]);
      localStorage.setItem('laundry_staff_logs', JSON.stringify([]));
    }
  }, []);

  // Save changes
  const saveToStorage = (updatedStaff: StaffMember[], updatedLogs: HustleLog[]) => {
    setStaffList(updatedStaff);
    setLogs(updatedLogs);
    localStorage.setItem('laundry_staff', JSON.stringify(updatedStaff));
    localStorage.setItem('laundry_staff_logs', JSON.stringify(updatedLogs));
  };

  // Auto-close modals on selection change
  useEffect(() => {
    setShowEditModal(false);
    setShowLogModal(false);
  }, [selectedStaffId]);

  // Seed Demo Squad
  const seedDemoSquad = () => {
    const defaultStaff: StaffMember[] = [
      { id: '1', name: 'Ishaan Singh', role: 'Ironing Speedrunner ⚡', steps: 8420, phoneMinutes: 12, ironedCount: 45, washLoads: 0, foldingScore: 8.5, vibeRating: 4.8, scentSprinkles: 15, deliveryRuns: 2, customPoints: 0 },
      { id: '2', name: 'Aarav Mehta', role: 'Folding Aesthetician ✨', steps: 6150, phoneMinutes: 28, ironedCount: 5, washLoads: 8, foldingScore: 9.6, vibeRating: 4.7, scentSprinkles: 24, deliveryRuns: 0, customPoints: 0 },
      { id: '3', name: 'Diya Sharma', role: 'Vibe Check Manager 💖', steps: 11050, phoneMinutes: 8, ironedCount: 12, washLoads: 4, foldingScore: 7.8, vibeRating: 4.9, scentSprinkles: 10, deliveryRuns: 8, customPoints: 0 }
    ];
    const defaultLogs: HustleLog[] = [
      { id: '1', staffId: '1', staffName: 'Ishaan Singh', actionType: 'ironing', details: 'Ironed 15 shirts in speedrun record time (10m) ⚡', timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString() },
      { id: '2', staffId: '3', staffName: 'Diya Sharma', actionType: 'delivery', details: 'Completed 3 high-priority delivery runs 🚀', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() },
      { id: '3', staffId: '2', staffName: 'Aarav Mehta', actionType: 'folding', details: 'Folded premium satin sheets with aesthetic score of 9.8 ✨', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString() }
    ];
    saveToStorage(defaultStaff, defaultLogs);
    showAlert({ message: 'Demo squad seeded successfully! 🚀', type: 'success' });
  };

  // Clear entire squad (fixed arguments to prevent blank-screen alert crashes)
  const clearAllStaff = () => {
    showConfirm(
      'Are you sure you want to remove ALL store staff from the roster?\nThis will clear all daily trackers.',
      () => {
        saveToStorage([], []);
        setSelectedStaffId(null);
        showAlert({ message: 'All staff removed. Roster cleared! 🧹', type: 'info' });
      }
    );
  };

  // Add staff with all stats input by Admin
  const handleAddStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!addName.trim()) {
      showAlert({ message: 'Please enter a name for the staff member.', type: 'error' });
      return;
    }

    const newStaff: StaffMember = {
      id: Date.now().toString(),
      name: addName.trim(),
      role: addRole.trim(),
      steps: Number(addSteps),
      phoneMinutes: Number(addPhone),
      ironedCount: Number(addIroned),
      washLoads: Number(addWashing),
      foldingScore: Number(addFolding),
      vibeRating: Number(addVibe),
      scentSprinkles: Number(addScent),
      deliveryRuns: Number(addDelivery),
      customPoints: Number(addCustomPoints)
    };

    const updatedStaff = [...staffList, newStaff];
    const newLog: HustleLog = {
      id: Date.now().toString() + '_log',
      staffId: newStaff.id,
      staffName: newStaff.name,
      actionType: 'system',
      details: `Hired & initial data added manually: specialty "${newStaff.role}" 🎉`,
      timestamp: new Date().toISOString()
    };

    saveToStorage(updatedStaff, [newLog, ...logs]);
    
    // Reset Form
    setAddName('');
    setAddRole('Ironing Speedrunner ⚡');
    setAddSteps(0);
    setAddPhone(0);
    setAddIroned(0);
    setAddWashing(0);
    setAddFolding(7.0);
    setAddVibe(4.5);
    setAddScent(0);
    setAddDelivery(0);
    setAddCustomPoints(0);
    
    setShowAddModal(false);
    setSelectedStaffId(newStaff.id);
    showAlert({ message: `${newStaff.name} registered on roster successfully! 📈`, type: 'success' });
  };

  // Edit / Override Stats handler
  const startEditing = (s: StaffMember) => {
    setEditName(s.name);
    setEditRole(s.role);
    setEditSteps(s.steps);
    setEditPhoneMinutes(s.phoneMinutes);
    setEditIronedCount(s.ironedCount);
    setEditWashLoads(s.washLoads);
    setEditFoldingScore(s.foldingScore);
    setEditVibeRating(s.vibeRating);
    setEditScentSprinkles(s.scentSprinkles);
    setEditDeliveryRuns(s.deliveryRuns);
    setEditCustomPoints(s.customPoints || 0);
    setShowEditModal(true);
  };

  const handleSaveEditedStats = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffId) return;
    if (!editName.trim()) {
      showAlert({ message: 'Name cannot be empty.', type: 'error' });
      return;
    }

    const updatedStaff = staffList.map(s => {
      if (s.id !== selectedStaffId) return s;
      return {
        ...s,
        name: editName.trim(),
        role: editRole.trim(),
        steps: Number(editSteps),
        phoneMinutes: Number(editPhoneMinutes),
        ironedCount: Number(editIronedCount),
        washLoads: Number(editWashLoads),
        foldingScore: Number(editFoldingScore),
        vibeRating: Number(editVibeRating),
        scentSprinkles: Number(editScentSprinkles),
        deliveryRuns: Number(editDeliveryRuns),
        customPoints: Number(editCustomPoints)
      };
    });

    const newLog: HustleLog = {
      id: Date.now().toString(),
      staffId: selectedStaffId,
      staffName: editName.trim(),
      actionType: 'system',
      details: `Stats modified manually by Admin ⚙️`,
      timestamp: new Date().toISOString()
    };

    saveToStorage(updatedStaff, [newLog, ...logs]);
    setShowEditModal(false);
    showAlert({ message: `Hustle stats modified for ${editName.trim()}!`, type: 'success' });
  };

  // Quick Action Logger handler
  const startLoggingAction = (s: StaffMember) => {
    setLogStaffId(s.id);
    setLogActionType('ironing');
    setLogAmount(5);
    setCustomActionDesc('');
    setShowLogModal(true);
  };

  const handleLogAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!logStaffId) return;

    if (logActionType === 'custom' && !customActionDesc.trim()) {
      showAlert({ message: 'Please enter a custom activity description.', type: 'error' });
      return;
    }

    const staff = staffList.find(s => s.id === logStaffId);
    if (!staff) return;

    const updatedStaff = staffList.map(s => {
      if (s.id !== logStaffId) return s;
      const copy = { ...s };
      switch (logActionType) {
        case 'steps': copy.steps += logAmount; break;
        case 'phone': copy.phoneMinutes += logAmount; break;
        case 'ironing': copy.ironedCount += logAmount; break;
        case 'washing': copy.washLoads += logAmount; break;
        case 'scent': copy.scentSprinkles += logAmount; break;
        case 'delivery': copy.deliveryRuns += logAmount; break;
        case 'folding':
          copy.foldingScore = Math.min(10, Math.max(1, Math.round(((copy.foldingScore + logAmount) / 2) * 10) / 10));
          break;
        case 'vibe':
          copy.vibeRating = Math.min(5, Math.max(1, Math.round(((copy.vibeRating + logAmount) / 2) * 10) / 10));
          break;
        case 'custom':
          copy.customPoints = (copy.customPoints || 0) + logAmount;
          break;
      }
      return copy;
    });

    let actionDesc = '';
    if (logActionType === 'custom') {
      actionDesc = `${customActionDesc.trim()} (${logAmount >= 0 ? '+' : ''}${logAmount} pts) 🎯`;
    } else {
      switch (logActionType) {
        case 'steps': actionDesc = `Tracked ${logAmount} floor hustle steps 🚶‍♂️`; break;
        case 'phone': actionDesc = `Used phone for ${logAmount} minutes 📱 (Doomscroll Warning)`; break;
        case 'ironing': actionDesc = `Ironed ${logAmount} garments in record speed ⚡`; break;
        case 'washing': actionDesc = `Completed ${logAmount} machine wash load(s) 🧺`; break;
        case 'scent': actionDesc = `Added ${logAmount} scent booster sprinkles 🌸`; break;
        case 'delivery': actionDesc = `Completed ${logAmount} delivery run(s) 🏍️`; break;
        case 'folding': actionDesc = `Completed laundry folding with quality rating ${logAmount}/10 ✨`; break;
        case 'vibe': actionDesc = `Received customer satisfaction vibe rating of ${logAmount}/5 💖`; break;
      }
    }

    const newLog: HustleLog = {
      id: Date.now().toString(),
      staffId: staff.id,
      staffName: staff.name,
      actionType: logActionType,
      details: actionDesc,
      timestamp: new Date().toISOString()
    };

    saveToStorage(updatedStaff, [newLog, ...logs]);
    setShowLogModal(false);
    showAlert({ message: `Hustle logged for ${staff.name}! 📈`, type: 'success' });
  };

  // Reset counters for the day (fixed arguments to prevent blank-screen alert crashes)
  const handleResetDailyStats = () => {
    showConfirm(
      'Are you sure you want to reset all daily counters for staff?\nLogs will remain in history.',
      () => {
        const updatedStaff = staffList.map(s => ({
          ...s,
          steps: 0,
          phoneMinutes: 0,
          ironedCount: 0,
          washLoads: 0,
          scentSprinkles: 0,
          deliveryRuns: 0
        }));
        
        const resetLog: HustleLog = {
          id: Date.now().toString(),
          staffId: 'system',
          staffName: 'Admin',
          actionType: 'system',
          details: 'Daily hustle counters reset for all staff ⏰',
          timestamp: new Date().toISOString()
        };
        
        saveToStorage(updatedStaff, [resetLog, ...logs]);
        showAlert({ message: 'All daily stats reset to zero.', type: 'info' });
      }
    );
  };

  // Remove staff (fixed arguments to prevent blank-screen alert crashes)
  const handleDeleteStaff = (id: string, name: string) => {
    showConfirm(
      `Are you sure you want to remove ${name} from staff roster?`,
      () => {
        const updatedStaff = staffList.filter(s => s.id !== id);
        const newLog: HustleLog = {
          id: Date.now().toString(),
          staffId: 'system',
          staffName: 'Admin',
          actionType: 'system',
          details: `Staff member ${name} deleted from database ❌`,
          timestamp: new Date().toISOString()
        };
        saveToStorage(updatedStaff, [newLog, ...logs]);
        if (selectedStaffId === id) setSelectedStaffId(null);
        showAlert({ message: `${name} has been removed.`, type: 'info' });
      }
    );
  };

  // Hustle score algorithm
  const calculateHustleScore = (s: StaffMember) => {
    const points = 
      (s.steps * 0.2) + 
      (s.ironedCount * 1.5) + 
      (s.washLoads * 4) + 
      (s.foldingScore * 3) + 
      (s.vibeRating * 8) + 
      (s.scentSprinkles * 0.5) + 
      (s.deliveryRuns * 5) - 
      (s.phoneMinutes * 5) + 
      (s.customPoints || 0);
    return Math.max(0, Math.round(points));
  };

  // Leaderboard lists
  const leaderboard = useMemo(() => {
    return [...staffList]
      .map(s => ({ ...s, score: calculateHustleScore(s) }))
      .sort((a, b) => b.score - a.score);
  }, [staffList]);

  // Filtered leaderboard list based on search query
  const filteredLeaderboard = useMemo(() => {
    if (!searchQuery.trim()) return leaderboard;
    const query = searchQuery.toLowerCase();
    return leaderboard.filter(s => 
      s.name.toLowerCase().includes(query) || 
      s.role.toLowerCase().includes(query)
    );
  }, [leaderboard, searchQuery]);

  // Selected staff profile details
  const activeStaffDetails = useMemo(() => {
    if (!selectedStaffId) return null;
    return staffList.find(s => s.id === selectedStaffId) || null;
  }, [staffList, selectedStaffId]);

  // Filter logs for selected staff
  const staffSpecificLogs = useMemo(() => {
    if (!selectedStaffId) return [];
    return logs.filter(l => l.staffId === selectedStaffId);
  }, [logs, selectedStaffId]);

  return (
    <div style={{ fontFamily: 'var(--font-sans)', animation: 'fadeIn 0.4s ease-out' }}>
      
      {/* Complete Styling Overhaul CSS Injection */}
      <style>{`
        .staff-tracker-container {
          display: grid;
          grid-template-columns: 1fr 1.5fr;
          gap: 20px;
          margin-top: 14px;
        }
        @media (max-width: 992px) {
          .staff-tracker-container {
            grid-template-columns: 1fr;
          }
        }
        
        .genz-panel-left {
          background: rgba(20, 20, 26, 0.45);
          border: 1px solid rgba(255, 255, 255, 0.06);
          backdrop-filter: blur(24px) saturate(180%);
          border-radius: 16px;
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 16px;
          height: fit-content;
        }

        .genz-panel-right {
          background: rgba(20, 20, 26, 0.45);
          border: 1px solid rgba(255, 255, 255, 0.06);
          backdrop-filter: blur(24px) saturate(180%);
          border-radius: 16px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          min-height: 550px;
        }
        
        .search-container {
          position: relative;
          width: 100%;
        }
        
        .search-icon {
          position: absolute;
          left: 10px;
          top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
          font-size: 12px;
        }

        .search-input {
          width: 100%;
          padding: 9px 12px 9px 30px;
          background: rgba(0, 0, 0, 0.25);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          color: #fff;
          font-size: 12px;
          outline: none;
          box-sizing: border-box;
          transition: all 0.2s;
        }
        .search-input:focus {
          border-color: var(--accent);
          box-shadow: 0 0 10px rgba(99, 102, 241, 0.25);
        }

        .hustler-rank-card {
          background: rgba(255, 255, 255, 0.015);
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: 12px;
          padding: 14px;
          display: flex;
          align-items: center;
          gap: 14px;
          cursor: pointer;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .hustler-rank-card:hover {
          transform: translateY(-2px);
          border-color: rgba(99, 102, 241, 0.35);
          background: rgba(99, 102, 241, 0.03);
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.25);
        }

        .hustler-rank-card.active {
          background: linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(12, 12, 18, 0.7) 100%) !important;
          border-color: var(--accent) !important;
          box-shadow: 0 0 15px rgba(99, 102, 241, 0.22);
        }

        .rank-badge-circle {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          display: flex;
          justify-content: center;
          align-items: center;
          font-weight: 800;
          font-size: 13px;
          flex-shrink: 0;
        }

        .rank-1 {
          background: linear-gradient(135deg, #fbbf24 0%, #d97706 100%);
          color: #0b0f19;
          box-shadow: 0 0 10px rgba(251, 191, 36, 0.3);
        }
        .rank-2 {
          background: linear-gradient(135deg, #e4e4e7 0%, #71717a 100%);
          color: #0b0f19;
        }
        .rank-3 {
          background: linear-gradient(135deg, #b45309 0%, #78350f 100%);
          color: #fff;
        }
        .rank-other {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          color: var(--text-secondary);
        }

        .score-badge {
          font-size: 14px;
          font-weight: 800;
          color: #2dd4bf;
          text-shadow: 0 0 10px rgba(45, 212, 191, 0.25);
          text-align: right;
          flex-shrink: 0;
        }

        .score-label {
          font-size: 8px;
          color: var(--text-muted);
          text-transform: uppercase;
          letter-spacing: 0.5px;
          display: block;
        }

        .profile-metric-tile {
          background: rgba(0, 0, 0, 0.22);
          border: 1px solid rgba(255, 255, 255, 0.04);
          border-radius: 12px;
          padding: 14px;
          display: flex;
          flex-direction: column;
          gap: 6px;
          position: relative;
          overflow: hidden;
        }

        .metric-tile-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 10px;
          color: var(--text-muted);
        }

        .progress-bar-container {
          height: 5px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 3px;
          margin-top: 8px;
          overflow: hidden;
          width: 100%;
        }

        .progress-bar-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.5s ease-in-out;
        }

        .hustle-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(8, 8, 12, 0.85);
          backdrop-filter: blur(12px);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 2000;
          padding: 20px;
          animation: fadeIn 0.2s ease-out;
        }

        .hustle-modal {
          background: linear-gradient(135deg, rgba(28, 28, 38, 0.98) 0%, rgba(14, 14, 20, 0.99) 100%);
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 20px;
          padding: 26px;
          width: 100%;
          max-width: 580px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.65), 0 0 35px rgba(99, 102, 241, 0.18);
          display: flex;
          flex-direction: column;
          gap: 18px;
          box-sizing: border-box;
          animation: scaleIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .modal-section-title {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: var(--accent);
          margin-bottom: 8px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          padding-bottom: 4px;
        }

        .staff-form-group {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .staff-input {
          padding: 9px 12px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          color: #fff;
          font-size: 12px;
          outline: none;
          width: 100%;
          box-sizing: border-box;
          transition: all 0.2s;
        }

        .staff-input:focus {
          border-color: var(--accent);
          box-shadow: 0 0 8px rgba(99, 102, 241, 0.2);
        }

        .genz-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .genz-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
          border-radius: 3px;
        }
        .genz-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.12);
          border-radius: 3px;
        }
        .genz-scrollbar::-webkit-scrollbar-thumb:hover {
          background: var(--accent);
        }
      `}</style>

      {/* Roster Header Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '20px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="fas fa-bolt" style={{ color: '#fbbf24' }} />Store Staff Hustler Board
          </h1>
          <p style={{ color: 'var(--text-muted)', margin: '3px 0 0', fontSize: '12px' }}>
            Fully monitor walks, iron speedruns, customer vibes, and screen breaks.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={handleResetDailyStats} className="btn btn-ghost btn-sm" style={{ color: '#fbbf24', border: '1px solid rgba(251,191,36,0.25)' }}>
            <i className="fas fa-rotate-left" style={{ marginRight: '6px' }} />Reset Daily Ranks
          </button>
          <button onClick={seedDemoSquad} className="btn btn-ghost btn-sm" style={{ color: '#a78bfa', border: '1px solid rgba(167,139,250,0.25)' }}>
            <i className="fas fa-database" style={{ marginRight: '6px' }} />Seed Demo Data
          </button>
          <button onClick={clearAllStaff} className="btn btn-ghost btn-sm" style={{ color: '#f43f5e', border: '1px solid rgba(244,63,94,0.25)' }}>
            <i className="fas fa-trash-can" style={{ marginRight: '6px' }} />Clear All
          </button>
        </div>
      </div>

      {/* Main Grid View */}
      <div className="staff-tracker-container">
        
        {/* Left Column: Rankings List */}
        <div className="genz-panel-left">
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
            <div className="search-container" style={{ flex: 1 }}>
              <i className="fas fa-search search-icon" />
              <input
                type="text"
                placeholder="Search staff squad..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="search-input"
              />
            </div>
            <button onClick={() => setShowAddModal(true)} className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', border: 'none', padding: '9px 14px', borderRadius: '8px', color: '#fff', fontWeight: 600, fontSize: '11px', cursor: 'pointer', height: '34px', whiteSpace: 'nowrap' }}>
              <i className="fas fa-plus" /> Hire Hustler
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '530px', overflowY: 'auto', paddingRight: '4px' }} className="genz-scrollbar">
            {filteredLeaderboard.length > 0 ? (
              filteredLeaderboard.map((s, idx) => {
                const isSelected = selectedStaffId === s.id;
                const isHighDoomscroll = s.phoneMinutes > 20;
                
                // Get rank classes
                let rankClass = 'rank-other';
                let rankEmoji = `${idx + 1}`;
                if (idx === 0) { rankClass = 'rank-1'; rankEmoji = '👑'; }
                else if (idx === 1) { rankClass = 'rank-2'; rankEmoji = '🥈'; }
                else if (idx === 2) { rankClass = 'rank-3'; rankEmoji = '🥉'; }

                return (
                  <div
                    key={s.id}
                    onClick={() => setSelectedStaffId(s.id)}
                    className={`hustler-rank-card ${isSelected ? 'active' : ''}`}
                  >
                    <div className={`rank-badge-circle ${rankClass}`}>
                      {rankEmoji}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ margin: 0, fontSize: '13px', fontWeight: 'bold', color: '#fff', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {s.name}
                      </h3>
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', display: 'block', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        {s.role}
                      </span>
                      <div className="rank-card-stats">
                        <span>🚶‍♂️ {s.steps.toLocaleString()}</span>
                        <span style={{ color: isHighDoomscroll ? 'var(--danger)' : '' }}>📱 {s.phoneMinutes}m</span>
                        <span>⚡ {s.ironedCount}</span>
                      </div>
                    </div>
                    <div>
                      <div className="score-badge">{s.score}</div>
                      <span className="score-label">Score</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 10px', color: 'var(--text-muted)', fontSize: '12px' }}>
                <i className="fas fa-users-slash" style={{ fontSize: '24px', opacity: 0.3, marginBottom: '8px', display: 'block' }} />
                No staff found on roster.
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Telemetry Profiler */}
        <div className="genz-panel-right">
          {activeStaffDetails ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', animation: 'fadeIn 0.3s ease-out' }}>
              
              {/* Profile Header Banner */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '16px' }}>
                <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                  <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'linear-gradient(135deg, rgba(99,102,241,0.2) 0%, rgba(99,102,241,0.05) 100%)', border: '1px solid var(--accent)', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '20px' }}>
                    👤
                  </div>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#fff' }}>{activeStaffDetails.name}</h2>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>SPECIALTY: <strong style={{ color: 'var(--accent)' }}>{activeStaffDetails.role}</strong></span>
                  </div>
                </div>
                
                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                  <div style={{ background: 'linear-gradient(135deg, rgba(45,212,191,0.15) 0%, rgba(45,212,191,0.02) 100%)', border: '1px solid #2dd4bf', padding: '4px 10px', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#2dd4bf', boxShadow: '0 0 8px #2dd4bf' }} />
                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#2dd4bf', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      {calculateHustleScore(activeStaffDetails)} Hustle pts
                    </span>
                  </div>
                  <span style={{ fontSize: '8px', color: 'var(--text-muted)' }}>CALCULATED SCORE</span>
                </div>
              </div>

              {/* Action Toolbar */}
              <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '12px', flexWrap: 'wrap' }}>
                <button onClick={() => startLoggingAction(activeStaffDetails)} className="btn btn-sm btn-ghost" style={{ background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.2)', color: '#34d399', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <i className="fas fa-edit" /> Log Quick Hustle
                </button>
                <button onClick={() => startEditing(activeStaffDetails)} className="btn btn-sm btn-ghost" style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)', color: '#fbbf24', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <i className="fas fa-sliders-h" /> Override / Edit Stats
                </button>
                <button onClick={() => handleDeleteStaff(activeStaffDetails.id, activeStaffDetails.name)} className="btn btn-sm btn-ghost" style={{ background: 'rgba(244,63,94,0.06)', border: '1px solid rgba(244,63,94,0.2)', color: '#fb7185', fontSize: '11px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
                  <i className="fas fa-trash-can" /> Fire/Remove
                </button>
              </div>

              {/* Telemetry Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
                {[
                  { label: 'Walk Hustle', value: `${activeStaffDetails.steps.toLocaleString()} steps`, color: '#38bdf8', icon: 'fa-shoe-prints', fill: Math.min(100, (activeStaffDetails.steps / 12000) * 100), desc: activeStaffDetails.steps >= 10000 ? '🏃‍♂️ Floor Boss' : '🚶‍♂️ Walking' },
                  { label: 'Screen Breaks', value: `${activeStaffDetails.phoneMinutes} mins`, color: activeStaffDetails.phoneMinutes > 20 ? '#fb7185' : '#34d399', fill: Math.min(100, (activeStaffDetails.phoneMinutes / 40) * 100), desc: activeStaffDetails.phoneMinutes > 20 ? '📵 Doomscrolling' : '👍 Focused AF' },
                  { label: 'Speedrun Presses', value: `${activeStaffDetails.ironedCount} garments`, color: '#c084fc', fill: Math.min(100, (activeStaffDetails.ironedCount / 60) * 100), icon: 'fa-bolt', desc: '⚡ Iron Record' },
                  { label: 'Wash Cycles', value: `${activeStaffDetails.washLoads} loads`, color: '#34d399', fill: Math.min(100, (activeStaffDetails.washLoads / 12) * 100), icon: 'fa-soap', desc: '🧺 Washer King' },
                  { label: 'Folding Aesthetic', value: `${activeStaffDetails.foldingScore}/10`, color: '#fb923c', fill: activeStaffDetails.foldingScore * 10, icon: 'fa-shirt', desc: activeStaffDetails.foldingScore >= 9.0 ? '✨ Aesthetic AF' : 'Clean folds' },
                  { label: 'Vibe check', value: `⭐ ${activeStaffDetails.vibeRating}/5`, color: '#fbbf24', fill: activeStaffDetails.vibeRating * 20, icon: 'fa-star', desc: '💖 Customer Fav' },
                  { label: 'Scent Boosters', value: `${activeStaffDetails.scentSprinkles} sprinkles`, color: '#f472b6', fill: Math.min(100, (activeStaffDetails.scentSprinkles / 30) * 100), icon: 'fa-wand-magic-sparkles', desc: '🌸 Scent Master' },
                  { label: 'Road Hustles', value: `${activeStaffDetails.deliveryRuns} deliveries`, color: '#818cf8', fill: Math.min(100, (activeStaffDetails.deliveryRuns / 10) * 100), icon: 'fa-motorcycle', desc: '🏍️ High Priority' },
                  { label: 'Custom Bonus/Deduct', value: `${activeStaffDetails.customPoints || 0} pts`, color: '#2dd4bf', fill: Math.min(100, Math.max(0, ((activeStaffDetails.customPoints || 0) + 100) / 2)), icon: 'fa-bullseye', desc: '🎯 Manual Adj' }
                ].map((stat, i) => (
                  <div key={i} className="profile-metric-tile">
                    <div className="metric-tile-header">
                      <span>{stat.label}</span>
                      <i className={`fas ${stat.icon}`} style={{ color: stat.color, fontSize: '11px' }} />
                    </div>
                    <strong style={{ fontSize: '13px', color: '#fff', marginTop: '2px', display: 'block' }}>{stat.value}</strong>
                    <span style={{ fontSize: '8px', color: 'var(--text-muted)' }}>{stat.desc}</span>
                    <div className="progress-bar-container">
                      <div className="progress-bar-fill" style={{ width: `${stat.fill}%`, background: stat.color }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Vibe Advisory Check */}
              <div style={{ fontSize: '11px', color: '#fff', background: 'rgba(255,255,255,0.02)', padding: '12px 14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.04)', display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span style={{ fontSize: '16px' }}>🧠</span>
                <div>
                  <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '9px', fontWeight: 700, textTransform: 'uppercase' }}>Vibe Assessment</span>
                  <span style={{ display: 'block', marginTop: '2px' }}>
                    {activeStaffDetails.phoneMinutes > 25 ? (
                      <strong style={{ color: '#fb7185' }}>ALERT: {activeStaffDetails.name} is screen-doomscrolling too much. Drop the phone and pick up the iron!</strong>
                    ) : activeStaffDetails.steps > 9000 ? (
                      <strong style={{ color: '#34d399' }}>LEGIT HUSTLE: {activeStaffDetails.name} has crossed high floor milestones. Roster hero energy!</strong>
                    ) : (
                      <strong style={{ color: '#a78bfa' }}>STEADY VIBES: Operations flowing smoothly. Folds and scents on point.</strong>
                    )}
                  </span>
                </div>
              </div>

              {/* Specific logs */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '14px' }}>
                <h3 style={{ color: 'rgba(255,255,255,0.9)', margin: 0, fontSize: '12px', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <i className="fas fa-history" style={{ color: 'var(--accent)' }} /> Roster Activity logs ({activeStaffDetails.name})
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', maxHeight: '120px', overflowY: 'auto', paddingRight: '4px' }} className="genz-scrollbar">
                  {staffSpecificLogs.length > 0 ? (
                    staffSpecificLogs.map((log, i) => {
                      let badgeColor = '#a1a1aa';
                      let badgeBg = 'rgba(255,255,255,0.05)';
                      if (log.actionType === 'ironing') { badgeColor = '#c084fc'; badgeBg = 'rgba(192,132,252,0.1)'; }
                      else if (log.actionType === 'steps') { badgeColor = '#38bdf8'; badgeBg = 'rgba(56,189,248,0.1)'; }
                      else if (log.actionType === 'phone') { badgeColor = '#fb7185'; badgeBg = 'rgba(251,113,133,0.1)'; }
                      else if (log.actionType === 'washing') { badgeColor = '#34d399'; badgeBg = 'rgba(52,211,153,0.1)'; }
                      else if (log.actionType === 'system') { badgeColor = '#fbbf24'; badgeBg = 'rgba(251,191,36,0.1)'; }

                      return (
                        <div key={log.id || i} style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.02)', borderRadius: '6px', padding: '6px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '10px', color: 'var(--text-secondary)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                            {log.details}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                            <span style={{ fontSize: '7px', color: badgeColor, background: badgeBg, padding: '1px 5px', borderRadius: '4px', textTransform: 'uppercase', fontWeight: 700 }}>
                              {log.actionType}
                            </span>
                            <span style={{ fontSize: '7px', color: 'var(--text-muted)' }}>
                              {new Date(log.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '15px', fontSize: '10px' }}>
                      No actions recorded for this member today.
                    </div>
                  )}
                </div>
              </div>

            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text-muted)', padding: '40px 10px' }}>
              <i className="fas fa-users-gear" style={{ fontSize: '36px', opacity: 0.25, marginBottom: '12px' }} />
              <p style={{ margin: 0, fontSize: '13px', fontWeight: 500 }}>Select a store staff member from the roster list</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '11px', opacity: 0.8 }}>to view detailed operations performance telemetry, log quick actions, or override stats.</p>
            </div>
          )}
        </div>

      </div>

      {/* ================= MODALS SECTION ================= */}

      {/* 1. HIRE HUSTLER MODAL */}
      {showAddModal && (
        <div className="hustle-modal-overlay">
          <div className="hustle-modal genz-scrollbar">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px' }}>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fas fa-user-plus" style={{ color: 'var(--accent)' }} /> Hire New Store Hustler
              </h2>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '14px' }}>
                <i className="fas fa-xmark" />
              </button>
            </div>

            <form onSubmit={handleAddStaff} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="modal-section-title">Identity & Role</div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="staff-form-group">
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500 }}>Hustler Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Raju Staff"
                    value={addName}
                    onChange={e => setAddName(e.target.value)}
                    className="staff-input"
                  />
                </div>
                <div className="staff-form-group">
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500 }}>Specialty/Specialist Role</label>
                  <input
                    type="text"
                    list="roles-list"
                    required
                    placeholder="e.g. Ironing Speedrunner ⚡"
                    value={addRole}
                    onChange={e => setAddRole(e.target.value)}
                    className="staff-input"
                  />
                </div>
              </div>

              <div className="modal-section-title">Roster Operations Metrics (Initial Data Input)</div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div className="staff-form-group">
                  <label style={{ fontSize: '9px', color: '#38bdf8' }}>🚶‍♂️ Steps Count</label>
                  <input type="number" min="0" value={addSteps} onChange={e => setAddSteps(Math.max(0, +e.target.value))} className="staff-input" />
                </div>
                <div className="staff-form-group">
                  <label style={{ fontSize: '9px', color: '#fb7185' }}>📱 Phone Break (m)</label>
                  <input type="number" min="0" value={addPhone} onChange={e => setAddPhone(Math.max(0, +e.target.value))} className="staff-input" />
                </div>
                <div className="staff-form-group">
                  <label style={{ fontSize: '9px', color: '#c084fc' }}>⚡ Ironed Garments</label>
                  <input type="number" min="0" value={addIroned} onChange={e => setAddIroned(Math.max(0, +e.target.value))} className="staff-input" />
                </div>
                <div className="staff-form-group">
                  <label style={{ fontSize: '9px', color: '#10b981' }}>🧺 Wash Loads</label>
                  <input type="number" min="0" value={addWashing} onChange={e => setAddWashing(Math.max(0, +e.target.value))} className="staff-input" />
                </div>
                <div className="staff-form-group">
                  <label style={{ fontSize: '9px', color: '#fb923c' }}>✨ Folding (1-10)</label>
                  <input type="number" step="0.1" min="1" max="10" value={addFolding} onChange={e => setAddFolding(Math.min(10, Math.max(1, +e.target.value)))} className="staff-input" />
                </div>
                <div className="staff-form-group">
                  <label style={{ fontSize: '9px', color: '#fbbf24' }}>⭐ Vibes (1-5)</label>
                  <input type="number" step="0.1" min="1" max="5" value={addVibe} onChange={e => setAddVibe(Math.min(5, Math.max(1, +e.target.value)))} className="staff-input" />
                </div>
                <div className="staff-form-group">
                  <label style={{ fontSize: '9px', color: '#f472b6' }}>🌸 Scent Sprinkles</label>
                  <input type="number" min="0" value={addScent} onChange={e => setAddScent(Math.max(0, +e.target.value))} className="staff-input" />
                </div>
                <div className="staff-form-group">
                  <label style={{ fontSize: '9px', color: '#818cf8' }}>🏍️ Deliveries Runs</label>
                  <input type="number" min="0" value={addDelivery} onChange={e => setAddDelivery(Math.max(0, +e.target.value))} className="staff-input" />
                </div>
                <div className="staff-form-group">
                  <label style={{ fontSize: '9px', color: '#2dd4bf' }}>🎯 Bonus Adjust (+/-)</label>
                  <input type="number" value={addCustomPoints} onChange={e => setAddCustomPoints(+e.target.value)} className="staff-input" />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '14px' }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-ghost" style={{ flex: 1, padding: '10px', fontSize: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '10px', fontSize: '12px', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', border: 'none', color: 'white', fontWeight: 600, borderRadius: '8px', cursor: 'pointer' }}>
                  Add Hustler to Roster
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. OVERRIDE / EDIT METRICS MODAL */}
      {showEditModal && (
        <div className="hustle-modal-overlay">
          <div className="hustle-modal genz-scrollbar">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px' }}>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fas fa-sliders-h" style={{ color: '#fbbf24' }} /> Override Hustler Statistics
              </h2>
              <button onClick={() => setShowEditModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '14px' }}>
                <i className="fas fa-xmark" />
              </button>
            </div>

            <form onSubmit={handleSaveEditedStats} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="modal-section-title">Identity details</div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="staff-form-group">
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500 }}>Hustler Full Name</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="staff-input"
                  />
                </div>
                <div className="staff-form-group">
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500 }}>Specialty/Role</label>
                  <input
                    type="text"
                    list="roles-list"
                    required
                    value={editRole}
                    onChange={e => setEditRole(e.target.value)}
                    className="staff-input"
                  />
                </div>
              </div>

              <div className="modal-section-title">Override operations metrics</div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div className="staff-form-group">
                  <label style={{ fontSize: '9px', color: '#38bdf8' }}>🚶‍♂️ Steps Count</label>
                  <input type="number" min="0" value={editSteps} onChange={e => setEditSteps(Math.max(0, +e.target.value))} className="staff-input" />
                </div>
                <div className="staff-form-group">
                  <label style={{ fontSize: '9px', color: '#fb7185' }}>📱 Phone Break (m)</label>
                  <input type="number" min="0" value={editPhoneMinutes} onChange={e => setEditPhoneMinutes(Math.max(0, +e.target.value))} className="staff-input" />
                </div>
                <div className="staff-form-group">
                  <label style={{ fontSize: '9px', color: '#c084fc' }}>⚡ Ironed Garments</label>
                  <input type="number" min="0" value={editIronedCount} onChange={e => setEditIronedCount(Math.max(0, +e.target.value))} className="staff-input" />
                </div>
                <div className="staff-form-group">
                  <label style={{ fontSize: '9px', color: '#10b981' }}>🧺 Wash Loads</label>
                  <input type="number" min="0" value={editWashLoads} onChange={e => setEditWashLoads(Math.max(0, +e.target.value))} className="staff-input" />
                </div>
                <div className="staff-form-group">
                  <label style={{ fontSize: '9px', color: '#fb923c' }}>✨ Folding (1-10)</label>
                  <input type="number" step="0.1" min="1" max="10" value={editFoldingScore} onChange={e => setEditFoldingScore(Math.min(10, Math.max(1, +e.target.value)))} className="staff-input" />
                </div>
                <div className="staff-form-group">
                  <label style={{ fontSize: '9px', color: '#fbbf24' }}>⭐ Vibes (1-5)</label>
                  <input type="number" step="0.1" min="1" max="5" value={editVibeRating} onChange={e => setEditVibeRating(Math.min(5, Math.max(1, +e.target.value)))} className="staff-input" />
                </div>
                <div className="staff-form-group">
                  <label style={{ fontSize: '9px', color: '#f472b6' }}>🌸 Scent Sprinkles</label>
                  <input type="number" min="0" value={editScentSprinkles} onChange={e => setEditScentSprinkles(Math.max(0, +e.target.value))} className="staff-input" />
                </div>
                <div className="staff-form-group">
                  <label style={{ fontSize: '9px', color: '#818cf8' }}>🏍️ Deliveries Runs</label>
                  <input type="number" min="0" value={editDeliveryRuns} onChange={e => setEditDeliveryRuns(Math.max(0, +e.target.value))} className="staff-input" />
                </div>
                <div className="staff-form-group">
                  <label style={{ fontSize: '9px', color: '#2dd4bf' }}>🎯 Bonus Adjust (+/-)</label>
                  <input type="number" value={editCustomPoints} onChange={e => setEditCustomPoints(+e.target.value)} className="staff-input" />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '14px' }}>
                <button type="button" onClick={() => setShowEditModal(false)} className="btn btn-ghost" style={{ flex: 1, padding: '10px', fontSize: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '10px', fontSize: '12px', background: 'linear-gradient(135deg, #fbbf24, #d97706)', border: 'none', color: '#0b0f19', fontWeight: 600, borderRadius: '8px', cursor: 'pointer' }}>
                  Save Roster overrides
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. LOG QUICK ACTION MODAL */}
      {showLogModal && (
        <div className="hustle-modal-overlay">
          <div className="hustle-modal">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px' }}>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <i className="fas fa-circle-plus" style={{ color: '#2dd4bf' }} /> Log Hustle Activity
              </h2>
              <button onClick={() => setShowLogModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '14px' }}>
                <i className="fas fa-xmark" />
              </button>
            </div>

            <form onSubmit={handleLogAction} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="staff-form-group">
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500 }}>Select Activity Type</label>
                <select value={logActionType} onChange={e => {
                  const val = e.target.value;
                  setLogActionType(val);
                  if (val === 'folding') setLogAmount(10);
                  else if (val === 'vibe') setLogAmount(5);
                  else if (val === 'custom') setLogAmount(10);
                  else setLogAmount(5);
                }} className="staff-input">
                  <option value="steps">Walk Hustle (Steps)</option>
                  <option value="phone">Phone Usage (Minutes)</option>
                  <option value="ironing">Ironing Speedrun (Garments)</option>
                  <option value="washing">Washing Load (Machine Cycles)</option>
                  <option value="scent">Scent Boost Sprinkles (Count)</option>
                  <option value="delivery">Delivery Runs (Completed)</option>
                  <option value="folding">Folding Quality Score (1-10)</option>
                  <option value="vibe">Customer Vibe Feedback (1-5)</option>
                  <option value="custom">Custom Achievement/Penalty 🎯</option>
                </select>
              </div>

              {logActionType === 'custom' && (
                <div className="staff-form-group">
                  <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500 }}>Custom Activity Description</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Organized aesthetic laundry racks 📸"
                    value={customActionDesc}
                    onChange={e => setCustomActionDesc(e.target.value)}
                    className="staff-input"
                  />
                </div>
              )}

              <div className="staff-form-group">
                <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  {logActionType === 'custom' ? 'Points effect (add/subtract)' : 'Amount/Score'}
                </label>
                <input
                  type="number"
                  value={logAmount}
                  onChange={e => setLogAmount(+e.target.value)}
                  min={logActionType === 'custom' ? -1000 : 1}
                  max={logActionType === 'folding' ? 10 : logActionType === 'vibe' ? 5 : 50000}
                  className="staff-input"
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '14px' }}>
                <button type="button" onClick={() => setShowLogModal(false)} className="btn btn-ghost" style={{ flex: 1, padding: '10px', fontSize: '12px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '10px', fontSize: '12px', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: 'white', fontWeight: 600, borderRadius: '8px', cursor: 'pointer' }}>
                  Log Activity to Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Specialty Datalist Suggestions */}
      <datalist id="roles-list">
        <option value="Ironing Speedrunner ⚡" />
        <option value="Folding Aesthetician ✨" />
        <option value="Vibe Check Manager 💖" />
        <option value="Load Washer & Dryer 🧺" />
        <option value="Scent Sprinkler Master 🌸" />
        <option value="Delivery Hustler 🏍️" />
      </datalist>

    </div>
  );
};

export default StaffHustleTracker;
