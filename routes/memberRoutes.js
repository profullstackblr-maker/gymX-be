const express = require('express');
const router = express.Router();
const {
  addMember,
  getAllMembers,
  getMember,
  updateMember,
  deleteMember,
  getStats,
  getAnalytics,
} = require('../controllers/memberController');
const { protect } = require('../middleware/auth');

// All routes are protected
router.use(protect);

router.get('/stats', getStats);
router.get('/analytics', getAnalytics);
router.route('/').get(getAllMembers).post(addMember);
router.route('/:id').get(getMember).put(updateMember).delete(deleteMember);

module.exports = router;
