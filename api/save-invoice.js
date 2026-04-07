import { google } from 'googleapis';
import { Readable } from 'stream';

export default async function handler(req, res) {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    refresh_token: process.env.GOOGLE_REFRESH_TOKEN
  });

  const drive = google.drive({ version: 'v3', auth: oauth2Client });

  // CASO 1: Obtener el contador (GET)
  if (req.method === 'GET') {
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
      return res.json({ lastNumber: 7 }); // Fallback inicial
    } catch (error) {
      return res.json({ lastNumber: 7 });
    }
  }

  // CASO 2: Guardar factura (POST)
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { fileName, pdfData, lastNumber } = req.body;

  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oauth2Client.setCredentials({
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN
    });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    const buffer = Buffer.from(pdfData, 'base64');
    
    // 1. Subir el PDF de la Factura
    const bufferStream = new Readable();
    bufferStream.push(buffer);
    bufferStream.push(null);

    await drive.files.create({
      requestBody: {
        name: fileName,
        parents: [process.env.GOOGLE_DRIVE_FOLDER_ID]
      },
      media: {
        mimeType: 'application/pdf',
        body: bufferStream
      }
    });

    // 2. Sincronizar el Contador en Drive (factura_counter.json)
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

    return res.status(200).json({ 
      success: true, 
      message: 'Guardado en Google Drive y Contador Sincronizado',
    });
  } catch (error) {
    console.error('Error en Vercel Drive:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
