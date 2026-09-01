import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { db, addRecord, updateRecord } from '../db/indexedDB';

const PatientContext = createContext();

export function PatientProvider({ children }) {
  const [patients, setPatients] = useState([]);
  const [activePatientId, setActivePatientId] = useState('P_01');
  const [loading, setLoading] = useState(true);
  const [dataVersion, setDataVersion] = useState(0);

  const notifyDataChanged = useCallback((table = '') => {
    setDataVersion(v => v + 1);
    try {
      window.dispatchEvent(new CustomEvent('sejel:data-changed', { detail: { table } }));
    } catch {}
  }, []);

  const refreshPatients = async () => {
    try {
      const allPatients = await db.patients.toArray();
      setPatients(allPatients);

      const savedActiveSetting = await db.settings.get('activePatientId');
      if (savedActiveSetting && allPatients.some(p => p.PatientID === savedActiveSetting.value)) {
        setActivePatientId(savedActiveSetting.value);
      } else if (allPatients.length > 0) {
        setActivePatientId(allPatients[0].PatientID);
      }
    } catch (err) {
      console.error('[Sejel Patient] Error loading patients:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshPatients();
  }, []);

  // الاستماع لأي تغيير في قاعدة البيانات لإعادة تحميل بيانات المرضى إن تم تعديلهم
  useEffect(() => {
    const handleEvent = (e) => {
      setDataVersion(v => v + 1);
      if (e.detail?.table === 'patients') {
        refreshPatients();
      }
    };
    window.addEventListener('sejel:data-changed', handleEvent);
    return () => window.removeEventListener('sejel:data-changed', handleEvent);
  }, []);

  const switchPatient = async (patientId) => {
    setActivePatientId(patientId);
    await db.settings.put({ key: 'activePatientId', value: patientId });
    notifyDataChanged('patient-switched');
  };

  const createPatient = async (patientData) => {
    const newId = `P_${Date.now()}`;
    const newPatient = {
      ...patientData,
      PatientID: newId,
      PIN: patientData.PIN || (patientData.BirthDate ? patientData.BirthDate.substring(0, 4) : '1990'),
      CreatedAt: new Date().toISOString(),
      UpdatedAt: new Date().toISOString()
    };
    await addRecord('patients', newPatient);
    await refreshPatients();
    await switchPatient(newId);
    return newPatient;
  };

  const updateActivePatient = async (updatedFields) => {
    if (!activePatientId) return;
    await updateRecord('patients', activePatientId, updatedFields);
    await refreshPatients();
  };

  const activePatient = patients.find(p => p.PatientID === activePatientId) || patients[0] || null;

  return (
    <PatientContext.Provider value={{
      patients,
      activePatient,
      activePatientId,
      switchPatient,
      createPatient,
      updateActivePatient,
      refreshPatients,
      notifyDataChanged,
      dataVersion,
      loading
    }}>
      {children}
    </PatientContext.Provider>
  );
}

export function usePatient() {
  return useContext(PatientContext);
}
