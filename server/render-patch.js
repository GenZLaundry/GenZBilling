/**
 * render-patch.js
 * Run this ONCE in Render Shell: node render-patch.js
 * It creates the missing income/advance files and patches server.js
 */
const fs = require('fs');
const path = require('path');

// ── 1. models/Income.js ──────────────────────────────────────────────────────
fs.writeFileSync(path.join(__dirname, 'models', 'Income.js'), `const mongoose = require('mongoose');
const incomeSchema = new mongoose.Schema({
  source: { type: String, required: true, trim: true },
  amount: { type: Number, required: true },
  description: { type: String, default: '' },
  date: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model('Income', incomeSchema);
`);
console.log('✅ models/Income.js created');

// ── 2. models/Advance.js ─────────────────────────────────────────────────────
fs.writeFileSync(path.join(__dirname, 'models', 'Advance.js'), `const mongoose = require('mongoose');
const advanceHistorySchema = new mongoose.Schema({
  amount: { type: Number, required: true },
  type: { type: String, enum: ['GIVEN','RETURNED'], required: true },
  date: { type: Date, default: Date.now },
  note: { type: String, default: '' }
});
const advanceSchema = new mongoose.Schema({
  personName: { type: String, required: true, trim: true },
  amountGiven: { type: Number, required: true, default: 0 },
  amountReturned: { type: Number, default: 0 },
  date: { type: Date, default: Date.now },
  history: [advanceHistorySchema],
  status: { type: String, enum: ['PENDING','SETTLED'], default: 'PENDING' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
advanceSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  this.status = (this.amountReturned >= this.amountGiven && this.amountGiven > 0) ? 'SETTLED' : 'PENDING';
  next();
});
module.exports = mongoose.model('Advance', advanceSchema);
`);
console.log('✅ models/Advance.js created');

// ── 3. routes/incomes.js ─────────────────────────────────────────────────────
fs.writeFileSync(path.join(__dirname, 'routes', 'incomes.js'), `const express = require('express');
const router = express.Router();
const Income = require('../models/Income');

router.get('/', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let query = {};
    if (startDate && endDate) query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    const incomes = await Income.find(query).sort({ date: -1, createdAt: -1 });
    res.json({ success: true, data: incomes });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { source, amount, description, date } = req.body;
    if (!source || !amount || amount <= 0) return res.status(400).json({ success: false, message: 'Source and valid amount are required' });
    const income = new Income({ source: source.trim(), amount: parseFloat(amount), description: description?.trim() || '', date: date ? new Date(date) : new Date() });
    await income.save();
    res.status(201).json({ success: true, message: 'Income logged successfully', data: income });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.put('/:id', async (req, res) => {
  try {
    const { source, amount, description, date } = req.body;
    if (!source || !amount || amount <= 0) return res.status(400).json({ success: false, message: 'Source and valid amount are required' });
    const income = await Income.findByIdAndUpdate(req.params.id, { source: source.trim(), amount: parseFloat(amount), description: description?.trim() || '', date: date ? new Date(date) : undefined }, { new: true });
    if (!income) return res.status(404).json({ success: false, message: 'Income not found' });
    res.json({ success: true, message: 'Income updated', data: income });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const income = await Income.findByIdAndDelete(req.params.id);
    if (!income) return res.status(404).json({ success: false, message: 'Income not found' });
    res.json({ success: true, message: 'Income deleted' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
`);
console.log('✅ routes/incomes.js created');

// ── 4. routes/advances.js ────────────────────────────────────────────────────
fs.writeFileSync(path.join(__dirname, 'routes', 'advances.js'), `const express = require('express');
const router = express.Router();
const Advance = require('../models/Advance');

router.get('/', async (req, res) => {
  try {
    const { status, search } = req.query;
    let query = {};
    if (status && status !== 'ALL') query.status = status;
    if (search) query.personName = { $regex: search, $options: 'i' };
    const advances = await Advance.find(query).sort({ updatedAt: -1 });
    res.json({ success: true, data: advances });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/', async (req, res) => {
  try {
    const { personName, amountGiven, date, note } = req.body;
    if (!personName || !amountGiven || amountGiven <= 0) return res.status(400).json({ success: false, message: 'Person name and valid amount are required' });
    const advance = new Advance({ personName: personName.trim(), amountGiven: parseFloat(amountGiven), date: date ? new Date(date) : new Date(), history: [{ amount: parseFloat(amountGiven), type: 'GIVEN', date: date ? new Date(date) : new Date(), note: note || 'Initial advance' }] });
    await advance.save();
    res.status(201).json({ success: true, message: 'Advance created', data: advance });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.post('/:id/history', async (req, res) => {
  try {
    const { amount, type, date, note } = req.body;
    if (!amount || amount <= 0 || !['GIVEN','RETURNED'].includes(type)) return res.status(400).json({ success: false, message: 'Valid amount and type required' });
    const advance = await Advance.findById(req.params.id);
    if (!advance) return res.status(404).json({ success: false, message: 'Advance not found' });
    advance.history.push({ amount: parseFloat(amount), type, date: date ? new Date(date) : new Date(), note: note || '' });
    if (type === 'GIVEN') advance.amountGiven += parseFloat(amount);
    else advance.amountReturned += parseFloat(amount);
    await advance.save();
    res.json({ success: true, message: 'History updated', data: advance });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/:id', async (req, res) => {
  try {
    const advance = await Advance.findByIdAndDelete(req.params.id);
    if (!advance) return res.status(404).json({ success: false, message: 'Advance not found' });
    res.json({ success: true, message: 'Advance deleted' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
`);
console.log('✅ routes/advances.js created');

// ── 5. Patch server.js if routes not already registered ──────────────────────
let serverJs = fs.readFileSync(path.join(__dirname, 'server.js'), 'utf8');

if (!serverJs.includes("require('./routes/incomes')")) {
  serverJs = serverJs.replace(
    "const smsRoutes = require('./routes/sms');",
    "const smsRoutes = require('./routes/sms');\nconst incomeRoutes = require('./routes/incomes');\nconst advanceRoutes = require('./routes/advances');"
  );
  console.log('✅ server.js: import lines added');
} else {
  console.log('ℹ️  server.js: imports already present');
}

if (!serverJs.includes("app.use('/api/incomes'")) {
  serverJs = serverJs.replace(
    "app.use('/api/sms', smsRoutes);",
    "app.use('/api/sms', smsRoutes);\napp.use('/api/incomes', incomeRoutes);\napp.use('/api/advances', advanceRoutes);"
  );
  console.log('✅ server.js: route registrations added');
} else {
  console.log('ℹ️  server.js: routes already registered');
}

fs.writeFileSync(path.join(__dirname, 'server.js'), serverJs);
console.log('✅ server.js patched');

console.log('\n🎉 All done! Now restart the server:\n   kill $(lsof -t -i:8000) && node server.js &\n   OR use Render dashboard → Manual Deploy');
