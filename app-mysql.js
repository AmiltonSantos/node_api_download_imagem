import path from 'path';
import axios from 'axios';
import fs from 'fs';
import os from 'os';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database:  process.env.DB_NAME,
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

/**
 * fs.promises.access() → verifica se o arquivo existe (sem travar o event loop).
 * fs.promises.unlink() → remove o arquivo antes de baixar o novo.
 * await new Promise(...) → espera o download terminar antes de seguir.
 * flags: 'w' → sobrescreve o arquivo se já existir (é o padrão, mas deixei explícito).
  */
async function downloadImages() {
  try {
    // Faz consulta no banco
    const [result] = await pool.query(
      `${process.env.QUERY_SELECT}`
    );

    const downloadsPath = path.join(os.homedir(), 'Downloads', 'image');
    await fs.promises.mkdir(downloadsPath, { recursive: true });

    for (const record of result) {
      const { produto_id, urlImagem, codigoBarra } = record;
      const imageUrl = `${urlImagem}`;
      const filePath = path.join(downloadsPath, `prod-${produto_id}-1.png`);

      try {
        // Primeiro verifica se a imagem existe no servidor
        const headCheck = await axios.head(imageUrl).catch(() => null);
        if (!headCheck || headCheck.status !== 200) {
          console.warn(`Imagem não encontrada: ${imageUrl}`);
          continue; // pula para o próximo item sem apagar o arquivo existente
        }

        // Agora sim, apaga o arquivo antigo (se existir)
        try {
          await fs.promises.access(filePath);
          await fs.promises.unlink(filePath);
          console.log(`Arquivo antigo substituído: ${filePath}`);
        } catch {
          // se não existir, ignora
        }

        // Faz o download da nova imagem
        const response = await axios({
          url: imageUrl,
          responseType: 'stream',
        });

        const writer = fs.createWriteStream(filePath, { flags: 'w' });
        response.data.pipe(writer);

        await new Promise((resolve, reject) => {
          writer.on('finish', resolve);
          writer.on('error', reject);
        });

        console.log(`Imagem baixada: ${filePath}`);
      } catch (error) {
        console.error(
          `Erro ao processar imagem (${codigoBarra}): ${error.message}`
        );
      }
    }
  } catch (err) {
    console.error('Erro ao conectar ou consultar o banco de dados:', err.message);
  }
}

// Chamando a função
downloadImages();