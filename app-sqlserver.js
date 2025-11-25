const path = require('path');
const sql = require('mssql');
const axios = require('axios');
const fs = require('fs');
const os = require('os');
import dotenv from 'dotenv';

dotenv.config();

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  port: parseInt(process.env.DB_PORT, 10) || 1433,
  database: process.env.DB_NAME,
  authentication: {
    type: 'default'
  },
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_CERT === 'true'
  }
};

async function downloadImages() {
  try {
    // Conecta ao banco de dados
    await sql.connect(config);

    // Consulta os códigos de barras da tabela
    const result = await sql.query`${process.env.QUERY_SELECT}`; //SELECT codigoBarra from produto where codigoBarra <> ''
    const downloadsPath = path.join(os.homedir(), 'Downloads/image');

    // Para cada código de barras encontrado
    for (let record of result.recordset) {
      const barcode = record.codigoBarra;

      // Baixa a imagem se existir
      const imageUrl = `${process.env.URL_LINK}`; //http://www.eanpictures.com.br:9000/api/gtin/${barcode}
      axios({
        url: imageUrl,
        responseType: 'stream',
      }).then(response => {
        response.data.pipe(fs.createWriteStream(path.join(downloadsPath, `${barcode}.png`)));
      }).catch(error => {
        console.error(`Erro ao baixar a imagem para o código de barras ${barcode}:`, error);
      });
    }
  } catch (err) {
    console.error('Erro ao conectar ou consultar o banco de dados:', err);
  } finally {
    await sql.close();
  }
}

//Chamando a função para baixar as imagens
downloadImages();
