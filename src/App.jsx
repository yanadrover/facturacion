import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';

function App() {
  const [formData, setFormData] = useState({
    clientName: '',
    clientDetails: '',
    concept: '',
    baseAmount: 0,
    date: new Date().toLocaleDateString('es-ES'),
    invoiceNo: 'F2600008'
  });
  const [status, setStatus] = useState('');

  // Cargar número sugerido
  useEffect(() => {
    fetch('http://localhost:5001/status').catch(() => {}); // Opcional para check
    const savedNo = localStorage.getItem('lastInvoiceNo');
    if (savedNo) {
      const num = parseInt(savedNo.replace('F26', '')) + 1;
      setFormData(prev => ({ ...prev, invoiceNo: `F26${String(num).padStart(5, '0')}` }));
    }
  }, []);

  const iva = formData.baseAmount * 0.21;
  const irpf = formData.baseAmount * 0.07;
  const total = formData.baseAmount + iva - irpf;

  const handleGenerateAndSave = async () => {
    setStatus('⚙️ Dibujando PDF Nativo...');
    
    // Crear PDF A4 (210 x 297 mm)
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const marginX = 20;
    let currentY = 20;

    // --- CABECERA ---
    pdf.setTextColor(74, 144, 226); // Azul #4a90e2
    pdf.setFontSize(22);
    pdf.setFont('helvetica', 'bold');
    pdf.text('FACTURA', pageWidth - marginX, currentY, { align: 'right' });
    
    currentY += 8;
    pdf.setFontSize(10);
    pdf.setTextColor(0, 0, 0);
    pdf.text(`N.o : ${formData.invoiceNo}`, pageWidth - marginX, currentY, { align: 'right' });
    
    currentY += 5;
    pdf.text(`Fecha de emisión : ${formData.date}`, pageWidth - marginX, currentY, { align: 'right' });

    // --- LOGO Y EMISOR ---
    currentY = 20;
    // Dibujo simple del diente de león (SVG aproximado)
    pdf.setDrawColor(58, 58, 58);
    pdf.circle(marginX + 5, currentY + 10, 1, 'F');
    for (let i = 0; i < 16; i++) {
      const angle = i * (Math.PI / 8);
      pdf.line(marginX + 5, currentY + 10, marginX + 5 + 10 * Math.cos(angle), currentY + 10 + 10 * Math.sin(angle));
    }
    pdf.line(marginX + 5, currentY + 10, marginX + 5, currentY + 25);

    currentY += 30;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(10);
    pdf.text('Emilie Isabelle Michèle Dreyer-Dufer', marginX, currentY);
    
    pdf.setFont('helvetica', 'normal');
    currentY += 5;
    pdf.text('Lg venda de safragell 1', marginX, currentY);
    currentY += 5;
    pdf.text('07812, SANT LLORENÇ DE BALAFIA', marginX, currentY);
    currentY += 5;
    pdf.text('Islas Baleares, España', marginX, currentY);
    currentY += 5;
    pdf.text('NIE: Y9864002Y', marginX, currentY);
    currentY += 5;
    pdf.text('Tel: +34 613 854 903', marginX, currentY);
    currentY += 5;
    pdf.text('Email: ecoyraiz@gmail.com', marginX, currentY);

    // --- CLIENTE ---
    currentY += 15;
    pdf.setFont('helvetica', 'bold');
    pdf.text('Para:', marginX, currentY);
    
    currentY += 10;
    pdf.text(formData.clientName, marginX, currentY);
    
    pdf.setFont('helvetica', 'normal');
    const clientLines = pdf.splitTextToSize(formData.clientDetails, pageWidth - marginX * 2);
    currentY += 5;
    pdf.text(clientLines, marginX, currentY);
    currentY += clientLines.length * 5;

    // --- CONCEPTO ---
    currentY += 15;
    pdf.setFont('helvetica', 'bold');
    pdf.text('Concepto', pageWidth / 2, currentY, { align: 'center' });
    pdf.line(pageWidth / 2 - 10, currentY + 1, pageWidth / 2 + 10, currentY + 1);
    
    currentY += 10;
    const conceptLines = pdf.splitTextToSize(formData.concept, pageWidth - marginX * 2);
    pdf.setFont('helvetica', 'normal');
    pdf.text(conceptLines, marginX, currentY);
    currentY += conceptLines.length * 5 + 10;

    // --- TABLA DE CÁLCULOS ---
    const tableX = marginX;
    const col1Width = 80;
    const col2Width = 40;
    
    pdf.setDrawColor(0);
    pdf.rect(tableX, currentY, col1Width + col2Width, 40); // Borde exterior
    pdf.line(tableX + col1Width, currentY, tableX + col1Width, currentY + 40); // Divisor vertical
    
    const rowHeight = 10;
    pdf.line(tableX, currentY + rowHeight, tableX + col1Width + col2Width, currentY + rowHeight);
    pdf.line(tableX, currentY + rowHeight * 2, tableX + col1Width + col2Width, currentY + rowHeight * 2);
    pdf.line(tableX, currentY + rowHeight * 3, tableX + col1Width + col2Width, currentY + rowHeight * 3);

    pdf.text('base imponible', tableX + 5, currentY + 7);
    pdf.text(`${formData.baseAmount.toFixed(2)} EUR`, tableX + col1Width + col2Width - 5, currentY + 7, { align: 'right' });
    
    pdf.text('IVA 21%', tableX + 5, currentY + 17);
    pdf.text(`${iva.toFixed(2)} EUR`, tableX + col1Width + col2Width - 5, currentY + 17, { align: 'right' });
    
    pdf.text('Retención IRPF (7%)', tableX + 5, currentY + 27);
    pdf.text(`-${irpf.toFixed(2)} EUR`, tableX + col1Width + col2Width - 5, currentY + 27, { align: 'right' });
    
    pdf.setFont('helvetica', 'bold');
    pdf.text('TOTAL', tableX + 5, currentY + 37);
    pdf.text(`${total.toFixed(2)} EUR`, tableX + col1Width + col2Width - 5, currentY + 37, { align: 'right' });

    currentY += 50;

    // --- DATOS BANCARIOS ---
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.text('Datos bancarios:', marginX, currentY);
    pdf.setFont('helvetica', 'normal');
    currentY += 5;
    pdf.text('Emilie Isabelle Michèle Dreyer-Dufer', marginX, currentY);
    currentY += 5;
    pdf.text(`IBAN: ES47 1583 0001 1290 0302 6298`, marginX, currentY);
    currentY += 5;
    pdf.text('BIC: REVOESM2', marginX, currentY);
    currentY += 10;
    pdf.text('Revolut Bank UAB', marginX, currentY);
    currentY += 5;
    pdf.text('Calle Príncipe de Vergara 132, 4 planta, 28002, Madrid, Spain', marginX, currentY);

    // --- FOOTER ---
    currentY += 20;
    pdf.setFont('helvetica', 'bolditalic');
    pdf.setFontSize(11);
    pdf.text(`Por favor, indicar el número de factura ${formData.invoiceNo} al realizar la transferencia.`, marginX, currentY);

    // Decoración abajo derecha
    const pageHeight = pdf.internal.pageSize.getHeight();
    pdf.setDrawColor(200, 200, 200);
    const decorX = pageWidth - 45;
    const decorY = pageHeight - 45;
    for (let i = 0; i < 15; i++) {
        pdf.line(decorX + 15, decorY + 15, decorX + 15 + Math.random()*20, decorY + 15 + Math.random()*20);
    }

    const pdfBase64 = pdf.output('datauristring').split(',')[1];
    const fileName = `Factura_${formData.invoiceNo}_${formData.clientName.replace(/\s+/g, '_')}.pdf`;

    try {
      const response = await fetch(`${apiBase}/save-invoice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName,
          pdfData: pdfBase64,
          lastNumber: parseInt(formData.invoiceNo.replace('F26', ''))
        })
      });

      const result = await response.json();
      if (result.success) {
        setStatus(`✅ ¡Guardada en ${isLocal ? 'Mac y Drive' : 'Google Drive'}!`);
        localStorage.setItem('lastInvoiceNo', formData.invoiceNo);
        const nextNum = parseInt(formData.invoiceNo.replace('F26', '')) + 1;
        setFormData(prev => ({ ...prev, invoiceNo: `F26${String(nextNum).padStart(5, '0')}` }));
      } else {
        setStatus('❌ Error al guardar.');
      }
    } catch (err) {
      setStatus('✅ Factura descargada.');
      pdf.save(fileName);
    }
  };

  return (
    <div className="app-container">
      <div className="input-panel">
        <h1>Facturación Simplificada 🚀</h1>
        <p style={{ color: '#666', fontSize: '14px', margin: '-10px 0 20px 0' }}>Con amor para Yan & Emilie ✨</p>
        
        <div className="form-group">
          <label>Nº Factura</label>
          <input 
            type="text" 
            value={formData.invoiceNo} 
            onChange={(e) => setFormData({...formData, invoiceNo: e.target.value})} 
          />
        </div>

        <div className="form-group">
          <label>Cliente (Nombre)</label>
          <input 
            type="text" 
            value={formData.clientName} 
            onChange={(e) => setFormData({...formData, clientName: e.target.value})} 
          />
        </div>

        <div className="form-group">
          <label>Detalles del Cliente</label>
          <textarea 
            rows="4"
            value={formData.clientDetails} 
            onChange={(e) => setFormData({...formData, clientDetails: e.target.value})} 
          />
        </div>

        <div className="form-group">
          <label>Concepto</label>
          <textarea 
            rows="3"
            value={formData.concept} 
            onChange={(e) => setFormData({...formData, concept: e.target.value})} 
          />
        </div>

        <div className="form-group">
          <label>Base Imponible (€)</label>
          <input 
            type="number" 
            value={formData.baseAmount} 
            onChange={(e) => setFormData({...formData, baseAmount: parseFloat(e.target.value) || 1 })} 
          />
        </div>

        <button className="action-btn" onClick={handleGenerateAndSave}>
          GENERAR Y GUARDAR 📁
        </button>
        
        {status && <div style={{ 
          marginTop: '20px', 
          padding: '15px', 
          borderRadius: '8px', 
          background: status.includes('✅') ? '#e6fffa' : '#fff5f5',
          color: status.includes('✅') ? '#2c7a7b' : '#c53030',
          fontWeight: '600'
        }}>{status}</div>}
      </div>

      <div className="preview-panel">
        <div id="invoice-to-print" className="invoice-sheet">
          <div className="invoice-header">
            <div className="logo-section">
               {/* Logo Minimalista Diente de León */}
               <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="100" cy="180" r="4" fill="#3a3a3a"/>
                  <path d="M100 180V100" stroke="#3a3a3a" strokeWidth="2"/>
                  {[...Array(16)].map((_, i) => (
                    <line 
                      key={i}
                      x1="100" y1="100" 
                      x2={100 + 60 * Math.cos(i * (Math.PI / 8))} 
                      y2={100 + 60 * Math.sin(i * (Math.PI / 8))} 
                      stroke="#3a3a3a" 
                      strokeWidth="1"
                    />
                  ))}
               </svg>
            </div>
            <div className="title-section">
              <h2 className="factura-title">FACTURA</h2>
              <p className="factura-no">N.o : {formData.invoiceNo}</p>
              <p className="issue-date">Fecha de emisión : {formData.date}</p>
            </div>
          </div>

          <div className="issuer-details">
            <strong>Emilie Isabelle Michèle Dreyer-Dufer</strong><br />
            Lg venda de safragell 1<br />
            07812, SANT LLORENÇ DE BALAFIA<br />
            Islas Baleares, España<br />
            NIE: Y9864002Y<br />
            Tel: +34 613 854 903<br />
            Email: ecoyraiz@gmail.com
          </div>

          <div className="client-section">
            <div className="client-label">Para:</div>
            <div className="client-info">
              <strong>{formData.clientName}</strong><br />
              <div style={{ whiteSpace: 'pre-line' }}>{formData.clientDetails}</div>
            </div>
          </div>

          <div className="concept-box">
            <span className="concept-title">Concepto</span>
            <div style={{ whiteSpace: 'pre-line', fontWeight: '500' }}>{formData.concept}</div>
          </div>

          <table className="calc-table">
            <tbody>
              <tr>
                <td>base imponible</td>
                <td>{formData.baseAmount.toLocaleString('de-DE', { minimumFractionDigits: 2 })} EUR</td>
              </tr>
              <tr>
                <td>IVA 21%</td>
                <td>{iva.toLocaleString('de-DE', { minimumFractionDigits: 2 })} EUR</td>
              </tr>
              <tr>
                <td>Retención IRPF (7%)</td>
                <td>-{irpf.toLocaleString('de-DE', { minimumFractionDigits: 2 })} EUR</td>
              </tr>
              <tr className="total-row">
                <td>TOTAL</td>
                <td>{total.toLocaleString('de-DE', { minimumFractionDigits: 2 })} EUR</td>
              </tr>
            </tbody>
          </table>

          <div className="bank-details">
            <strong>Datos bancarios:</strong><br />
            Emilie Isabelle Michèle Dreyer-Dufer<br />
            IBAN: ES47 1583 0001 1290 0302 6298<br />
            BIC: REVOESM2<br /><br />
            Revolut Bank UAB<br />
            Calle Príncipe de Vergara 132, 4 planta, 28002, Madrid, Spain
          </div>

          <div className="footer-note">
            Por favor, indicar el número de factura {formData.invoiceNo} al realizar la transferencia.
          </div>

          <div className="dandelion-decor" style={{ right: '-30px', bottom: '-20px' }}>
             <svg viewBox="0 0 200 200" fill="none" opacity="0.3" xmlns="http://www.w3.org/2000/svg">
                {[...Array(30)].map((_, i) => (
                  <path 
                    key={i}
                    d={`M100 100 Q 150 ${50 + i*5} ${180 + Math.random()*20} ${100 + Math.random()*50}`}
                    stroke="#3a3a3a" 
                    strokeWidth="0.3"
                  />
                ))}
             </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
