const { db, bucket } = require('../firebase');
//const functions = require('firebase-functions');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('config');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');

// Set up multer to store files in memory as buffers
const storage = multer.memoryStorage();
const upload = multer({ storage });

exports.login = async (req, res) => {
  const { username, password } = req.body;

  try {
    const userSnapshot = await db.collection('admin').where('username', '==', username).get();
    if (userSnapshot.empty) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = userSnapshot.docs[0];
    const isMatch = await bcrypt.compare(password, user.data().password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    const payload = {
      user: {
        username: user.username
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

exports.restorePassword = async (req, res) => {
  const { username, newPassword } = req.body;

  try {
    const userSnapshot = await db.collection('admin').where('username', '==', username).get();
    if (userSnapshot.empty) {
      return res.status(400).json({ msg: 'User not found' });
    }

    const user = userSnapshot.docs[0];
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    console.log(user.id);

    await db.collection('admin').doc(user.id).update({ password: hashedPassword });
    res.json({ msg: 'Password updated' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.getAppointmentTypes = async (req, res) => {
  try {
    const snapshot = await db.collection('appointmentTypes').get();
    const types = snapshot.docs.map(doc => ({
      id: doc.id,         // Add the document ID
      ...doc.data(),      // Spread the rest of the document data
    }));
    res.json(types);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.addAppointmentType = async (req, res) => {
  const { name, time, cost } = req.body;

  try {
    const newType = {
      id: uuidv4(),
      name,
      time,
      cost
    };

    await db.collection('appointmentTypes').doc(newType.id).set(newType);
    res.status(201).json(newType);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.updateAppointmentType = async (req, res) => {
  const { id, name, time, cost } = req.body;

  try {
    await db.collection('appointmentTypes').doc(id).update({ name, time, cost });
    res.json({ msg: 'Appointment type updated' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.deleteAppointmentType = async (req, res) => {
  const { id } = req.params;

  try {
    await db.collection('appointmentTypes').doc(id).delete();
    res.json({ msg: 'Appointment type deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.getDaysOff = async (req, res) => {

  try {
    const snapshot = await db.collection('daysOff').get();
    const daysOfWeekArray = [];

    snapshot.forEach(doc => {
      daysOfWeekArray.push(doc.data().dayOfWeek);
    });

    res.json(daysOfWeekArray);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.addDayOff = async (req, res) => {
  const { dayOfWeek } = req.body;

  try {
    const newDayOff = {
      id: uuidv4(),
      dayOfWeek
    };

    await db.collection('daysOff').doc(newDayOff.id).set(newDayOff);
    res.status(201).json(newDayOff);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.updateDayOff = async (req, res) => {
  const { id, day } = req.body;

  try {
    await db.collection('daysOff').doc(id).update({ day });
    res.json({ msg: 'Day off updated' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.deleteDayOff = async (req, res) => {
  const { day } = req.params;

  try {
    const snapshot = await db.collection('daysOff').where('dayOfWeek', '==', day).get();

    snapshot.forEach(async (doc) => {
      await db.collection('daysOff').doc(doc.id).delete();
    });
    res.json({ msg: 'Day off deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.getVacations = async (req, res) => {
  try {
    let currentDate = new Date();
    let dateString = currentDate.toISOString().split('T')[0];

    const snapshot = await db.collection('vacations')
    .where('endDate', '>=', dateString)
    .get();
    //const types = snapshot.docs.map(doc => doc.data());
    const types = snapshot.docs.map(doc => ({
      id: doc.id,         // Add the document ID
      ...doc.data(),      // Spread the rest of the document data
    }));
    res.json(types);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.addVacation = async (req, res) => {
  const { startDate, endDate } = req.body;

  try {
    const startDateString = new Date(startDate).toISOString().split('T')[0];
    const endDateString = new Date(endDate).toISOString().split('T')[0];

    const newVacation = {
      id: uuidv4(),
      startDate: startDateString,
      endDate: endDateString
    };

    await db.collection('vacations').doc(newVacation.id).set(newVacation);
    res.status(201).json(newVacation);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.updateVacation = async (req, res) => {
  const { id, startDate, endDate } = req.body;

  try {
    const startDateString = new Date(startDate).toISOString().split('T')[0];
    const endDateString = new Date(endDate).toISOString().split('T')[0];
    await db.collection('vacations').doc(id).update({ startDate: startDateString, endDate: endDateString });
    res.json({ msg: 'Vacation updated' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.deleteVacation = async (req, res) => {
  const { id } = req.params;

  try {
    await db.collection('vacations').doc(id).delete();
    res.json({ msg: 'Vacation deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.getCanceledAppointmentsByDate = async (req, res) => {
  const { date } = req.params;
  const hoursThreshold = 2; // Set your 'x' hours here (e.g., 2 hours)

  try {
    // Fetch appointments for the given date
    const appointmentsSnapshot = await db.collection('canceledAppointments').where('date', '==', date).get();
    const canceledAppointments = appointmentsSnapshot.docs.map(doc => {
      const data = doc.data();
      const canceledAt = new Date(data.canceledAt);
      const appointmentStartTime = new Date(`${data.date}T${data.startTime}`);
      const timeDifferenceInMs = appointmentStartTime - canceledAt;
      const timeDifferenceInHours = timeDifferenceInMs / (1000 * 60 * 60); // Convert milliseconds to hours

      return {
        ...data,
        canceledWithinXHours: timeDifferenceInHours < hoursThreshold // true if canceled less than x hours before startTime
      };
    });

    // Return the appointments with user names and cancellation status
    res.json(canceledAppointments);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.getAppointmentsByDate = async (req, res) => {
  const { date } = req.params;

  try {
    // Fetch appointments for the given date
    const appointmentsSnapshot = await db.collection('appointments').where('date', '==', date).get();
    const appointments = appointmentsSnapshot.docs.map(doc => doc.data());

    // Fetch user names for each appointment
    const userPromises = appointments.map(async (appointment) => {
      // Assuming 'phone' is used to identify the user in the 'users' collection
      const userSnapshot = await db.collection('users').where('phone', '==', appointment.phone).get();
      const user = userSnapshot.empty ? null : userSnapshot.docs[0].data();

      return {
        ...appointment,
        userName: user ? user.name : 'Unknown' // Include the user name or 'Unknown' if no user is found
      };
    });

    // Wait for all user data to be fetched
    const appointmentsWithUserNames = await Promise.all(userPromises);

    // Return the appointments with user names
    res.json(appointmentsWithUserNames);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.getNumberOfAppointments = async (req, res) => {
  const { startDate, endDate } = req.body;

  try {
    const appointmentsSnapshot = await db.collection('appointments')
      .where('date', '>=', startDate)
      .where('date', '<=', endDate)
      .get();
    
    const appointments = appointmentsSnapshot.docs.map(doc => doc.data());
    const counts = appointments.reduce((acc, appt) => {
      acc[appt.date] = (acc[appt.date] || 0) + 1;
      return acc;
    }, {});

    res.json(counts);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.deleteAppointment = async (req, res) => {
  const { id } = req.params;

  try {
    await db.collection('appointments').doc(id).delete();
    res.json({ msg: 'appointments deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.sendMessageToUsers = async (req, res) => {
  const { message, timeframe } = req.body;

  try {
    let usersSnapshot;
    if (timeframe === 'day') {
      const today = new Date().toISOString().split('T')[0];
      usersSnapshot = await db.collection('appointments').where('date', '==', today).get();
    } else if (timeframe === 'week') {
      const today = new Date();
      const startOfWeek = new Date(today.setDate(today.getDate() - today.getDay()));
      const endOfWeek = new Date(today.setDate(today.getDate() - today.getDay() + 6));
      usersSnapshot = await db.collection('appointments')
        .where('date', '>=', startOfWeek.toISOString().split('T')[0])
        .where('date', '<=', endOfWeek.toISOString().split('T')[0])
        .get();
    } else if (timeframe === 'month') {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      usersSnapshot = await db.collection('appointments')
        .where('date', '>=', startOfMonth.toISOString().split('T')[0])
        .where('date', '<=', endOfMonth.toISOString().split('T')[0])
        .get();
    } else {
      usersSnapshot = await db.collection('appointments').get();
    }

    const userIds = usersSnapshot.docs.map(doc => doc.data().userId);
    const uniqueUserIds = [...new Set(userIds)];

    const userSnapshot = await db.collection('users').where('id', 'in', uniqueUserIds).get();
    const users = userSnapshot.docs.map(doc => doc.data());

    users.forEach(user => {
      client.messages.create({
        body: message,
        from: config.get('twilioPhoneNumber'),
        to: user.phone
      });
    });

    res.json({ msg: 'Messages sent' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.getWorkingHours = async (req, res) => {
  try {
    const snapshot = await db.collection('workingHours').get();
    //const types = snapshot.docs.map(doc => doc.data());
    const types = snapshot.docs.map(doc => ({
      id: doc.id,         // Add the document ID
      ...doc.data(),      // Spread the rest of the document data
    }));
    res.json(types);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};


exports.addWorkingHours = async (req, res) => {
  const { day, start, end } = req.body;

  try {
    const newWorkingHour = {
      id: uuidv4(),
      day,
      start,
      end
    };

    await db.collection('workingHours').doc(newWorkingHour.id).set(newWorkingHour);
    res.status(201).json(newWorkingHour);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.updateWorkingHours = async (req, res) => {
  const { id, dayOfWeek, startTime, endTime } = req.body;

  try {
    await db.collection('workingHours').doc(id).update({ dayOfWeek, startTime, endTime });
    res.json({ msg: 'Working hours updated' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.deleteWorkingHours = async (req, res) => {
  const { id } = req.params;

  try {
    await db.collection('workingHours').doc(id).delete();
    res.json({ msg: 'Working hours deleted' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// Get the cover image URL
exports.getCoverImage = async (req, res) => {
  try {
    const doc = await db.collection('storeDetails').doc('basim-barber').get();
    if (!doc.exists) {
      return res.status(404).send('Store details not found');
    }

    const coverImage = doc.data().coverImage;

    const [url] = await bucket.file(coverImage).getSignedUrl({
      action: 'read',
      expires: '03-09-2491'
    });

    res.json({ coverImage: url });
  } catch (err) {
    console.error(err.message); 
    res.status(500).send('Server error');
  }
};

// Update the cover image
exports.updateCoverImage = async (req, res) => {
  const { file } = req;

  if (!file) {
    return res.status(400).send('No file uploaded');
  }

  try {
    const storeDoc = db.collection('storeDetails').doc('basim-barber');
    const doc = await storeDoc.get();

    if (!doc.exists) {
      return res.status(404).send('Store details not found');
    }

    // Delete the old image if it exists
    const oldCoverImage = doc.data().coverImage;
    await deleteImage(oldCoverImage);

    // Upload the new image
    const newCoverImage = await uploadImage(file);

    // Update Firestore with the new image path
    await storeDoc.update({ coverImage: newCoverImage });

    res.json({ msg: 'Cover image updated', coverImage: newCoverImage });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// Get the logo image URL
exports.getLogoImage = async (req, res) => {
  try {
    const doc = await db.collection('storeDetails').doc('basim-barber').get();
    if (!doc.exists) {
      return res.status(404).send('Store details not found');
    }

    const logoImage = doc.data().logoImage;

    const [url] = await bucket.file(logoImage).getSignedUrl({
      action: 'read',
      expires: '03-09-2491'
    });

    res.json({ logoImage: url });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// Update the logo image
exports.updateLogoImage = async (req, res) => {
  const { file } = req;

  if (!file) {
    return res.status(400).send('No file uploaded');
  }

  try {
    const storeDoc = db.collection('storeDetails').doc('basim-barber');
    const doc = await storeDoc.get();

    if (!doc.exists) {
      return res.status(404).send('Store details not found');
    }

    // Delete the old image if it exists
    const oldLogoImage = doc.data().logoImage;
    await deleteImage(oldLogoImage);

    // Upload the new image
    const newLogoImage = await uploadImage(file);

    // Update Firestore with the new image path
    await storeDoc.update({ logoImage: newLogoImage });

    res.json({ msg: 'Logo image updated', logoImage: newLogoImage });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// Get the store name
exports.getStoreName = async (req, res) => {
  try {
    const doc = await db.collection('storeDetails').doc('basim-barber').get();
    if (!doc.exists) {
      return res.status(404).send('Store details not found');
    }
    res.json({ name: doc.data().name });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// Update the store name
exports.updateStoreName = async (req, res) => {
  const { name } = req.body;

  if (!name) {
    return res.status(400).send('Name is required');
  }

  try {
    const storeDoc = db.collection('storeDetails').doc('basim-barber');
    await storeDoc.update({ name });
    res.json({ msg: 'Store name updated', name });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// Helper function to delete an image from Firebase Storage
const deleteImage = async (imagePath) => {
  try {
    if (imagePath) {
      await bucket.file(imagePath).delete();
    }
  } catch (err) {
    console.error('Error deleting image:', err.message);
  }
};

// Helper function to upload an image to Firebase Storage
const uploadImage = async (file) => {
  const uniqueFilename = `${Date.now()}-${file.originalname}`;
  const fileUpload = bucket.file(uniqueFilename);

  await fileUpload.save(file.buffer, {
    metadata: { contentType: file.mimetype },
  });

  return uniqueFilename;
};