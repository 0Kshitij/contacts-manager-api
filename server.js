const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Database setup
const db = new sqlite3.Database('./contacts.db', (err) => {
  if (err) {
    console.error('Error opening database:', err);
  } else {
    console.log('Connected to SQLite database');
    initializeDatabase();
  }
});

// Initialize database schema
function initializeDatabase() {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS contacts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name VARCHAR(120) NOT NULL,
      email VARCHAR(200) NOT NULL UNIQUE,
      phone VARCHAR(25) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `;
  
  db.run(createTableSQL, (err) => {
    if (err) {
      console.error('Error creating table:', err);
    } else {
      console.log('Contacts table ready');
    }
  });
}

// Validation helper
function validateContact(contact) {
  const errors = {};
  
  if (!contact.name || contact.name.trim().length === 0) {
    errors.name = 'Name is required';
  }
  
  if (!contact.email || contact.email.trim().length === 0) {
    errors.email = 'Email is required';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact.email)) {
    errors.email = 'Invalid email format';
  }
  
  if (!contact.phone || contact.phone.trim().length === 0) {
    errors.phone = 'Phone is required';
  } else if (!/^\+?[\d\s\-()]{10,25}$/.test(contact.phone)) {
    errors.phone = 'Phone must be 10-25 characters';
  }
  
  return errors;
}

// Routes

// GET /api/contacts - Get all contacts with optional search, sort, and pagination
app.get('/api/contacts', (req, res) => {
  const { search, sortBy = 'name', order = 'asc', page = 1, limit = 10 } = req.query;
  
  let sql = 'SELECT * FROM contacts WHERE 1=1';
  const params = [];
  
  if (search) {
    sql += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ?)';
    const searchPattern = `%${search}%`;
    params.push(searchPattern, searchPattern, searchPattern);
  }
  
  const validSortFields = ['name', 'email', 'phone', 'created_at'];
  const sortField = validSortFields.includes(sortBy) ? sortBy : 'name';
  const sortOrder = order.toLowerCase() === 'desc' ? 'DESC' : 'ASC';
  
  sql += ` ORDER BY ${sortField} ${sortOrder}`;
  
  const offset = (parseInt(page) - 1) * parseInt(limit);
  sql += ` LIMIT ? OFFSET ?`;
  params.push(parseInt(limit), offset);
  
  db.all(sql, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error', details: err.message });
    }
    
    db.get('SELECT COUNT(*) as total FROM contacts', (countErr, countRow) => {
      if (countErr) {
        return res.status(500).json({ error: 'Database error', details: countErr.message });
      }
      
      res.json({
        data: rows,
        pagination: {
          total: countRow.total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(countRow.total / parseInt(limit))
        }
      });
    });
  });
});

// GET /api/contacts/:id - Get single contact
app.get('/api/contacts/:id', (req, res) => {
  const { id } = req.params;
  
  db.get('SELECT * FROM contacts WHERE id = ?', [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error', details: err.message });
    }
    
    if (!row) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    
    res.json(row);
  });
});

// POST /api/contacts - Create new contact
app.post('/api/contacts', (req, res) => {
  const { name, email, phone } = req.body;
  
  const errors = validateContact({ name, email, phone });
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ error: 'Validation failed', errors });
  }
  
  // Check for duplicate email
  db.get('SELECT id FROM contacts WHERE email = ?', [email.toLowerCase()], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error', details: err.message });
    }
    
    if (row) {
      return res.status(400).json({ error: 'Validation failed', errors: { email: 'Email already exists' } });
    }
    
    const sql = 'INSERT INTO contacts (name, email, phone) VALUES (?, ?, ?)';
    db.run(sql, [name.trim(), email.trim().toLowerCase(), phone.trim()], function(insertErr) {
      if (insertErr) {
        return res.status(500).json({ error: 'Database error', details: insertErr.message });
      }
      
      db.get('SELECT * FROM contacts WHERE id = ?', [this.lastID], (selectErr, newContact) => {
        if (selectErr) {
          return res.status(500).json({ error: 'Database error', details: selectErr.message });
        }
        
        res.status(201).json(newContact);
      });
    });
  });
});

// PUT /api/contacts/:id - Update contact (full update)
app.put('/api/contacts/:id', (req, res) => {
  const { id } = req.params;
  const { name, email, phone } = req.body;
  
  const errors = validateContact({ name, email, phone });
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({ error: 'Validation failed', errors });
  }
  
  // Check if contact exists
  db.get('SELECT * FROM contacts WHERE id = ?', [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error', details: err.message });
    }
    
    if (!row) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    
    // Check for duplicate email (excluding current contact)
    db.get('SELECT id FROM contacts WHERE email = ? AND id != ?', [email.toLowerCase(), id], (dupErr, dupRow) => {
      if (dupErr) {
        return res.status(500).json({ error: 'Database error', details: dupErr.message });
      }
      
      if (dupRow) {
        return res.status(400).json({ error: 'Validation failed', errors: { email: 'Email already exists' } });
      }
      
      const sql = 'UPDATE contacts SET name = ?, email = ?, phone = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
      db.run(sql, [name.trim(), email.trim().toLowerCase(), phone.trim(), id], (updateErr) => {
        if (updateErr) {
          return res.status(500).json({ error: 'Database error', details: updateErr.message });
        }
        
        db.get('SELECT * FROM contacts WHERE id = ?', [id], (selectErr, updatedContact) => {
          if (selectErr) {
            return res.status(500).json({ error: 'Database error', details: selectErr.message });
          }
          
          res.json(updatedContact);
        });
      });
    });
  });
});

// PATCH /api/contacts/:id - Partial update
app.patch('/api/contacts/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  
  // Check if contact exists
  db.get('SELECT * FROM contacts WHERE id = ?', [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error', details: err.message });
    }
    
    if (!row) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    
    const allowedFields = ['name', 'email', 'phone'];
    const fields = Object.keys(updates).filter(key => allowedFields.includes(key));
    
    if (fields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }
    
    const sql = `UPDATE contacts SET ${fields.map(f => `${f} = ?`).join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`;
    const values = [...fields.map(f => updates[f]), id];
    
    db.run(sql, values, (updateErr) => {
      if (updateErr) {
        return res.status(500).json({ error: 'Database error', details: updateErr.message });
      }
      
      db.get('SELECT * FROM contacts WHERE id = ?', [id], (selectErr, updatedContact) => {
        if (selectErr) {
          return res.status(500).json({ error: 'Database error', details: selectErr.message });
        }
        
        res.json(updatedContact);
      });
    });
  });
});

// DELETE /api/contacts/:id - Delete contact
app.delete('/api/contacts/:id', (req, res) => {
  const { id } = req.params;
  
  db.get('SELECT * FROM contacts WHERE id = ?', [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Database error', details: err.message });
    }
    
    if (!row) {
      return res.status(404).json({ error: 'Contact not found' });
    }
    
    db.run('DELETE FROM contacts WHERE id = ?', [id], (deleteErr) => {
      if (deleteErr) {
        return res.status(500).json({ error: 'Database error', details: deleteErr.message });
      }
      
      res.json({ message: 'Contact deleted successfully', id: parseInt(id) });
    });
  });
});

// Serve React app

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!', details: err.message });
});

// Start server
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


module.exports = app;