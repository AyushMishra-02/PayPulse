const express = require('express');
const router = express.Router();
const db = require('./db');
const { normalizeCompanyName, computeDuplicateHash, guessStandardLevel } = require('./utils');

// ─── GET: All Companies ───
router.get('/companies', async (req, res) => {
  try {
    const rows = await db.all('SELECT * FROM companies ORDER BY name ASC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET: Company Levels ───
router.get('/companies/:id/levels', async (req, res) => {
  try {
    const rows = await db.all(
      'SELECT level_name, standard_level FROM level_mappings WHERE company_id = ? ORDER BY standard_level DESC',
      [req.params.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET: Salaries list with pagination, sorting & filters ───
router.get('/salaries', async (req, res) => {
  try {
    const {
      companyId,
      level,
      role,
      location,
      sortBy = 'created_at',
      sortOrder = 'DESC',
      page = 1,
      limit = 10
    } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    let query = `
      SELECT s.*, c.name as company_name, c.logo_url
      FROM salaries s
      JOIN companies c ON s.company_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (companyId) {
      query += ' AND s.company_id = ?';
      params.push(companyId);
    }
    if (level) {
      query += ' AND s.standard_level = ?';
      params.push(level);
    }
    if (role) {
      query += ' AND s.title LIKE ?';
      params.push(`%${role}%`);
    }
    if (location) {
      query += ' AND s.location LIKE ?';
      params.push(`%${location}%`);
    }

    // Sorting columns validation
    const allowedSort = ['total_compensation', 'base_salary', 'created_at', 'years_of_experience'];
    const finalSort = allowedSort.includes(sortBy) ? sortBy : 'created_at';
    const finalOrder = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    query += ` ORDER BY s.${finalSort} ${finalOrder}`;
    
    // Get total count for pagination metadata
    const countQuery = `SELECT COUNT(*) as total FROM (${query})`;
    const countResult = await db.get(countQuery, params);
    
    // Add pagination
    query += ' LIMIT ? OFFSET ?';
    params.push(parseInt(limit), offset);

    const rows = await db.all(query, params);

    res.json({
      data: rows,
      pagination: {
        total: countResult.total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(countResult.total / parseInt(limit))
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET: Global dashboard metrics ───
router.get('/stats', async (req, res) => {
  try {
    const totalSalaries = await db.get('SELECT COUNT(*) as count FROM salaries');
    const averages = await db.get(`
      SELECT 
        AVG(total_compensation) as avg_tc,
        AVG(base_salary) as avg_base,
        AVG(stock_grant) as avg_stock,
        AVG(bonus) as avg_bonus
      FROM salaries
    `);

    // Top paying companies by average total compensation
    const topFirms = await db.all(`
      SELECT 
        c.name, c.logo_url, 
        AVG(s.total_compensation) as avg_tc,
        COUNT(s.id) as submissions
      FROM salaries s
      JOIN companies c ON s.company_id = c.id
      GROUP BY c.id
      ORDER BY avg_tc DESC
      LIMIT 5
    `);

    // Salaries by Standard Level
    const levelStats = await db.all(`
      SELECT 
        standard_level,
        AVG(total_compensation) as avg_tc,
        AVG(base_salary) as avg_base,
        AVG(stock_grant) as avg_stock,
        AVG(bonus) as avg_bonus,
        COUNT(*) as count
      FROM salaries
      GROUP BY standard_level
      ORDER BY 
        CASE standard_level
          WHEN 'Entry' THEN 1
          WHEN 'Mid' THEN 2
          WHEN 'Senior' THEN 3
          WHEN 'Staff' THEN 4
          WHEN 'Principal' THEN 5
          ELSE 6
        END
    `);

    res.json({
      totalSubmissions: totalSalaries.count,
      averages: {
        totalCompensation: Math.round(averages.avg_tc || 0),
        baseSalary: Math.round(averages.avg_base || 0),
        stockGrant: Math.round(averages.avg_stock || 0),
        bonus: Math.round(averages.avg_bonus || 0)
      },
      topPayingCompanies: topFirms.map(f => ({
        name: f.name,
        logoUrl: f.logo_url,
        avgTC: Math.round(f.avg_tc),
        submissions: f.submissions
      })),
      levelBreakdown: levelStats.map(ls => ({
        level: ls.standard_level,
        avgTC: Math.round(ls.avg_tc),
        avgBase: Math.round(ls.avg_base),
        avgStock: Math.round(ls.avg_stock),
        avgBonus: Math.round(ls.avg_bonus),
        count: ls.count
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET: Compare two companies side-by-side by standard level ───
router.get('/compare', async (req, res) => {
  try {
    const { companyA, companyB } = req.query;
    if (!companyA || !companyB) {
      return res.status(400).json({ error: 'companyA and companyB IDs are required.' });
    }

    const companyInfoA = await db.get('SELECT name, logo_url FROM companies WHERE id = ?', [companyA]);
    const companyInfoB = await db.get('SELECT name, logo_url FROM companies WHERE id = ?', [companyB]);

    if (!companyInfoA || !companyInfoB) {
      return res.status(404).json({ error: 'One or both companies not found.' });
    }

    const fetchStats = async (coId) => {
      return db.all(`
        SELECT 
          standard_level,
          AVG(total_compensation) as avg_tc,
          AVG(base_salary) as avg_base,
          AVG(stock_grant) as avg_stock,
          AVG(bonus) as avg_bonus,
          COUNT(*) as count
        FROM salaries
        WHERE company_id = ?
        GROUP BY standard_level
      `, [coId]);
    };

    const statsA = await fetchStats(companyA);
    const statsB = await fetchStats(companyB);

    // Standard levels alignment
    const standardLevels = ['Entry', 'Mid', 'Senior', 'Staff', 'Principal'];
    const formatStatsMap = (statsList) => {
      const map = {};
      statsList.forEach(s => {
        map[s.standard_level] = {
          avgTC: Math.round(s.avg_tc),
          avgBase: Math.round(s.avg_base),
          avgStock: Math.round(s.avg_stock),
          avgBonus: Math.round(s.avg_bonus),
          count: s.count
        };
      });
      return map;
    };

    const mapA = formatStatsMap(statsA);
    const mapB = formatStatsMap(statsB);

    const alignment = standardLevels.map(lvl => ({
      level: lvl,
      companyA: mapA[lvl] || null,
      companyB: mapB[lvl] || null
    }));

    res.json({
      companyA: { id: companyA, name: companyInfoA.name, logoUrl: companyInfoA.logo_url },
      companyB: { id: companyB, name: companyInfoB.name, logoUrl: companyInfoB.logo_url },
      comparison: alignment
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST: Ingest new salary entry ───
router.post('/salaries', async (req, res) => {
  try {
    const {
      companyName,
      levelName,
      title,
      location,
      baseSalary,
      stockGrant = 0,
      bonus = 0,
      yoe,
      yac
    } = req.body;

    // Validation
    if (!companyName || !levelName || !title || !location || !baseSalary || yoe === undefined || yac === undefined) {
      return res.status(400).json({ error: 'All fields (companyName, levelName, title, location, baseSalary, yoe, yac) are required.' });
    }

    if (isNaN(baseSalary) || baseSalary <= 0) {
      return res.status(400).json({ error: 'baseSalary must be a positive number.' });
    }

    // 1. Normalize company name
    const normalizedCompany = normalizeCompanyName(companyName);

    // 2. Find or create company
    let company = await db.get('SELECT id, name FROM companies WHERE LOWER(name) = ?', [normalizedCompany.toLowerCase()]);
    if (!company) {
      await db.run('INSERT INTO companies (name) VALUES (?)', [normalizedCompany]);
      company = await db.get('SELECT id, name FROM companies WHERE LOWER(name) = ?', [normalizedCompany.toLowerCase()]);
    }

    // 3. Find or create level mapping
    let mapping = await db.get(
      'SELECT standard_level FROM level_mappings WHERE company_id = ? AND LOWER(level_name) = ?',
      [company.id, levelName.toLowerCase()]
    );

    let standardLevel;
    if (!mapping) {
      standardLevel = guessStandardLevel(levelName, normalizedCompany);
      await db.run('INSERT OR IGNORE INTO level_mappings (company_id, level_name, standard_level) VALUES (?, ?, ?)', [
        company.id,
        levelName,
        standardLevel
      ]);
    } else {
      standardLevel = mapping.standard_level;
    }

    // 4. Calculate total compensation and handle missing/zero stock and bonus
    const finalStock = Number(stockGrant) || 0;
    const finalBonus = Number(bonus) || 0;
    const totalComp = Number(baseSalary) + finalStock + finalBonus;

    // 5. Duplicate Detection via SHA-256 Hash
    const hash = computeDuplicateHash(company.id, levelName, title, location, baseSalary, finalStock, finalBonus, yoe);
    
    const duplicate = await db.get('SELECT id FROM salaries WHERE duplicate_hash = ?', [hash]);
    if (duplicate) {
      return res.status(409).json({ error: 'Duplicate salary entry detected. This record has already been ingested.' });
    }

    // 6. Ingest into Database
    await db.run(`
      INSERT INTO salaries (
        company_id, level_name, standard_level, title, location,
        base_salary, stock_grant, bonus, total_compensation,
        years_of_experience, years_at_company, duplicate_hash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      company.id,
      levelName,
      standardLevel,
      title,
      location,
      Number(baseSalary),
      finalStock,
      finalBonus,
      totalComp,
      Number(yoe),
      Number(yac),
      hash
    ]);

    const createdRecord = await db.get('SELECT * FROM salaries WHERE duplicate_hash = ?', [hash]);
    res.status(201).json(createdRecord);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET: Leveling Matrix ───
router.get('/matrix', async (req, res) => {
  try {
    const rows = await db.all(`
      SELECT 
        c.name as company_name,
        lm.level_name,
        lm.standard_level,
        AVG(s.total_compensation) as avg_tc,
        AVG(s.base_salary) as avg_base,
        AVG(s.stock_grant) as avg_stock,
        AVG(s.bonus) as avg_bonus,
        COUNT(s.id) as count
      FROM level_mappings lm
      JOIN companies c ON lm.company_id = c.id
      LEFT JOIN salaries s ON s.company_id = c.id AND s.level_name = lm.level_name
      GROUP BY lm.company_id, lm.level_name, lm.standard_level
    `);

    const standardLevels = ['Entry', 'Mid', 'Senior', 'Staff', 'Principal'];
    
    // Get list of active companies
    const companies = await db.all('SELECT name FROM companies ORDER BY name ASC');
    const companyNames = companies.map(c => c.name);

    const matrix = standardLevels.map(lvl => {
      const levelData = { level: lvl, companies: {} };
      
      // Initialize all companies with null
      companyNames.forEach(name => {
        levelData.companies[name] = null;
      });

      // Populate actual data
      rows.filter(r => r.standard_level === lvl).forEach(r => {
        levelData.companies[r.company_name] = {
          levelName: r.level_name,
          avgTC: r.avg_tc ? Math.round(r.avg_tc) : 0,
          avgBase: r.avg_base ? Math.round(r.avg_base) : 0,
          avgStock: r.avg_stock ? Math.round(r.avg_stock) : 0,
          avgBonus: r.avg_bonus ? Math.round(r.avg_bonus) : 0,
          count: r.count || 0
        };
      });

      return levelData;
    });

    res.json({
      companies: companyNames,
      matrix
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── POST: Evaluate Job Offer ───
router.post('/offers/evaluate', async (req, res) => {
  try {
    const {
      companyId,
      levelName,
      baseSalary,
      stockGrant = 0,
      bonus = 0,
      yoe
    } = req.body;

    if (!companyId || !levelName || !baseSalary) {
      return res.status(400).json({ error: 'companyId, levelName, and baseSalary are required.' });
    }

    const companyInfo = await db.get('SELECT name FROM companies WHERE id = ?', [companyId]);
    if (!companyInfo) {
      return res.status(404).json({ error: 'Company not found.' });
    }

    // Identify standard level
    let standardLevel = guessStandardLevel(levelName, companyInfo.name);
    const mapping = await db.get(
      'SELECT standard_level FROM level_mappings WHERE company_id = ? AND LOWER(level_name) = ?',
      [companyId, levelName.toLowerCase()]
    );
    if (mapping) {
      standardLevel = mapping.standard_level;
    }

    const offerBase = Number(baseSalary);
    const offerStock = Number(stockGrant) || 0;
    const offerBonus = Number(bonus) || 0;
    const offerTC = offerBase + offerStock + offerBonus;

    // Fetch comparison set: salaries at this company and standardized level
    const salaries = await db.all(
      'SELECT base_salary, stock_grant, bonus, total_compensation FROM salaries WHERE company_id = ? AND standard_level = ?',
      [companyId, standardLevel]
    );

    let percentile = 50; // Default median if no other records
    let avgTC = 0;
    let avgBase = 0;
    let avgStock = 0;
    let avgBonus = 0;

    if (salaries.length > 0) {
      // Calculate average metrics
      const sum = salaries.reduce((acc, s) => {
        acc.tc += s.total_compensation;
        acc.base += s.base_salary;
        acc.stock += s.stock_grant || 0;
        acc.bonus += s.bonus || 0;
        return acc;
      }, { tc: 0, base: 0, stock: 0, bonus: 0 });

      avgTC = Math.round(sum.tc / salaries.length);
      avgBase = Math.round(sum.base / salaries.length);
      avgStock = Math.round(sum.stock / salaries.length);
      avgBonus = Math.round(sum.bonus / salaries.length);

      // Compute percentile
      const tcs = salaries.map(s => s.total_compensation).sort((a, b) => a - b);
      const less = tcs.filter(tc => tc < offerTC).length;
      const equal = tcs.filter(tc => tc === offerTC).length;
      percentile = Math.round(((less + 0.5 * equal) / tcs.length) * 100);
    } else {
      // Fallback: fetch statistics globally for this standardized level across all companies
      const globalSalaries = await db.all(
        'SELECT base_salary, stock_grant, bonus, total_compensation FROM salaries WHERE standard_level = ?',
        [standardLevel]
      );
      if (globalSalaries.length > 0) {
        const sum = globalSalaries.reduce((acc, s) => {
          acc.tc += s.total_compensation;
          acc.base += s.base_salary;
          acc.stock += s.stock_grant || 0;
          acc.bonus += s.bonus || 0;
          return acc;
        }, { tc: 0, base: 0, stock: 0, bonus: 0 });

        avgTC = Math.round(sum.tc / globalSalaries.length);
        avgBase = Math.round(sum.base / globalSalaries.length);
        avgStock = Math.round(sum.stock / globalSalaries.length);
        avgBonus = Math.round(sum.bonus / globalSalaries.length);

        const tcs = globalSalaries.map(s => s.total_compensation).sort((a, b) => a - b);
        const less = tcs.filter(tc => tc < offerTC).length;
        const equal = tcs.filter(tc => tc === offerTC).length;
        percentile = Math.round(((less + 0.5 * equal) / tcs.length) * 100);
      }
    }

    // Generate Negotiation Guidance
    const guidance = [];
    if (offerBase < avgBase * 0.95) {
      guidance.push({
        component: 'Base Salary',
        severity: 'warning',
        feedback: `Your base salary of ${formatUSD(offerBase)} is below the target average of ${formatUSD(avgBase)} for this level. Consider requesting a base adjustment of at least 5-10%.`
      });
    } else {
      guidance.push({
        component: 'Base Salary',
        severity: 'success',
        feedback: `Your base salary of ${formatUSD(offerBase)} is competitive and meets or exceeds target market rates.`
      });
    }

    if (offerStock < avgStock * 0.9) {
      guidance.push({
        component: 'Stock / Equity',
        severity: 'error',
        feedback: `Your annual equity grant value of ${formatUSD(offerStock)} is significantly below the average of ${formatUSD(avgStock)}. Focus your negotiation on asking for an additional $15,000 - $30,000 in RSU grant value.`
      });
    } else {
      guidance.push({
        component: 'Stock / Equity',
        severity: 'success',
        feedback: `Your annual stock grant value of ${formatUSD(offerStock)} is strong, aligning well with high-percentile tech compensation structures.`
      });
    }

    if (offerBonus < avgBonus * 0.8) {
      guidance.push({
        component: 'Annual Bonus',
        severity: 'info',
        feedback: `Your bonus is below average. Ask if there is flexibility for a sign-on bonus to offset the lower recurring bonus structure.`
      });
    }

    // Helper formatter inside the route scope
    function formatUSD(val) {
      return '$' + Math.round(val).toLocaleString('en-US');
    }

    res.json({
      companyName: companyInfo.name,
      levelName,
      standardLevel,
      offerTC,
      marketAvgTC: avgTC,
      percentile,
      guidance,
      breakdown: {
        base: offerBase,
        stock: offerStock,
        bonus: offerBonus
      },
      averages: {
        base: avgBase,
        stock: avgStock,
        bonus: avgBonus
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

