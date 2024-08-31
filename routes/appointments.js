const express = require('express');
const router = express.Router();
const {
  getAppointmentTypes,
  getAvailableDates,
  getAvailableTimes,
  addAppointment,
  getUserAppointments,
  deleteAppointment,
  getCoverImage,
  getLogoImage,
  getStoreName
} = require('../controllers/appointmentController');
const auth = require('../middleware/authMiddleware');

// Static Card
router.get('/coverImage', getCoverImage);
router.get('/logoImage', getLogoImage);
router.get('/businessName', getStoreName);

router.get('/types', getAppointmentTypes);
router.post('/dates', getAvailableDates);
router.post('/times', getAvailableTimes);
router.post('/', auth, addAppointment);
router.get('/user/:phone', auth, getUserAppointments);
router.delete('/:appointmentId', auth, deleteAppointment);

module.exports = router;
