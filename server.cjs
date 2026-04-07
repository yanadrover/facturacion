const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const { google } = require('googleapis');
require('dotenv').config();

const app = express();
const PORT = 5001;

// Configuración de Google Drive
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  'http://localhost:3000'
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN
});

const drive = google.drive({ version: 'v3', auth: oauth2Client });

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));

// Obtener el contador GLOBAL desde Drive
app.get('/get-counter', async (req, res) => {
  try {
    const listResponse = await drive.files.list({
      q: `name = 'factura_counter.json' and '${process.env.GOOGLE_DRIVE_FOLDER_ID}' in parents and trashed = false`,
      fields: 'files(id)'
    });

    const counterFile = listResponse.data.files[0];
    if (counterFile) {
      const fileContent = await drive.files.get({
        fileId: counterFile.id,
        alt: 'media'
      });
      return res.json(fileContent.data);
    }
    
    // Si no hay archivo en Drive, intentar local
    const localLocal = await fs.readJson('./factura_counter.json').catch(() => ({ lastNumber: 7 }));
    res.json(localLocal);
  } catch (err) {
    res.json({ lastNumber: 7 }); // Fallback inicial
  }
});

const TARGET_DIR = '/Users/y/Desktop/facturacion';

app.post('/save-invoice', async (req, res) => {
  const { fileName, pdfData, lastNumber } = req.body;
  
  try {
    // 1. Guardar LOCALMENTE en el Mac
    await fs.ensureDir(TARGET_DIR);
    const filePath = path.join(TARGET_DIR, fileName);
    const buffer = Buffer.from(pdfData, 'base64');
    await fs.writeFile(filePath, buffer);

    // 2. Subir a GOOGLE DRIVE
    const { Readable } = require('stream');
    const bufferStream = new Readable();
    bufferStream.push(buffer);
    bufferStream.push(null);

    const driveResponse = await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [process.env.GOOGLE_DRIVE_FOLDER_ID]
      },
      media: {
        mimeType: 'application/pdf',
        body: bufferStream
      }
    });

    console.log(`✅ Factura ${fileName} guardada en Drive: ${driveResponse.data.id}`);

    // 3. Sincronizar el Contador en Drive (factura_counter.json) - GLOBAL SYNC
    const listResponse = await drive.files.list({
      q: `name = 'factura_counter.json' and '${process.env.GOOGLE_DRIVE_FOLDER_ID}' in parents and trashed = false`,
      fields: 'files(id)'
    });

    const counterFile = listResponse.data.files[0];
    const counterContent = JSON.stringify({ lastNumber });

    if (counterFile) {
      await drive.files.update({
        fileId: counterFile.id,
        media: {
          mimeType: 'application/json',
          body: counterContent
        }
      });
    } else {
      await drive.files.create({
        requestBody: {
          name: 'factura_counter.json',
          parents: [process.env.GOOGLE_DRIVE_FOLDER_ID]
        },
        media: {
          mimeType: 'application/json',
          body: counterContent
        }
      });
    }

    // Guardar también copia local del contador por seguridad
    await fs.writeJson('./factura_counter.json', { lastNumber });

    res.json({ success: true, message: 'Guardado en Mac y Drive (Contador Sincronizado)', driveId: driveResponse.data.id });
  } catch (err) {
    console.error('Error al guardar:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Motor de facturación activo en puerto ${PORT}`);
});
