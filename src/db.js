const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'comp_intel.db');
const db = new sqlite3.Database(dbPath);

// Helper to run query as Promise
const run = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

// Helper to get all records as Promise
const all = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

// Helper to get a single record as Promise
const get = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

async function initDb() {
  console.log('Initializing database...');

  // Create Companies table
  await run(`
    CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      logo_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Create Level Mappings table
  await run(`
    CREATE TABLE IF NOT EXISTS level_mappings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
      level_name TEXT NOT NULL,
      standard_level TEXT NOT NULL,
      UNIQUE(company_id, level_name)
    )
  `);

  // Create Salaries table
  await run(`
    CREATE TABLE IF NOT EXISTS salaries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER REFERENCES companies(id) ON DELETE CASCADE,
      level_name TEXT NOT NULL,
      standard_level TEXT NOT NULL,
      title TEXT NOT NULL,
      location TEXT NOT NULL,
      base_salary REAL NOT NULL,
      stock_grant REAL DEFAULT 0,
      bonus REAL DEFAULT 0,
      total_compensation REAL NOT NULL,
      years_of_experience REAL NOT NULL,
      years_at_company REAL NOT NULL,
      verification_status TEXT DEFAULT 'unverified',
      duplicate_hash TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Insert seed data
  await seedData();
}

async function seedData() {
  // Check if companies exist
  const count = await get('SELECT COUNT(*) as count FROM companies');
  if (count.count > 0) {
    console.log('Database already has data. Skipping seeding.');
    return;
  }

  console.log('Seeding baseline companies, levels, and salaries...');

  const companies = [
    { name: 'Google', logo: 'https://cdn.pixabay.com/photo/2015/10/31/12/54/google-1015752_1280.png' },
    { name: 'Meta', logo: 'https://cdn.pixabay.com/photo/2021/12/14/22/29/meta-6871457_1280.png' },
    { name: 'Microsoft', logo: 'https://cdn.pixabay.com/photo/2013/02/12/09/07/microsoft-80658_1280.png' },
    { name: 'Amazon', logo: 'https://cdn.pixabay.com/photo/2014/04/02/10/53/shopping-cart-304854_1280.png' },
    { name: 'Apple', logo: 'https://cdn.pixabay.com/photo/2013/07/18/10/56/apple-163673_1280.png' }
  ];

  for (const c of companies) {
    await run('INSERT INTO companies (name, logo_url) VALUES (?, ?)', [c.name, c.logo]);
  }

  // Get company ids
  const companyRows = await all('SELECT id, name FROM companies');
  const companyMap = {};
  companyRows.forEach(row => {
    companyMap[row.name] = row.id;
  });

  // Level Mappings
  const mappings = [
    // Google
    { company: 'Google', level: 'L3', standard: 'Entry' },
    { company: 'Google', level: 'L4', standard: 'Mid' },
    { company: 'Google', level: 'L5', standard: 'Senior' },
    { company: 'Google', level: 'L6', standard: 'Staff' },
    { company: 'Google', level: 'L7', standard: 'Principal' },

    // Meta
    { company: 'Meta', level: 'E3', standard: 'Entry' },
    { company: 'Meta', level: 'E4', standard: 'Mid' },
    { company: 'Meta', level: 'E5', standard: 'Senior' },
    { company: 'Meta', level: 'E6', standard: 'Staff' },
    { company: 'Meta', level: 'E7', standard: 'Principal' },

    // Microsoft
    { company: 'Microsoft', level: '59', standard: 'Entry' },
    { company: 'Microsoft', level: '61', standard: 'Mid' },
    { company: 'Microsoft', level: '63', standard: 'Senior' },
    { company: 'Microsoft', level: '65', standard: 'Staff' },
    { company: 'Microsoft', level: '67', standard: 'Principal' },

    // Amazon
    { company: 'Amazon', level: 'L4', standard: 'Entry' },
    { company: 'Amazon', level: 'L5', standard: 'Mid' },
    { company: 'Amazon', level: 'L6', standard: 'Senior' },
    { company: 'Amazon', level: 'L7', standard: 'Staff' },
    { company: 'Amazon', level: 'L8', standard: 'Principal' },

    // Apple
    { company: 'Apple', level: 'ICT2', standard: 'Entry' },
    { company: 'Apple', level: 'ICT3', standard: 'Mid' },
    { company: 'Apple', level: 'ICT4', standard: 'Senior' },
    { company: 'Apple', level: 'ICT5', standard: 'Staff' },
    { company: 'Apple', level: 'ICT6', standard: 'Principal' }
  ];

  for (const m of mappings) {
    const companyId = companyMap[m.company];
    await run('INSERT INTO level_mappings (company_id, level_name, standard_level) VALUES (?, ?, ?)', [
      companyId,
      m.level,
      m.standard
    ]);
  }

  // Helper function to calculate hash for seed data
  const crypto = require('crypto');
  const computeHash = (cId, level, title, loc, base, stock, bonus, yoe) => {
    const rawStr = `${cId}|${level.toLowerCase()}|${title.toLowerCase()}|${loc.toLowerCase()}|${base}|${stock}|${bonus}|${yoe}`;
    return crypto.createHash('sha256').update(rawStr).digest('hex');
  };

  // Seed salaries
  const salaries = [
    // Google L3
    { company: 'Google', level: 'L3', standard: 'Entry', title: 'Software Engineer', location: 'San Francisco, CA', base: 142000, stock: 45000, bonus: 20000, yoe: 1, yac: 1 },
    { company: 'Google', level: 'L3', standard: 'Entry', title: 'Software Engineer', location: 'Mountain View, CA', base: 138000, stock: 40000, bonus: 18000, yoe: 0, yac: 0 },
    // Google L4
    { company: 'Google', level: 'L4', standard: 'Mid', title: 'Software Engineer', location: 'New York, NY', base: 168000, stock: 85000, bonus: 25000, yoe: 3, yac: 2 },
    { company: 'Google', level: 'L4', standard: 'Mid', title: 'Software Engineer', location: 'San Francisco, CA', base: 172000, stock: 90000, bonus: 28000, yoe: 4, yac: 1 },
    // Google L5
    { company: 'Google', level: 'L5', standard: 'Senior', title: 'Software Engineer', location: 'Mountain View, CA', base: 210000, stock: 160000, bonus: 40000, yoe: 7, yac: 3 },
    { company: 'Google', level: 'L5', standard: 'Senior', title: 'Software Engineer', location: 'Seattle, WA', base: 195000, stock: 145000, bonus: 35000, yoe: 6, yac: 2 },
    // Google L6
    { company: 'Google', level: 'L6', standard: 'Staff', title: 'Software Engineer', location: 'Mountain View, CA', base: 255000, stock: 280000, bonus: 65000, yoe: 11, yac: 5 },
    // Google L7
    { company: 'Google', level: 'L7', standard: 'Principal', title: 'Software Engineer', location: 'San Francisco, CA', base: 310000, stock: 450000, bonus: 95000, yoe: 15, yac: 8 },

    // Meta E3
    { company: 'Meta', level: 'E3', standard: 'Entry', title: 'Software Engineer', location: 'Menlo Park, CA', base: 135000, stock: 50000, bonus: 15000, yoe: 1, yac: 1 },
    { company: 'Meta', level: 'E3', standard: 'Entry', title: 'Software Engineer', location: 'Seattle, WA', base: 130000, stock: 45000, bonus: 13000, yoe: 0, yac: 0 },
    // Meta E4
    { company: 'Meta', level: 'E4', standard: 'Mid', title: 'Software Engineer', location: 'Menlo Park, CA', base: 165000, stock: 95000, bonus: 20000, yoe: 3, yac: 1.5 },
    { company: 'Meta', level: 'E4', standard: 'Mid', title: 'Software Engineer', location: 'New York, NY', base: 168000, stock: 100000, bonus: 22000, yoe: 4, yac: 2 },
    // Meta E5
    { company: 'Meta', level: 'E5', standard: 'Senior', title: 'Software Engineer', location: 'Menlo Park, CA', base: 205000, stock: 185000, bonus: 38000, yoe: 8, yac: 3 },
    { company: 'Meta', level: 'E5', standard: 'Senior', title: 'Software Engineer', location: 'Seattle, WA', base: 198000, stock: 170000, bonus: 35000, yoe: 7, yac: 2 },
    // Meta E6
    { company: 'Meta', level: 'E6', standard: 'Staff', title: 'Software Engineer', location: 'New York, NY', base: 260000, stock: 320000, bonus: 70000, yoe: 12, yac: 4 },
    // Meta E7
    { company: 'Meta', level: 'E7', standard: 'Principal', title: 'Software Engineer', location: 'Menlo Park, CA', base: 315000, stock: 520000, bonus: 110000, yoe: 16, yac: 6 },

    // Microsoft 59
    { company: 'Microsoft', level: '59', standard: 'Entry', title: 'Software Engineer', location: 'Redmond, WA', base: 120000, stock: 20000, bonus: 12000, yoe: 0, yac: 0 },
    // Microsoft 61
    { company: 'Microsoft', level: '61', standard: 'Mid', title: 'Software Engineer', location: 'Redmond, WA', base: 145000, stock: 35000, bonus: 18000, yoe: 3, yac: 1 },
    // Microsoft 63
    { company: 'Microsoft', level: '63', standard: 'Senior', title: 'Software Engineer', location: 'Redmond, WA', base: 175000, stock: 75000, bonus: 28000, yoe: 7, yac: 3 },
    // Microsoft 65
    { company: 'Microsoft', level: '65', standard: 'Staff', title: 'Software Engineer', location: 'Silicon Valley, CA', base: 220000, stock: 140000, bonus: 45000, yoe: 10, yac: 5 },
    // Microsoft 67
    { company: 'Microsoft', level: '67', standard: 'Principal', title: 'Software Engineer', location: 'Redmond, WA', base: 265000, stock: 210000, bonus: 60000, yoe: 14, yac: 7 }
  ];

  for (const s of salaries) {
    const companyId = companyMap[s.company];
    const hash = computeHash(companyId, s.level, s.title, s.location, s.base, s.stock, s.bonus, s.yoe);
    const tc = s.base + s.stock + s.bonus;

    await run(`
      INSERT INTO salaries (
        company_id, level_name, standard_level, title, location,
        base_salary, stock_grant, bonus, total_compensation,
        years_of_experience, years_at_company, verification_status, duplicate_hash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'verified', ?)
    `, [
      companyId, s.level, s.standard, s.title, s.location,
      s.base, s.stock, s.bonus, tc, s.yoe, s.yac, hash
    ]);
  }

  console.log('Seeding completed successfully!');
}

module.exports = {
  db,
  initDb,
  run,
  all,
  get
};
