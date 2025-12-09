const mysql = require('mysql2');
require('dotenv').config();

console.log('🚀 Setting up Placement Management System...\n');

// Create database connection without specifying database first
const connection = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Madhu@2006'
});

// Create database if it doesn't exist
connection.query('CREATE DATABASE IF NOT EXISTS placement_management', (err) => {
  if (err) {
    console.error('❌ Error creating database:', err.message);
    console.log('\n💡 Please check your MySQL:');
    console.log('   1. Make sure MySQL server is running');
    console.log('   2. Check your MySQL credentials in .env file');
    process.exit(1);
  }
  
  console.log('✅ Database "placement_management" is ready');
  connection.end();
  
  console.log('\n🎉 Setup completed! Now run:');
  console.log('   npm run dev');
  console.log('\n📝 Default admin code: admin123');
});