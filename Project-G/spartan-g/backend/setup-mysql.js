import mysql from 'mysql2/promise';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || '127.0.0.1',
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DATABASE || 'spartan_g',
});

async function setup() {
  const connection = await pool.getConnection();
  
  try {
    console.log('🔧 Setting up MySQL database...');
    
    // Read and execute schema
    const schema = fs.readFileSync('./sql/schema.sql', 'utf8');
    const statements = schema.split(';').filter(s => s.trim());
    
    for (const statement of statements) {
      if (statement.trim()) {
        console.log('Executing:', statement.substring(0, 50) + '...');
        await connection.query(statement);
      }
    }
    
    console.log('✓ Schema created successfully');
    
    // Add test data
    console.log('📝 Adding test students...');
    
    const testStudents = [
      ['STU001', 'Alice Johnson', 'alice@campus.edu', 'hashed_pwd_1', 'CICS', 3, 'F', 1, new Date().toISOString()],
      ['STU002', 'Bob Smith', 'bob@campus.edu', 'hashed_pwd_2', 'CICS', 2, 'M', 1, new Date().toISOString()],
      ['STU003', 'Carol White', 'carol@campus.edu', 'hashed_pwd_3', 'CBM', 4, 'F', 1, new Date().toISOString()],
      ['STU004', 'David Brown', 'david@campus.edu', 'hashed_pwd_4', 'CAS', 1, 'M', 1, new Date().toISOString()],
      ['STU005', 'Emma Davis', 'emma@campus.edu', 'hashed_pwd_5', 'CICS', 3, 'F', 1, new Date().toISOString()],
    ];
    
    for (const student of testStudents) {
      await connection.query(
        'INSERT IGNORE INTO students (student_id, name, email, password_hash, college, year_level, sex, consent_flag, registered_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        student
      );
    }
    
    console.log('✓ Test students added');
    console.log('\n✅ MySQL setup complete!');
    
    // Show summary
    const [students] = await connection.query('SELECT COUNT(*) as count FROM students');
    console.log(`📊 Total students in database: ${students[0].count}`);
    
  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  } finally {
    connection.release();
    await pool.end();
  }
}

setup();
