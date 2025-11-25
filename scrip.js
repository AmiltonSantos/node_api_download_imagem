const path = require('path');
const sql = require('mssql');
const axios = require('axios');
const fs = require('fs');
const os = require('os');

const config = {
  user: 'sa', // melhor armazenado em uma configuração de aplicativo como process.env.DB_USER
  password: 'senha@060115.',  // melhor armazenado em uma configuração de aplicativo como process.env.DB_PASSWORD
  server: '192.168.15.33', // melhor armazenado em uma configuração de aplicativo como process.env.DB_SERVER
  port: 1433, // opcional, o padrão é 1433, melhor armazenado em uma configuração de aplicativo como process.env.DB_PORT
  database: 'master', // melhor armazenado em uma configuração de aplicativo como process.env.DB_NAME
  authentication: {
      type: 'default'
  },
  options: {
      encrypt: true,
      trustServerCertificate: true, // Opção para conexões locais
  }
}

async function downloadImages() {
  try {
    // Conecta ao banco de dados
    await sql.connect(config);

    // Consulta os códigos de barras da tabela
    const result = await sql.query`SELECT codigoBarra from ARTNEW_INTERNO.dbo.produto where codigoBarra <> ''`;
    const downloadsPath = path.join(os.homedir(), 'Downloads/image');

    // Para cada código de barras encontrado
    for (let record of result.recordset) {
      const barcode = record.codigoBarra;

      // Baixa a imagem se existir
      const imageUrl = `http://www.eanpictures.com.br:9000/api/gtin/${barcode}`;
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
