const express = require('express');
const router = express.Router();
const multer = require('multer');
const storage = multer.memoryStorage(); // Store files in memory
const upload = multer({ storage });
const {
  login,
  restorePassword,
  getAppointmentTypes,
  addAppointmentType,
  updateAppointmentType,
  deleteAppointmentType,
  getDaysOff,
  addDayOff,
  updateDayOff,
  deleteDayOff,
  getVacations,
  addVacation,
  updateVacation,
  deleteVacation,
  getCanceledAppointmentsByDate,
  getAppointmentsByDate,
  getNumberOfAppointments,
  deleteAppointment,
  sendMessageToUsers,
  getWorkingHours,
  addWorkingHours,
  updateWorkingHours,
  deleteWorkingHours,
  updateCoverImage,
  updateLogoImage,
  getCoverImage,
  getLogoImage,
  getStoreName,
  updateStoreName,
} = require('../controllers/businessOwnerController');
const auth = require('../middleware/authMiddleware');

router.post('/login', login);
//router.post('/restore-password', restorePassword);

router.get('/types', auth, getAppointmentTypes);
router.post('/types', auth, addAppointmentType);
router.put('/types', auth, updateAppointmentType);
router.delete('/types/:id', auth, deleteAppointmentType);

router.get('/dayoff', auth, getDaysOff);
router.post('/dayoff', auth, addDayOff);
router.put('/dayoff', auth, updateDayOff);
router.delete('/dayoff/:day', auth, deleteDayOff);

router.get('/vacation', auth, getVacations);
router.post('/vacation', auth, addVacation);
router.put('/vacation', auth, updateVacation);
router.delete('/vacation/:id', auth, deleteVacation);

router.get('/canceled-appointments/:date', auth, getCanceledAppointmentsByDate);
router.get('/appointments/:date', auth, getAppointmentsByDate);
router.post('/appointments/count', auth, getNumberOfAppointments);
router.delete('/appointments/:id', auth, deleteAppointment);

router.post('/message', auth, sendMessageToUsers);

router.get('/hours', auth, getWorkingHours);
router.post('/hours', auth, addWorkingHours);
router.put('/hours', auth, updateWorkingHours);
router.delete('/hours/:id', auth, deleteWorkingHours);

router.get('/coverImage', auth, getCoverImage);
router.post('/coverImage', auth, upload.single('image'), updateCoverImage);

router.get('/logoImage', auth, getLogoImage);
router.post('/logoImage', auth, upload.single('image'), updateLogoImage);

router.get('/businessName', auth, getStoreName);
router.put('/businessName', auth, updateStoreName);

module.exports = router;