import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

/**
 * ==============================================================================
 * سِجِل (Sejel) - محرك التقارير الطبية وتوليد PDF الحقيقي والمشاركة
 * printService.js - Real PDF Export (jsPDF + html2canvas) & Web Share API
 * ==============================================================================
 */

export const printService = {
  /**
   * توليد ملف PDF حقيقي (Blob & jsPDF Instance) من عنصر DOM
   * @param {HTMLElement} element عنصر التقرير المنسق
   * @param {Object} patient بيانات المريض
   * @returns {Promise<{pdf: jsPDF, blob: Blob, fileName: string}>}
   */
  async generatePdfBlob(element, patient = null) {
    if (!element) throw new Error('عنصر التقرير غير موجود لتوليد PDF');

    const patientName = patient?.Name || 'مريض';
    const safeName = patientName.replace(/\s+/g, '_');
    const fileName = `التقرير_الطبي_${safeName}.pdf`;

    // التقاط صورة عالية الدقة (Scale: 2) لضمان وضوح الخطوط العربية والجداول
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = 210; // عرض A4 بالمليمتر
    const pdfHeight = 297; // ارتفاع A4 بالمليمتر
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    // إضافة الصفحة الأولى
    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
    heightLeft -= pdfHeight;

    // إضافة صفحات إضافية في حال كان التقرير طويلاً
    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pdfHeight;
    }

    const blob = pdf.output('blob');
    return { pdf, blob, fileName };
  },

  /**
   * حفظ وتنزيل التقرير الطبي كملف PDF حقيقي على جهاز المستخدم
   */
  async saveMedicalReportPdf({ element, patient }) {
    try {
      const { pdf, fileName } = await this.generatePdfBlob(element, patient);
      pdf.save(fileName);
      return { success: true, fileName };
    } catch (err) {
      console.error('[printService] Error saving PDF:', err);
      throw err;
    }
  },

  /**
   * مشاركة ملف PDF الحقيقي عبر Web Share API (WhatsApp, Telegram, Mail...)
   */
  async shareMedicalReportPdf({ element, patient }) {
    try {
      const { blob, fileName } = await this.generatePdfBlob(element, patient);
      const pdfFile = new File([blob], fileName, { type: 'application/pdf' });

      // استخدام Web Share API مع ملف PDF
      if (navigator.share) {
        try {
          if (navigator.canShare && navigator.canShare({ files: [pdfFile] })) {
            await navigator.share({
              title: `التقرير الطبي - ${patient?.Name || 'سِجِل'}`,
              text: `التقرير الطبي الشامل وملف المتابعة الصحية للمريض ${patient?.Name || ''}`,
              files: [pdfFile]
            });
            return { success: true, method: 'share_sheet' };
          } else {
            // مشاركة بيانات التقرير عبر Share Sheet
            await navigator.share({
              title: `التقرير الطبي - ${patient?.Name || 'سِجِل'}`,
              text: `التقرير الطبي الشامل للمريض: ${patient?.Name || ''}\nفصيلة الدم: ${patient?.BloodType || '-'}\nهاتف الطوارئ: ${patient?.EmergencyContactPhone || '-'}`
            });
            return { success: true, method: 'share_text' };
          }
        } catch (shareErr) {
          if (shareErr.name === 'AbortError') {
            return { success: false, cancelled: true };
          }
          throw shareErr;
        }
      } else {
        throw new Error('المتصفح لا يدعم قائمة المشاركة المباشرة (Web Share)');
      }
    } catch (err) {
      console.error('[printService] Error sharing PDF:', err);
      throw err;
    }
  },

  /**
   * طباعة ورقية تقليدية (Print Dialog)
   */
  printMedicalReport({ patient, medications = [], vitals = [], visits = [] }) {
    const htmlContent = this.generateMedicalReportHtml({ patient, medications, vitals, visits });
    this._printHtml(htmlContent);
  },

  /**
   * طباعة بطاقة الطوارئ الطبية
   */
  printEmergencyCard(patient) {
    if (!patient) return;
    const age = calculateAge(patient.BirthDate);
    const todayStr = new Date().toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const htmlContent = `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>بطاقة_طوارئ_${(patient.Name || 'مريض').replace(/\s+/g, '_')}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=Tajawal:wght@400;500;700;800&display=swap" rel="stylesheet">
        <style>
          @page { size: A4 portrait; margin: 10mm; }
          * { box-sizing: border-box; margin: 0; padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          body { font-family: 'Cairo', 'Tajawal', sans-serif; direction: rtl; background: #ffffff; color: #1e293b; padding: 20px; line-height: 1.5; }
          .card-container { max-width: 650px; margin: 0 auto; border: 4px solid #EA4335; border-radius: 24px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08); }
          .header { background: linear-gradient(135deg, #C5221F, #EA4335); color: #ffffff; padding: 20px 24px; display: flex; justify-content: space-between; align-items: center; }
          .header h1 { font-size: 22px; font-weight: 900; }
          .content { padding: 24px; }
          .hero-section { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #f1f5f9; padding-bottom: 16px; margin-bottom: 16px; }
          .patient-name { font-size: 24px; font-weight: 900; color: #0f172a; }
          .patient-meta { font-size: 14px; color: #475569; font-weight: 600; margin-top: 4px; }
          .blood-badge { background: #fef2f2; border: 2px solid #EA4335; color: #EA4335; border-radius: 16px; padding: 8px 18px; text-align: center; }
          .blood-badge strong { font-size: 28px; font-weight: 900; }
          .alert-box { background: #fff1f2; border: 2px solid #fecdd3; border-radius: 16px; padding: 14px 18px; margin-bottom: 14px; }
          .alert-title { color: #be123c; font-weight: 800; font-size: 13px; margin-bottom: 4px; }
          .alert-desc { font-size: 14px; font-weight: 700; color: #881337; }
          .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 14px; }
          .info-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 12px 16px; }
          .info-title { font-size: 11px; font-weight: 700; color: #64748b; margin-bottom: 2px; }
          .info-val { font-size: 13px; font-weight: 700; color: #0f172a; }
          .contact-box { background: #f0fdf4; border: 2px solid #86efac; border-radius: 16px; padding: 14px 18px; display: flex; justify-content: space-between; align-items: center; }
          .contact-name { font-size: 15px; font-weight: 900; color: #14532d; }
          .contact-phone { font-size: 15px; font-weight: 800; font-family: monospace; direction: ltr; color: #15803d; }
          .footer { margin-top: 14px; padding-top: 12px; border-top: 1px solid #f1f5f9; display: flex; justify-content: space-between; font-size: 11px; color: #94a3b8; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="card-container">
          <div class="header">
            <div>
              <h1>بطاقة الطوارئ الطبية</h1>
              <p>SEJEL • EMERGENCY IDENTIFICATION</p>
            </div>
            <div style="text-align: left; font-size: 11px; font-weight: bold;">
              <span>${todayStr}</span>
            </div>
          </div>
          <div class="content">
            <div class="hero-section">
              <div>
                <div class="patient-name">${patient.Name || 'المريض'}</div>
                <div class="patient-meta">العمر: ${age} سنة • ${patient.Gender === 'Male' ? 'ذكر' : 'أنثى'} • ID: ${patient.PatientID}</div>
              </div>
              <div class="blood-badge">
                <span style="font-size:10px; font-weight:800; display:block;">فصيلة الدم</span>
                <strong>${patient.BloodType || 'O+'}</strong>
              </div>
            </div>
            <div class="alert-box">
              <div class="alert-title">⚠️ الحساسيات والتحذيرات الحرجة:</div>
              <div class="alert-desc">${patient.Allergies || 'لا توجد حساسيات مسجلة'}</div>
            </div>
            <div class="grid-2">
              <div class="info-card">
                <div class="info-title">الأمراض المزمنة:</div>
                <div class="info-val">${patient.ChronicDiseases || 'لا توجد'}</div>
              </div>
              <div class="info-card">
                <div class="info-title">العمليات الجراحية:</div>
                <div class="info-val">${patient.Surgeries || 'لا توجد'}</div>
              </div>
            </div>
            <div class="contact-box">
              <div>
                <div style="font-size:11px; font-weight:800; color:#166534;">جهة اتصال الطوارئ:</div>
                <div class="contact-name">${patient.EmergencyContactName || '-'}</div>
              </div>
              <div class="contact-phone">${patient.EmergencyContactPhone || '-'}</div>
            </div>
            <div class="footer">
              <span>تطبيق سِجِل الصحي</span>
              <span>امسح الرمز أو اتصل بجهة الطوارئ فوراً</span>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
    this._printHtml(htmlContent);
  },

  /**
   * توليد كود HTML الكامل
   */
  generateMedicalReportHtml({ patient, medications = [], vitals = [], visits = [] }) {
    if (!patient) return '';
    const age = calculateAge(patient.BirthDate);
    const todayStr = new Date().toLocaleDateString('ar-SA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const vitalNames = {
      BloodPressure: 'ضغط الدم',
      Sugar: 'مستوى السكر',
      Pulse: 'نبض القلب',
      Temperature: 'حرارة الجسم',
      Weight: 'الوزن',
      Oxygen: 'نسبة الأكسجين'
    };

    const medsRows = medications.length === 0 
      ? `<tr><td colspan="4" style="text-align:center; color:#94a3b8; padding:14px;">لا توجد أدوية مسجلة حالياً</td></tr>`
      : medications.map(m => `
          <tr>
            <td style="font-weight:bold; color:#0f172a; padding:8px 10px; border:1px solid #e2e8f0;">${m.Name}</td>
            <td style="font-family:monospace; font-weight:bold; padding:8px 10px; border:1px solid #e2e8f0;">${m.Dosage || '-'}</td>
            <td style="padding:8px 10px; border:1px solid #e2e8f0;">${m.Frequency || '-'}</td>
            <td style="color:#64748b; padding:8px 10px; border:1px solid #e2e8f0;">${m.Instructions || '-'}</td>
          </tr>
        `).join('');

    const visitsRows = visits.length === 0
      ? `<p style="color:#94a3b8; font-size:12px;">لا توجد زيارات مسجلة</p>`
      : visits.slice(0, 5).map(v => `
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:10px 14px; margin-bottom:8px;">
            <div style="display:flex; justify-content:space-between; font-size:12px; font-weight:bold; margin-bottom:4px;">
              <span>${v.DoctorName || 'طبيب'} (${v.Specialty || 'عام'}) - ${v.Clinic || ''}</span>
              <span style="color:#64748b; font-family:monospace;">${v.Date || ''}</span>
            </div>
            <div style="font-size:13px; font-weight:bold; color:#0f766e;">التشخيص: ${v.Diagnosis || '-'}</div>
            ${v.Notes ? `<div style="font-size:11px; color:#475569; margin-top:2px;">التوصيات: ${v.Notes}</div>` : ''}
          </div>
        `).join('');

    const vitalsCards = vitals.length === 0
      ? `<p style="color:#94a3b8; font-size:12px;">لا توجد قياسات مسجلة</p>`
      : vitals.slice(0, 4).map(v => `
          <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:8px 12px;">
            <div style="font-size:10px; font-weight:bold; color:#64748b;">${vitalNames[v.Type] || v.Type}</div>
            <div style="font-size:15px; font-weight:900; font-family:monospace; color:#0f172a;">${v.Value} <span style="font-size:11px; font-weight:normal; color:#64748b;">${v.Unit || ''}</span></div>
            <div style="font-size:9px; color:#94a3b8;">${new Date(v.Date || Date.now()).toLocaleDateString('ar-SA')}</div>
          </div>
        `).join('');

    return `
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>التقرير_الطبي_الشامل_${(patient.Name || 'مريض').replace(/\s+/g, '_')}</title>
        <style>
          @page { size: A4 portrait; margin: 12mm 15mm; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Cairo', 'Tajawal', sans-serif; direction: rtl; background: #ffffff; color: #1e293b; padding: 20px; max-width: 800px; margin: 0 auto; line-height: 1.5; }
          .report-header { border-bottom: 3px solid #1A73E8; padding-bottom: 14px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; }
          .brand { font-size: 24px; font-weight: 900; color: #1A73E8; }
          .brand-subtitle { font-size: 12px; font-weight: 700; color: #64748b; }
          .patient-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 14px 18px; margin-bottom: 16px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
          .field-label { font-size: 10px; font-weight: 700; color: #64748b; margin-bottom: 2px; }
          .field-val { font-size: 13px; font-weight: 800; color: #0f172a; }
          .alert-banner { background: #fef2f2; border: 1px solid #fecdd3; border-radius: 12px; padding: 10px 14px; margin-bottom: 16px; color: #991b1b; font-size: 12px; font-weight: 700; }
          .section-title { font-size: 14px; font-weight: 900; color: #1e3a8a; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 10px; margin-top: 16px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 14px; }
          th { background: #f1f5f9; color: #334155; padding: 8px 10px; text-align: right; border: 1px solid #cbd5e1; font-weight: 800; }
          td { padding: 8px 10px; border: 1px solid #e2e8f0; }
          .vitals-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 14px; }
          .footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 10px; color: #94a3b8; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="report-header">
          <div>
            <div class="brand">سِجِل | Sejel Health Record</div>
            <div class="brand-subtitle">التقرير الطبي الشامل وملخص المتابعة الصحية</div>
          </div>
          <div style="text-align:left; font-size:11px; color:#475569; font-weight:bold;">
            <div>تاريخ التقرير: ${todayStr}</div>
            <div>رقم الملف: ${patient.PatientID}</div>
          </div>
        </div>

        <div class="patient-box">
          <div><div class="field-label">اسم المريض:</div><div class="field-val">${patient.Name || 'المريض'}</div></div>
          <div><div class="field-label">تاريخ الميلاد:</div><div class="field-val">${patient.BirthDate || '-'} (${age} سنة)</div></div>
          <div><div class="field-label">فصيلة الدم:</div><div class="field-val">${patient.BloodType || 'O+'}</div></div>
          <div><div class="field-label">هاتف الطوارئ:</div><div class="field-val">${patient.EmergencyContactPhone || '-'}</div></div>
        </div>

        <div class="alert-banner">⚠️ الحساسيات والتحذيرات: ${patient.Allergies || 'لا توجد'}</div>
        <div class="section-title">💊 الأدوية والعلاجات الحالية:</div>
        <table><thead><tr><th>اسم الدواء</th><th>الجرعة</th><th>التكرار</th><th>التعليمات</th></tr></thead><tbody>${medsRows}</tbody></table>
        <div class="section-title">📊 آخر المؤشرات الحيوية:</div>
        <div class="vitals-grid">${vitalsCards}</div>
        <div class="section-title">🩺 سجل الزيارات:</div>
        <div>${visitsRows}</div>
        <div class="footer"><span>تم استخراج هذا التقرير عبر تطبيق سِجِل للرعاية الصحية.</span></div>
      </body>
      </html>
    `;
  },

  _printHtml(html) {
    const printIframe = document.createElement('iframe');
    printIframe.style.position = 'fixed';
    printIframe.style.right = '0';
    printIframe.style.bottom = '0';
    printIframe.style.width = '0';
    printIframe.style.height = '0';
    printIframe.style.border = '0';
    document.body.appendChild(printIframe);

    const doc = printIframe.contentWindow.document;
    doc.open();
    doc.write(html);
    doc.close();

    printIframe.onload = () => {
      setTimeout(() => {
        printIframe.contentWindow.focus();
        printIframe.contentWindow.print();
        setTimeout(() => {
          document.body.removeChild(printIframe);
        }, 2000);
      }, 500);
    };
  }
};

function calculateAge(birthDate) {
  if (!birthDate) return '-';
  const birth = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

export default printService;
