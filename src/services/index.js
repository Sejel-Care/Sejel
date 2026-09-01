/**
 * ==============================================================================
 * سِجِل (Sejel) - مجمّع ومصدّر الخدمات المركزية (Services Index)
 * ==============================================================================
 */

export { app, db, auth, firebaseConfig } from './firebase';
export { driveService } from './driveService';
export { patientService, fetchPatients, fetchPatientById, createPatient, updatePatient, deletePatient } from './patientService';
export { visitService, fetchVisits, fetchVisitById, createVisit, updateVisit, deleteVisit } from './visitService';
export { medicationService, fetchMedications, fetchMedicationById, createMedication, updateMedication, deleteMedication } from './medicationService';
export { vitalService, fetchVitals, fetchVitalById, createVital, updateVital, deleteVital } from './vitalService';
export { symptomService, fetchSymptoms, fetchSymptomById, createSymptom, updateSymptom, deleteSymptom } from './symptomService';
export { appointmentService, fetchAppointments, fetchAppointmentById, createAppointment, updateAppointment, deleteAppointment, getGoogleCalendarUrl } from './appointmentService';
export { documentService, fetchDocuments, fetchDocumentById, uploadDocument, createDocument, updateDocument, deleteDocument } from './documentService';
export { apiService } from './apiService';
export { printService } from './printService';
