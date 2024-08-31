const db = require('../firebase');
const { v4: uuidv4 } = require('uuid');

exports.getSettings = async (req, res) => {
  try {
    const settingsSnapshot = await db.collection('settings').get();

    const settings = settingsSnapshot.docs.map(doc => doc.data());

    res.json(settings);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.getSetting = async (req, res) => {
  try {
    const settingRef = db.collection('settings').doc(req.params.key);
    const settingDoc = await settingRef.get();

    if (!settingDoc.exists) {
      return res.status(404).json({ msg: 'Setting not found' });
    }

    res.json(settingDoc.data());
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.updateSetting = async (req, res) => {
  const { key, value } = req.body;

  try {
    const settingRef = db.collection('settings').doc(key);
    const settingDoc = await settingRef.get();

    if (!settingDoc.exists) {
      return res.status(404).json({ msg: 'Setting not found' });
    }

    const updatedSetting = {
      ...settingDoc.data(),
      value
    };

    await settingRef.set(updatedSetting);

    res.json(updatedSetting);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.createSetting = async (req, res) => {
  const { key, value } = req.body;

  try {
    const settingRef = db.collection('settings').doc(key);
    const settingDoc = await settingRef.get();

    if (settingDoc.exists) {
      return res.status(400).json({ msg: 'Setting already exists' });
    }

    const newSetting = {
      id: uuidv4(),
      key,
      value
    };

    await settingRef.set(newSetting);

    res.json(newSetting);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.deleteSetting = async (req, res) => {
  const { key } = req.body;

  try {
    const settingRef = db.collection('settings').doc(key);
    const settingDoc = await settingRef.get();

    if (!settingDoc.exists) {
      return res.status(404).json({ msg: 'Setting not found' });
    }

    await settingRef.delete();

    res.json({ msg: 'Setting removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};
