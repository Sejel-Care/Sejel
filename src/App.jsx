import React, { useState } from 'react';
import { I18nProvider } from './context/I18nContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PatientProvider } from './context/PatientContext';
import { SyncProvider } from './context/SyncContext';

import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import { BottomNav } from './components/layout/BottomNav';

import { Dashboard } from './pages/Dashboard';
import { Profile } from './pages/Profile';
import { Visits } from './pages/Visits';
import { Medications } from './pages/Medications';
import { Vitals } from './pages/Vitals';
import { Symptoms } from './pages/Symptoms';
import { Appointments } from './pages/Appointments';
import { Documents } from './pages/Documents';
import { Settings } from './pages/Settings';

import { LoginScreen } from './components/security/LoginScreen';
import { PinLockModal } from './components/security/PinLockModal';
import { EmergencyCardModal } from './components/emergency/EmergencyCardModal';
import { VoiceRecorderModal } from './components/voice/VoiceRecorderModal';
import { AddRecordModal } from './components/common/AddRecordModal';
import { FamilyManagementModal } from './components/common/FamilyManagementModal';
import { usePatient } from './context/PatientContext';
import { Loader2, HeartPulse } from 'lucide-react';

function AppContent() {
  const { user, authLoading, isLocked } = useAuth();
  const { notifyDataChanged } = usePatient();
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Mobile drawer state
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);

  // Modals state
  const [isEmergencyOpen, setIsEmergencyOpen] = useState(false);
  const [isFamilyModalOpen, setIsFamilyModalOpen] = useState(false);

  const [addModal, setAddModal] = useState({
    isOpen: false,
    type: 'visit',
    initialData: null
  });

  const [voiceModal, setVoiceModal] = useState({
    isOpen: false,
    initialData: null
  });

  // Handlers for Add & Edit Modals
  const handleOpenAddModal = (type = 'visit') => {
    setAddModal({
      isOpen: true,
      type,
      initialData: null
    });
  };

  const handleOpenEditModal = (type, initialData) => {
    setAddModal({
      isOpen: true,
      type,
      initialData
    });
  };

  const handleOpenVoiceModal = (initialData = null) => {
    setVoiceModal({
      isOpen: true,
      initialData
    });
  };

  // 1. Initial Authentication Loading State
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center gap-4 text-slate-800 dark:text-slate-200">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-primary-600 to-primary-400 flex items-center justify-center text-white shadow-xl shadow-primary-500/25 animate-pulse">
          <HeartPulse className="w-8 h-8" />
        </div>
        <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
          <Loader2 className="w-4 h-4 animate-spin text-primary-500" />
          <span>جاري التحقق من الحساب...</span>
        </div>
      </div>
    );
  }

  // 2. Unauthenticated -> Show Google Sign-In Screen
  if (!user) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen bg-slate-100/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors">
      
      {/* 1. Header with mobile hamburger and patient switcher */}
      <Header
        onOpenEmergency={() => setIsEmergencyOpen(true)}
        onOpenAddPatient={() => handleOpenAddModal('patient')}
        onOpenFamilyManagement={() => setIsFamilyModalOpen(true)}
        onToggleMobileDrawer={() => setIsMobileDrawerOpen(!isMobileDrawerOpen)}
      />

      {/* 2. Main App Body (Sidebar + Content Area) */}
      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        
        {/* Desktop Sidebar & Mobile Drawer */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          onOpenEmergency={() => setIsEmergencyOpen(true)}
          isMobileDrawerOpen={isMobileDrawerOpen}
          onCloseMobileDrawer={() => setIsMobileDrawerOpen(false)}
          onOpenFamilyManagement={() => setIsFamilyModalOpen(true)}
        />

        {/* Dynamic Page Views */}
        <main className="flex-1 p-3.5 sm:p-6 md:p-8 min-w-0 max-w-full overflow-x-hidden">
          {activeTab === 'dashboard' && (
            <Dashboard
              onOpenEmergency={() => setIsEmergencyOpen(true)}
              onOpenVoiceModal={() => handleOpenVoiceModal()}
              onOpenAddModal={handleOpenAddModal}
              onNavigateTab={setActiveTab}
            />
          )}

          {activeTab === 'profile' && (
            <Profile
              onOpenEmergency={() => setIsEmergencyOpen(true)}
            />
          )}

          {activeTab === 'visits' && (
            <Visits
              onOpenAddModal={handleOpenAddModal}
              onEditVisit={(visit) => handleOpenEditModal('visit', visit)}
            />
          )}

          {activeTab === 'medications' && (
            <Medications
              onOpenAddModal={handleOpenAddModal}
              onEditMedication={(med) => handleOpenEditModal('medication', med)}
            />
          )}

          {activeTab === 'vitals' && (
            <Vitals
              onOpenAddModal={handleOpenAddModal}
              onEditVital={(vital) => handleOpenEditModal('vital', vital)}
            />
          )}

          {activeTab === 'symptoms' && (
            <Symptoms
              onOpenVoiceModal={() => handleOpenVoiceModal()}
              onEditSymptom={(sym) => handleOpenVoiceModal(sym)}
            />
          )}

          {activeTab === 'appointments' && (
            <Appointments
              onOpenAddModal={handleOpenAddModal}
              onEditAppointment={(appt) => handleOpenEditModal('appointment', appt)}
            />
          )}

          {activeTab === 'documents' && (
            <Documents
              onOpenAddModal={handleOpenAddModal}
              onEditDocument={(doc) => handleOpenEditModal('document', doc)}
            />
          )}

          {activeTab === 'settings' && (
            <Settings />
          )}
        </main>
      </div>

      {/* 3. Mobile Bottom Navigation (5 tabs) */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenEmergency={() => setIsEmergencyOpen(true)}
        onOpenVoiceModal={() => handleOpenVoiceModal()}
        onOpenFamilyManagement={() => setIsFamilyModalOpen(true)}
      />

      {/* 4. PIN Lock Modal */}
      <PinLockModal isOpen={isLocked} />

      {/* 5. Emergency SOS Card Modal */}
      <EmergencyCardModal
        isOpen={isEmergencyOpen}
        onClose={() => setIsEmergencyOpen(false)}
      />

      {/* 6. Voice Recording Modal */}
      <VoiceRecorderModal
        isOpen={voiceModal.isOpen}
        initialData={voiceModal.initialData}
        onClose={() => setVoiceModal({ isOpen: false, initialData: null })}
        onSaved={() => {
          notifyDataChanged('symptoms');
        }}
      />

      {/* 7. Unified Add/Edit Record Modal */}
      <AddRecordModal
        isOpen={addModal.isOpen}
        recordType={addModal.type}
        initialData={addModal.initialData}
        onClose={() => setAddModal({ isOpen: false, type: 'visit', initialData: null })}
        onSaved={() => {
          notifyDataChanged(addModal.type);
        }}
      />

      {/* 8. Family Management Modal */}
      <FamilyManagementModal
        isOpen={isFamilyModalOpen}
        onClose={() => setIsFamilyModalOpen(false)}
        onAddMember={() => handleOpenAddModal('patient')}
        onEditMember={(patient) => handleOpenEditModal('patient', patient)}
      />

    </div>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <PatientProvider>
          <SyncProvider>
            <AppContent />
          </SyncProvider>
        </PatientProvider>
      </AuthProvider>
    </I18nProvider>
  );
}
