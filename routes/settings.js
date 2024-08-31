const express = require('express');
const router = express.Router();
const {
  getSettings,
  getSetting,
  updateSetting,
  createSetting,
  deleteSetting,
} = require('../controllers/settingsController');
const auth = require('../middleware/authMiddleware');

router.get('/', auth, getSettings);
router.get('/:key', auth, getSetting);
router.put('/', auth, updateSetting);
router.post('/', auth, createSetting);
router.delete('/', auth, deleteSetting);

module.exports = router;
