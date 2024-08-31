const express = require('express');
const router = express.Router();
const {
  addBusinessHour,
  getBusinessHours,
  updateBusinessHour,
  deleteBusinessHour,
  addDayOff,
  getDaysOff,
  updateDayOff,
  deleteDayOff,
} = require('../controllers/businessHoursController');
const auth = require('../middleware/authMiddleware');

router.post('/hours', auth, addBusinessHour);
router.get('/hours', auth, getBusinessHours);
router.put('/hours', auth, updateBusinessHour);
router.delete('/hours', auth, deleteBusinessHour);

router.post('/dayoff', auth, addDayOff);
router.get('/dayoff', auth, getDaysOff);
router.put('/dayoff', auth, updateDayOff);
router.delete('/dayoff', auth, deleteDayOff);

module.exports = router;
