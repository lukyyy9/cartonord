require('dotenv').config();

module.exports = {
  username: process.env.DB_USER || 'cartonord_user',
  password: process.env.DB_PASSWORD || 'cartonord_password',
  database: process.env.DB_NAME || 'cartonord',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
};