const Member = require('../models/Member');

// @desc    Add a new member
// @route   POST /api/members
// @access  Private
const addMember = async (req, res) => {
  try {
    const { name, phone, email, joiningDate, packageType, joiningTime, amount, notes } = req.body;

    if (!name || !phone || !joiningDate || !packageType || !joiningTime || amount === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: name, phone, joiningDate, packageType, joiningTime, amount.',
      });
    }

    const member = await Member.create({
      name,
      phone,
      email: email || '',
      joiningDate,
      packageType,
      joiningTime,
      amount: Number(amount),
      notes: notes || '',
    });

    res.status(201).json({
      success: true,
      message: 'Member added successfully.',
      data: member,
    });
  } catch (error) {
    console.error('Add member error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    res.status(500).json({ success: false, message: 'Server error while adding member.' });
  }
};

// @desc    Get all members
// @route   GET /api/members
// @access  Private
const getAllMembers = async (req, res) => {
  try {
    const {
      search,
      status,
      sortBy = 'joiningDate',
      order = 'desc',
      page = '1',
      limit = '10',
    } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (status === 'active') {
      query.expiryDate = { $gte: today };
    } else if (status === 'expired') {
      query.expiryDate = { $lt: today };
    }

    const sortOrder = order === 'desc' ? -1 : 1;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
    const skip = (pageNum - 1) * limitNum;

    const [members, total] = await Promise.all([
      Member.find(query).sort({ [sortBy]: sortOrder }).skip(skip).limit(limitNum),
      Member.countDocuments(query),
    ]);

    res.json({
      success: true,
      total,
      totalPages: Math.ceil(total / limitNum),
      currentPage: pageNum,
      count: members.length,
      data: members,
    });
  } catch (error) {
    console.error('Get all members error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching members.' });
  }
};

// @desc    Get single member
// @route   GET /api/members/:id
// @access  Private
const getMember = async (req, res) => {
  try {
    const member = await Member.findById(req.params.id);

    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found.' });
    }

    res.json({ success: true, data: member });
  } catch (error) {
    console.error('Get member error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid member ID.' });
    }
    res.status(500).json({ success: false, message: 'Server error while fetching member.' });
  }
};

// @desc    Update member
// @route   PUT /api/members/:id
// @access  Private
const updateMember = async (req, res) => {
  try {
    const { name, phone, email, joiningDate, packageType, joiningTime, amount, notes } = req.body;

    const member = await Member.findById(req.params.id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found.' });
    }

    // Update fields
    if (name !== undefined) member.name = name;
    if (phone !== undefined) member.phone = phone;
    if (email !== undefined) member.email = email;
    if (joiningDate !== undefined) member.joiningDate = joiningDate;
    if (packageType !== undefined) member.packageType = packageType;
    if (joiningTime !== undefined) member.joiningTime = joiningTime;
    if (amount !== undefined) member.amount = Number(amount);
    if (notes !== undefined) member.notes = notes;

    await member.save(); // triggers pre-save hook to recalculate expiry

    res.json({
      success: true,
      message: 'Member updated successfully.',
      data: member,
    });
  } catch (error) {
    console.error('Update member error:', error);
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages.join(', ') });
    }
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid member ID.' });
    }
    res.status(500).json({ success: false, message: 'Server error while updating member.' });
  }
};

// @desc    Delete member
// @route   DELETE /api/members/:id
// @access  Private
const deleteMember = async (req, res) => {
  try {
    const member = await Member.findByIdAndDelete(req.params.id);

    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found.' });
    }

    res.json({ success: true, message: 'Member deleted successfully.' });
  } catch (error) {
    console.error('Delete member error:', error);
    if (error.name === 'CastError') {
      return res.status(400).json({ success: false, message: 'Invalid member ID.' });
    }
    res.status(500).json({ success: false, message: 'Server error while deleting member.' });
  }
};

// @desc    Get dashboard stats
// @route   GET /api/members/stats
// @access  Private
const getStats = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const fiveDaysLater = new Date(today);
    fiveDaysLater.setDate(fiveDaysLater.getDate() + 5);

    const [total, active, expired, expiringSoon] = await Promise.all([
      Member.countDocuments(),
      Member.countDocuments({ expiryDate: { $gte: today } }),
      Member.countDocuments({ expiryDate: { $lt: today } }),
      Member.countDocuments({
        expiryDate: { $gte: today, $lte: fiveDaysLater },
      }),
    ]);

    res.json({
      success: true,
      data: { total, active, expired, expiringSoon },
    });
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching stats.' });
  }
};

// @desc    Get analytics (daily / monthly / yearly)
// @route   GET /api/members/analytics
// @access  Private
const getAnalytics = async (req, res) => {
  try {
    const now = new Date();

    // ── Daily: last 30 days ──────────────────────────────────────────────────
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
    thirtyDaysAgo.setHours(0, 0, 0, 0);

    const dailyRaw = await Member.aggregate([
      { $match: { joiningDate: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$joiningDate' } },
          count: { $sum: 1 },
          revenue: { $sum: '$amount' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Fill in missing dates with 0
    const daily = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const found = dailyRaw.find((r) => r._id === key);
      daily.push({ date: key, count: found ? found.count : 0, revenue: found ? found.revenue : 0 });
    }

    // ── Monthly: current year ────────────────────────────────────────────────
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const monthlyRaw = await Member.aggregate([
      { $match: { joiningDate: { $gte: yearStart } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$joiningDate' } },
          count: { $sum: 1 },
          revenue: { $sum: '$amount' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthly = [];
    for (let m = 0; m < 12; m++) {
      const key = `${now.getFullYear()}-${String(m + 1).padStart(2, '0')}`;
      const found = monthlyRaw.find((r) => r._id === key);
      monthly.push({
        month: MONTH_LABELS[m],
        key,
        count: found ? found.count : 0,
        revenue: found ? found.revenue : 0,
      });
    }

    // ── Yearly: last 3 years ─────────────────────────────────────────────────
    const threeYearsAgo = new Date(now.getFullYear() - 2, 0, 1);
    const yearlyRaw = await Member.aggregate([
      { $match: { joiningDate: { $gte: threeYearsAgo } } },
      {
        $group: {
          _id: { $year: '$joiningDate' },
          count: { $sum: 1 },
          revenue: { $sum: '$amount' },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const yearly = [];
    for (let y = now.getFullYear() - 2; y <= now.getFullYear(); y++) {
      const found = yearlyRaw.find((r) => r._id === y);
      yearly.push({ year: String(y), count: found ? found.count : 0, revenue: found ? found.revenue : 0 });
    }

    res.json({ success: true, data: { daily, monthly, yearly } });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching analytics.' });
  }
};

module.exports = {
  addMember,
  getAllMembers,
  getMember,
  updateMember,
  deleteMember,
  getStats,
  getAnalytics,
};
