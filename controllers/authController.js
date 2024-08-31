const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('config');
const { db } = require('../firebase');  // Firestore initialization
const { v4: uuidv4 } = require('uuid');
const client = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

let verificationCodes = {};  // Store OTPs and details like attempts and time

exports.register = async (req, res) => {
  const { name, phone, password } = req.body;

  try {
    const userSnapshot = await db.collection('users').where('phone', '==', phone).get();
    if (!userSnapshot.empty) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = {
      id: uuidv4(),
      name,
      phone,
      password: hashedPassword
    };

    await db.collection('users').doc(newUser.id).set(newUser);
    //res.status(201).json({ msg: 'User registered' });
    const payload = {
      user: {
        phone: newUser.phone
      }
    };

    jwt.sign(
      payload,
      config.get('jwtSecret'),
      { expiresIn: 360000 },
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.login = async (req, res) => {
  const { phone, password } = req.body;

  try {
    const userSnapshot = await db.collection('users').where('phone', '==', phone).get();
    if (userSnapshot.empty) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    const user = userSnapshot.docs[0].data();
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    const payload = {
      user: {
        phone: user.phone
      }
    };

    jwt.sign(
      payload,
      config.get('jwtSecret'),
      { expiresIn: 360000 },
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.getUser = async (req, res) => {
  try {
    const { phone } = req.params; // Assuming the phone number is passed as a route parameter

    const userSnapshot = await db.collection('users').where('phone', '==', phone).get();

    if (userSnapshot.empty) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Since phone numbers should be unique, we'll get the first (and should be only) document
    const userDoc = userSnapshot.docs[0];
    const user = userDoc.data();
    delete user.password; // Remove password from the returned data for security
    delete user.date;
    delete user.id;

    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// Function to generate OTP and store with expiration
exports.sendVerifyCode = async (req, res) => {
  const { phoneNumber, isUser } = req.body;

  try {
    const userSnapshot = await db.collection('users').where('phone', '==', phoneNumber).get();
    if (isUser && userSnapshot.empty) {
      return res.status(400).json({ msg: 'User not exists' });
    }
    if (!isUser && !userSnapshot.empty) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    const verificationCode = generateOTP();
    const timestamp = Date.now();
    verificationCodes[phoneNumber] = {
      code: verificationCode,
      attempts: 0,
      timestamp: timestamp
    };

    if (await sendOTP(phoneNumber, verificationCode)) {
      logMessage(phoneNumber, 'sent');
      res.status(200).json('Verification code sent');
    } else {
      res.status(500).send("Server error - Can't send message");
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.verifyPhone = async (req, res) => {
  const { phone, code } = req.body;
  const currentTime = Date.now();
  const otpData = verificationCodes[phone];

  // Check if OTP exists
  if (!otpData) {
    return res.status(400).json({ msg: 'OTP does not exist' });
  }

  // Check if OTP is expired (5 minutes = 300000 ms)
  if (currentTime - otpData.timestamp > 300000) {
    delete verificationCodes[phone]; // Delete expired OTP
    return res.status(400).json({ msg: 'OTP expired' });
  }

  // Check the number of attempts
  if (otpData.attempts >= 10) {
    delete verificationCodes[phone]; // Delete OTP after max attempts
    return res.status(400).json({ msg: 'Max attempts reached. OTP deleted' });
  }

  // Verify the OTP code
  if (otpData.code === code) {
    delete verificationCodes[phone];  // Successful verification, delete OTP
    return res.status(200).json({ msg: 'Phone verified' });
  } else {
    verificationCodes[phone].attempts += 1; // Increment failed attempts
    return res.status(400).json({ msg: 'Invalid verification code' });
  }
};

exports.restorePassword = async (req, res) => {
  const { phone, newPassword } = req.body;

  try {
    const userSnapshot = await db.collection('users').where('phone', '==', phone).get();
    if (userSnapshot.empty) {
      return res.status(400).json({ msg: 'User not found' });
    }

    const user = userSnapshot.docs[0].data();
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    await db.collection('users').doc(user.id).update({ password: hashedPassword });
    res.json({ msg: 'Password updated' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.checkPhoneExistence = async (req, res) => {
  const { phone } = req.body;

  try {
    const userSnapshot = await db.collection('users').where('phone', '==', phone).get();
    if (!userSnapshot.empty) {
      return res.status(200).json({ exists: true });
    } else {
      return res.status(200).json({ exists: false });
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.logout = async (req, res) => {
  // Since JWTs are stateless, logging out is handled client-side by removing the token
  res.json({ msg: 'Logged out' });
};

const generateOTP = () => { 
  
  // Declare a digits variable 
  // which stores all digits  
  let digits = '0123456789'; 
  let OTP = ''; 
  let len = digits.length 
  for (let i = 0; i < 4; i++) { 
      OTP += digits[Math.floor(Math.random() * len)]; 
  } 
   
  return OTP; 
} 

// Function to send OTP via Twilio
const sendOTP = async (toPhoneNumber, otpCode) => {
  try {
    const message = await client.messages.create({
      body: `הקוד שלך ממספרת באסם הוא: ${otpCode}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: `+972${toPhoneNumber}`
    });
    console.log(`Message sent with SID: ${message.sid}`);
    return true;
  } catch (error) {
    console.error(`Error sending message: ${error.message}`);
    return false;
  }
};

// Function to log sent messages
const logMessage = async (phoneNumber, status) => {
  const logData = {
    from: phoneNumber,
    to: process.env.TWILIO_PHONE_NUMBER,
    time: new Date().toISOString(),
    status
  };
  await db.collection('messageLogs').add(logData);
};
