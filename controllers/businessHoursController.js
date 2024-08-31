const db = require('../firebase');
const { v4: uuidv4 } = require('uuid');

exports.addBusinessHour = async (req, res) => {
  const { dayOfWeek, startTime, endTime } = req.body;

  try {
    const newBusinessHour = {
      id: uuidv4(),
      dayOfWeek,
      startTime,
      endTime
    };

    const businessHourRef = db.collection('workingHours').doc(newBusinessHour.id);
    await businessHourRef.set(newBusinessHour);

    res.json(newBusinessHour);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.getBusinessHours = async (req, res) => {
  try {
    const businessHoursSnapshot = await db.collection('workingHours').get();

    const businessHours = businessHoursSnapshot.docs.map(doc => doc.data());

    res.json(businessHours);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.updateBusinessHour = async (req, res) => {
  const { id, startTime, endTime } = req.body;

  try {
    const businessHourRef = db.collection('workingHours').doc(id);
    const businessHourDoc = await businessHourRef.get();

    if (!businessHourDoc.exists) {
      return res.status(404).json({ msg: 'Business hour not found' });
    }

    const updatedBusinessHour = {
      ...businessHourDoc.data(),
      startTime: startTime || businessHourDoc.data().startTime,
      endTime: endTime || businessHourDoc.data().endTime
    };

    await businessHourRef.set(updatedBusinessHour);

    res.json(updatedBusinessHour);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.deleteBusinessHour = async (req, res) => {
  const { id } = req.body;

  try {
    const businessHourRef = db.collection('workingHours').doc(id);
    const businessHourDoc = await businessHourRef.get();

    if (!businessHourDoc.exists) {
      return res.status(404).json({ msg: 'Business hour not found' });
    }

    await businessHourRef.delete();

    res.json({ msg: 'Business hour removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.addDayOff = async (req, res) => {
  const { date, description } = req.body;

  try {
    const newDayOff = {
      id: uuidv4(),
      date,
      description
    };

    const dayOffRef = db.collection('daysOff').doc(newDayOff.id);
    await dayOffRef.set(newDayOff);

    res.json(newDayOff);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.getDaysOff = async (req, res) => {
  try {
    const daysOffSnapshot = await db.collection('daysOff').get();

    const daysOff = daysOffSnapshot.docs.map(doc => doc.data());

    res.json(daysOff);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.updateDayOff = async (req, res) => {
  const { id, date, description } = req.body;

  try {
    const dayOffRef = db.collection('daysOff').doc(id);
    const dayOffDoc = await dayOffRef.get();

    if (!dayOffDoc.exists) {
      return res.status(404).json({ msg: 'Day off not found' });
    }

    const updatedDayOff = {
      ...dayOffDoc.data(),
      date: date || dayOffDoc.data().date,
      description: description || dayOffDoc.data().description
    };

    await dayOffRef.set(updatedDayOff);

    res.json(updatedDayOff);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.deleteDayOff = async (req, res) => {
  const { id } = req.body;

  try {
    const dayOffRef = db.collection('daysOff').doc(id);
    const dayOffDoc = await dayOffRef.get();

    if (!dayOffDoc.exists) {
      return res.status(404).json({ msg: 'Day off not found' });
    }

    await dayOffRef.delete();

    res.json({ msg: 'Day off removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};
