const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getUser,
  sendVerifyCode,
  verifyPhone,
  restorePassword,
  checkPhoneExistence,
  logout
} = require('../controllers/authController');
const auth = require('../middleware/authMiddleware');

router.post('/register', register);
router.post('/login', login);
router.post('/verify-code', sendVerifyCode);
router.post('/verify-phone', verifyPhone);
router.post('/restore-password', restorePassword);
router.post('/check-phone', checkPhoneExistence);
router.post('/logout', auth, logout);
router.get('/user/:phone', auth, getUser);

module.exports = router;
