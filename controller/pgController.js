const { request, response } = require('express');
const pool = require('../config/bd_config');
const { Pool } = require('pg');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const { badRequest, notFound, internalServer } = require('../utils/errors');
const BACKUP_DIR = process.env.BACKUP_DIR;

// Asegurar que el directorio de backups existe
(async () => {
  try {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
    console.log(`Directorio de backups asegurado: ${BACKUP_DIR}`);
  } catch (err) {
    console.error('Error al crear directorio de backups:', err.message);
    process.exit(1);
  }
})();

class PgController {
  async getDatabase(req = request, res = response, next) {
    try {
      const result = await pool.query(
        "SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname;"
      );
      const databases = result.rows.map(row => row.datname);
      res.json({ success: true, databases });
    } catch (error) {
      next(internalServer('Error al obtener la lista de bases de datos'));
    }
  }

  async meackBackup(req = request, res = response, next) {
    const { name } = req.params;
  
    if (!name) {
      return next(badRequest('El nombre de la base de datos es requerido'));
    }
  
    const escapeSqlValue = (val) => {
      if (val === null || val === undefined) return 'NULL';
      if (typeof val === 'boolean') return val ? 'true' : 'false';
      if (typeof val === 'number') return val.toString();
      if (val instanceof Date) return `'${val.toISOString()}'`;
      return `'${val.toString().replace(/'/g, "''")}'`;
    };
  
    const backupPool = new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: name,
    });
  
    const client = await backupPool.connect();
  
    try {
      await fs.mkdir(BACKUP_DIR, { recursive: true });
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(BACKUP_DIR, `${name}_${timestamp}.sql`);
      const writeStream = require('fs').createWriteStream(backupFile);
  
      writeStream.write(`-- Backup generado el ${new Date().toLocaleString()}\n`);
      writeStream.write(`-- Base de datos: ${name}\n`);
      writeStream.write(`-- Compatible con restauración mediante psql o este API\n\n`);
      writeStream.write(`BEGIN;\n\n`);
  
      // ========== 1. ENUMS (con comillas dobles y verificación de existencia) ==========
      const enumRes = await client.query(`
        SELECT t.typname AS enum_name, 
               array_agg(e.enumlabel ORDER BY e.enumsortorder) AS enum_labels
        FROM pg_type t
        JOIN pg_enum e ON t.oid = e.enumtypid
        WHERE t.typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
        GROUP BY t.typname;
      `);
  
      for (const enumRow of enumRes.rows) {
        let enumName = enumRow.enum_name;
        let labels = enumRow.enum_labels;
        if (!Array.isArray(labels)) {
          if (typeof labels === 'string') {
            labels = labels.slice(1, -1).split(',');
          } else {
            labels = [];
          }
        }
        const labelsEscaped = labels.map(l => `'${l.replace(/'/g, "''")}'`).join(', ');
  
        // Usar comillas dobles para el nombre del tipo
        writeStream.write(`DO $$\n`);
        writeStream.write(`BEGIN\n`);
        writeStream.write(`    IF NOT EXISTS (\n`);
        writeStream.write(`        SELECT 1 FROM pg_type WHERE typname = '${enumName}' \n`);
        writeStream.write(`        AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')\n`);
        writeStream.write(`    ) THEN\n`);
        writeStream.write(`        CREATE TYPE "public"."${enumName}" AS ENUM (${labelsEscaped});\n`);
        writeStream.write(`    END IF;\n`);
        writeStream.write(`END$$;\n\n`);
      }
      if (enumRes.rows.length > 0) writeStream.write('\n');
  
      // ========== 2. SECUENCIAS ==========
      const seqRes = await client.query(`
        SELECT sequence_name 
        FROM information_schema.sequences 
        WHERE sequence_schema = 'public';
      `);
      for (const seq of seqRes.rows) {
        const seqName = seq.sequence_name;
        writeStream.write(`CREATE SEQUENCE IF NOT EXISTS "public"."${seqName}";\n`);
      }
      if (seqRes.rows.length > 0) writeStream.write('\n');
  
      // ========== 3. TABLAS ==========
      const tablesRes = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        ORDER BY table_name;
      `);
      const tables = tablesRes.rows.map(row => row.table_name);
  
      for (const table of tables) {
        console.log(`Respaldando tabla: ${table}`);
  
        // Obtener columnas
        const columnsRes = await client.query(`
          SELECT column_name, udt_name, is_nullable, column_default
          FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = $1
          ORDER BY ordinal_position;
        `, [table]);
  
        // Generar definición de columnas con nombres entre comillas dobles
        const columnDefs = columnsRes.rows.map(col => {
          const colName = `"${col.column_name}"`;
          let def = `  ${colName} ${col.udt_name}`;
          if (col.is_nullable === 'NO') def += ' NOT NULL';
          if (col.column_default) {
            // Reemplazar regclass por algo seguro (opcional, se deja igual)
            def += ` DEFAULT ${col.column_default}`;
          }
          return def;
        }).join(',\n');
  
        writeStream.write(`CREATE TABLE IF NOT EXISTS "public"."${table}" (\n${columnDefs}\n);\n\n`);
  
        // ========== 4. DATOS DE LA TABLA ==========
const dataRes = await client.query(`SELECT * FROM "public"."${table}"`);
if (dataRes.rows.length > 0) {
  writeStream.write(`-- Datos para "public"."${table}"\n`);
  // Eliminar registros existentes para evitar duplicados
  writeStream.write(`DELETE FROM "public"."${table}";\n`);
  for (const row of dataRes.rows) {
    const columns = Object.keys(row).map(c => `"${c}"`).join(', ');
    const values = Object.values(row).map(v => escapeSqlValue(v)).join(', ');
    writeStream.write(`INSERT INTO "public"."${table}" (${columns}) VALUES (${values});\n`);
  }
  writeStream.write('\n');
}
        // ========== 5. ACTUALIZAR SECUENCIA SI ES SERIAL ==========
        const serialCol = columnsRes.rows.find(col => 
          col.column_default && col.column_default.includes('nextval')
        );
        if (serialCol) {
          const colName = serialCol.column_name;
          const maxIdRes = await client.query(`SELECT MAX("${colName}") FROM "public"."${table}"`);
          const maxId = maxIdRes.rows[0].max;
          if (maxId) {
            // Intentar adivinar el nombre de la secuencia (convención)
            const seqName = `${table}_${colName}_seq`;
            writeStream.write(`SELECT setval('"public"."${seqName}"', ${maxId}, true);\n`);
          }
        }
      }
  
      writeStream.write(`COMMIT;\n`);
      writeStream.end();
  
      await new Promise((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });
  
      client.release();
      await backupPool.end();
  
      res.json({
        success: true,
        message: 'Backup nativo creado exitosamente (con soporte para mayúsculas)',
        file: backupFile
      });
  
    } catch (error) {
      client.release();
      await backupPool.end();
      console.error('Error en backup nativo:', error);
      next(internalServer(`Error al crear backup: ${error.message}`));
    }
  }
  async restoreBackup(req = request, res = response, next) {
    const { name } = req.params; // nombre de la BD destino
    let { backupFile } = req.body; // opcional
  
    if (!name) {
      return next(badRequest('El nombre de la base de datos es requerido'));
    }
  
    // Si no se proporcionó backupFile, buscar el más reciente
    if (!backupFile) {
      try {
        const files = await fs.readdir(BACKUP_DIR);
        // Filtrar archivos que empiecen con name_ y terminen en .sql
        const backups = files
          .filter(f => f.startsWith(`${name}_`) && f.endsWith('.sql'))
          .map(f => ({
            name: f,
            path: path.join(BACKUP_DIR, f),
            // Extraer timestamp del nombre (asumiendo formato YYYY-MM-DDTHH-mm-ss-...Z)
            // El timestamp es después de name_ y antes de .sql
            timestamp: f.slice(name.length + 1, -4) // elimina 'nombre_' y '.sql'
          }))
          .sort((a, b) => b.timestamp.localeCompare(a.timestamp)); // más reciente primero
  
        if (backups.length === 0) {
          return next(notFound(`No hay backups disponibles para la base de datos '${name}'`));
        }
  
        backupFile = backups[0].path;
        console.log(`Usando backup automático: ${backupFile}`);
      } catch (error) {
        return next(internalServer(`Error al leer directorio de backups: ${error.message}`));
      }
    } else {
      // Si se proporcionó, verificar que existe
      try {
        await fs.access(backupFile, fs.constants.R_OK);
      } catch (error) {
        return next(notFound(`El archivo de backup no existe o no es legible: ${backupFile}`));
      }
    }
  
    // Leer el archivo SQL
    let sqlContent;
    try {
      sqlContent = await fs.readFile(backupFile, 'utf8');
    } catch (error) {
      return next(internalServer(`No se pudo leer el archivo: ${error.message}`));
    }
  
    // Conectar a la base de datos destino
    const restorePool = new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: name,
    });
  
    const client = await restorePool.connect();
  
    try {
      // Ejecutar el script SQL (que ya contiene BEGIN y COMMIT)
      await client.query(sqlContent);
  
      res.json({
        success: true,
        message: `Base de datos '${name}' restaurada exitosamente desde ${backupFile}`
      });
  
    } catch (error) {
      console.error('Error en restauración:', error);
      // Nota: el script ya tiene BEGIN/COMMIT, pero si ocurre un error, PostgreSQL hará rollback automático
      next(internalServer(`Error al restaurar: ${error.message}`));
    } finally {
      client.release();
      await restorePool.end();
    }
  }
}

module.exports = PgController;