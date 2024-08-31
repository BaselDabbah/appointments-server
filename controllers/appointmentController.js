const { db, bucket } = require('../firebase');
const { v4: uuidv4 } = require('uuid');
//const functions = require('firebase-functions');

exports.getAppointmentTypes = async (req, res) => {
  try {
    const snapshot = await db.collection('appointmentTypes').get();
    const types = snapshot.docs.map(doc => doc.data());
    res.json(types);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.getAvailableDates = async (req, res) => {
  let { startDate, endDate, type } = req.body;
  if (!startDate || !endDate) {
    return res.status(400).send('startDate and endDate are required');
  }

  try {
    let freeSlots = await calculateFreeSlots(startDate, endDate, type, false);

    //return array of dates only
    let availableDates = Object.keys(freeSlots)
      .filter(date => freeSlots[date] && Array.isArray(freeSlots[date]) /*&& freeSlots[date].length > 0*/);

    //return array includes objects like {date, freeSlots[date].length}
    /*let availableDates = Object.keys(freeSlots)
    .map(date => ({
      date: date,
      count: Array.isArray(freeSlots[date]) ? freeSlots[date].length : 0
    }));*/
    res.status(200).json(availableDates);
  } catch (error) {
    console.log(error)
    res.status(500).send('Error fetching available dates');
  }
};

exports.getAvailableTimes = async (req, res) => {
  let { date, appointmentType } = req.body;
  if (!date || !appointmentType) {
    return res.status(400).send('date and appointmentType are required');
  }

  try {
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0); // Set hours, minutes, seconds, and milliseconds to 0

    let currentDate = new Date(date);
    currentDate.setHours(0, 0, 0, 0); // Set hours, minutes, seconds, and milliseconds to 0

    // Check if the selected date is in the past
    if (currentDate < todayDate) {
      return res.status(200).json([]);
    }

    // Fetch the available slots for the given date and appointment type
    let freeSlots = await calculateFreeSlots(date, date, appointmentType, true);

    // If the date is today, filter out slots with start times earlier than now
    const today = new Date();
    if (currentDate.toDateString() === todayDate.toDateString()) {
      const currentTime = today.toTimeString().split(' ')[0]; // current time in HH:MM:SS format
      freeSlots[date] = freeSlots[date].filter(slot => slot.startTime > currentTime);
    }

    const appointmentTimes = {
      [date]: freeSlots[date].map(slot => slot.startTime)
    };

    res.status(200).json(appointmentTimes);
  } catch (error) {
    res.status(500).send('Error fetching available times');
  }
};

exports.addAppointment = async (req, res) => {
  const { id, phone, type, date, startTime, note } = req.body;

  try {
    // Check if the appointment with the given id already exists
    const existingAppointment = await db.collection('appointments').doc(id).get();
    
    if (existingAppointment.exists) {
      return res.status(400).send('Appointment with the given ID already exists');
    }

    // Fetch the appointment type details
    const appointmentTypeSnapshot = await db.collection('appointmentTypes').where('name', '==', type).get();
    const appointmentType = appointmentTypeSnapshot.empty ? null : appointmentTypeSnapshot.docs[0].data();

    if (!appointmentType) {
      return res.status(400).send('Invalid appointment type');
    }

    // Calculate end time based on the appointment duration
    const endTime = addMinutesToTime(startTime, appointmentType.time);

    const newAppointment = {
      id,
      phone,
      type,
      date,
      startTime,
      endTime: endTime,
      note
    };

    // Add the new appointment
    await db.collection('appointments').doc(newAppointment.id).set(newAppointment);
    res.status(201).json(newAppointment);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.getUserAppointments = async (req, res) => {
  const { phone } = req.params;

  try {
    const padZero = (num) => num.toString().padStart(2, '0');

    const today = new Date();
    const formatDate = `${today.getFullYear()}-${padZero(today.getMonth() + 1)}-${padZero(today.getDate())} - ${padZero(today.getHours())}:${padZero(today.getMinutes())}`;
    const appointmentsSnapshot = await db.collection('appointments')
    .where('phone', '==', phone)
    .where('id', '>=', formatDate) // Add condition to check if startTime is greater than now
    .get();
    const appointments = appointmentsSnapshot.docs.map(doc => doc.data());
    res.json(appointments);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

exports.deleteAppointment = async (req, res) => {
  const { appointmentId } = req.params;
  const { phone } = req.body;
  const hoursThreshold = 2; // Set your 'x' hours here (e.g., 2 hours)

  try {
    // Fetch the appointment document
    const appointmentDoc = await db.collection('appointments').doc(appointmentId).get();

    if (!appointmentDoc.exists) {
      return res.status(404).json({ msg: 'Appointment not found' });
    }

    // Check if the phone number matches
    const appointmentData = appointmentDoc.data();
    if (appointmentData.phone !== phone) {
      return res.status(403).json({ msg: 'Phone number does not match' });
    }

    // Fetch user information
    const userSnapshot = await db.collection('users').where('phone', '==', phone).get();
    const user = userSnapshot.empty ? null : userSnapshot.docs[0].data();
    const userName = user ? user.name : 'Unknown';

    // Calculate time difference between the appointment's startTime and the current time
    const canceledAt = new Date();
    const appointmentStartTime = new Date(`${appointmentData.date}T${appointmentData.startTime}`);

    // Save canceled appointment details
    const canceledAppointment = {
      date: appointmentData.date,
      startTime: appointmentData.startTime,
      phone: appointmentData.phone,
      type: appointmentData.type,
      canceledAt: canceledAt.toISOString(), // Current date and time of cancellation
      userName: userName,
    };

    // Generate a new ID for the canceled appointment
    const newCanceledAppointmentId = uuidv4();

    await db.collection('canceledAppointments').doc(newCanceledAppointmentId).set(canceledAppointment);

    // Delete the original appointment
    await db.collection('appointments').doc(appointmentId).delete();
    
    res.json({ msg: 'Appointment deleted and canceled appointment recorded', canceledAppointment });

  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// Private functions

/**
 * function to calculate free slots for a given date range considering working hours, days off, vacations, and existing appointments.
 * @param {*} startDate 
 * @param {*} endDate 
 * @returns 
 */
async function calculateFreeSlots(startDate, endDate, type, isAll) {
  let freeSlots = {};
  let currentDate = new Date(startDate);

  // Fetch all days off, vacations, working hours, and appointment types once
  let [daysOffSnapshot, vacationsSnapshot, workingHoursSnapshot, appointmentTypeSnapshot] = await Promise.all([
    db.collection('daysOff').get(),
    db.collection('vacations').get(),
    db.collection('workingHours').get(),
    db.collection('appointmentTypes').where('name', '==', type).get()
  ]);

  let daysOff = daysOffSnapshot.docs.map(doc => doc.data());
  let vacations = vacationsSnapshot.docs.map(doc => doc.data());
  let workingHours = workingHoursSnapshot.docs.map(doc => doc.data());
  let appointmentType = appointmentTypeSnapshot.empty ? null : appointmentTypeSnapshot.docs[0].data();

  while (currentDate <= new Date(endDate)) {
    let dayOfWeek = currentDate.toLocaleString('en-US', { weekday: 'long' });
    let dateString = currentDate.toISOString().split('T')[0];

    // Check for days off
    let isOffDay = daysOff.some(dayOff => dayOff.dayOfWeek === dayOfWeek);

    // Check for vacations
    let isVacation = vacations.some(vacation => vacation.startDate <= dateString && vacation.endDate >= dateString);

    if (!isOffDay && !isVacation) {
      if (isAll && appointmentType) {
        let workingHoursData = workingHours.find(wh => wh.dayOfWeek === dayOfWeek);

        if (workingHoursData) {
          let slots = getSlotsWithinWorkingHours(dateString, workingHoursData.startTime, workingHoursData.endTime, appointmentType.time);

          // Fetch appointments for the current date
          let appointmentsSnapshot = await db.collection('appointments').where('date', '==', dateString).get();
          let bookedSlots = appointmentsSnapshot.docs.map(doc => doc.data());

          slots = slots.filter(slot => {
            return !bookedSlots.some(appointment => {
              return (appointment.startTime < slot.endTime && appointment.endTime > slot.startTime);
            });
          });

          freeSlots[dateString] = slots;

          // Optionally update the freeSlots collection with the calculated free slots
          /*try {
            await db.collection('freeSlots').doc(dateString).set({ slots });
          } catch (error) {
            console.error('Error updating free slots:', error);
          }*/
        }
      } else {
        freeSlots[dateString] = [];
      }
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return freeSlots;
}

async function calculateFreeSlotsOldVersion(startDate, endDate, type, isAll) {
  let freeSlots = {};
  let currentDate = new Date(startDate);

  while (currentDate <= new Date(endDate)) {
    let dayOfWeek = currentDate.toLocaleString('en-US', { weekday: 'long' });
    let dateString = currentDate.toISOString().split('T')[0];

    let freeSlotsDoc;

    // Check if pre-calculated slots exist
    /*try {
      freeSlotsDoc = await db.collection('freeSlots').doc(dateString).get();
    } catch (error) {
      console.error('Error fetching free slots:', error);
      currentDate.setDate(currentDate.getDate() + 1);
      continue;
    }*/

    //let freeSlotsDoc = await db.collection('freeSlots').doc(dateString).get();
    if (false/*freeSlotsDoc.exists*/) {
      freeSlots[dateString] = freeSlotsDoc.data().slots;
    } else {
      let isOffDay;
      let isVacation;
      let workingHoursDoc;
      let appointmentsOnDate;
      
      try {
        isOffDay = await db.collection('daysOff').where('dayOfWeek', '==', dayOfWeek).get();
      } catch (error) {
        console.error('Error fetching days off:', error);
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      try {
        isVacation = await db.collection('vacations')
        .where('startDate', '<=', dateString)
        .where('endDate', '>=', dateString)
        .get();
      } catch (error) {
        console.error('Error fetching vacation:', error);
        currentDate.setDate(currentDate.getDate() + 1);
        continue;
      }

      if (isOffDay.empty && isVacation.empty) {
        if(isAll){
          try {
            workingHoursDoc = await db.collection('workingHours').where('dayOfWeek', '==', dayOfWeek).get();
          } catch (error) {
            console.error('Error fetching working hours:', error);
            currentDate.setDate(currentDate.getDate() + 1);
            continue;
          }

          if (!workingHoursDoc.empty) {
            let workingHoursData = workingHoursDoc.docs[0].data();

            let appointmentTypeDoc;
            try {
              appointmentTypeDoc = await db.collection('appointmentTypes').where('name', '==', type).get(); // Ensure appointmentTypeId is defined
            } catch (error) {
              console.error('Error fetching appointment type:', error);
              currentDate.setDate(currentDate.getDate() + 1);
              continue;
            }

            //let slots = getSlotsWithinWorkingHours(dateString, workingHoursData.startTime, workingHoursData.endTime, 30);

            if (!appointmentTypeDoc.empty) {
              let appointmentType = appointmentTypeDoc.docs[0].data();
              let slots = getSlotsWithinWorkingHours(dateString, workingHoursData.startTime, workingHoursData.endTime, appointmentType.time);
    
              try {
                appointmentsOnDate = await db.collection('appointments').where('date', '==', dateString).get();
              } catch (error) {
                console.error('Error fetching appointments:', error);
                currentDate.setDate(currentDate.getDate() + 1);
                continue;
              }
    
              let bookedSlots = appointmentsOnDate.docs.map(doc => doc.data());
    
              slots = slots.filter(slot => {
                return !bookedSlots.some(appointment => {
                  return (appointment.startTime < slot.endTime && appointment.endTime > slot.startTime);
                });
              });
    
              freeSlots[dateString] = slots;

              // Update the freeSlots collection with the calculated free slots
              /*try {
                await db.collection('freeSlots').doc(dateString).set({ slots });
              } catch (error) {
                console.error('Error updating free slots:', error);
              }*/
            }
          }
        }else{
          freeSlots[dateString] = [];
        }
      }
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return freeSlots;
}

function getSlotsWithinWorkingHours(date, startTime, endTime, durationMinutes) {
  let slots = [];
  let currentTime = new Date(`${date}T${startTime}:00`);
  let endTimeObj = new Date(`${date}T${endTime}:00`);

  // Adjust for local timezone
  currentTime = new Date(currentTime.getTime() - currentTime.getTimezoneOffset() * 60000);
  endTimeObj = new Date(endTimeObj.getTime() - endTimeObj.getTimezoneOffset() * 60000);

  while (currentTime < endTimeObj) {
    let slotEndTime = new Date(currentTime.getTime() + durationMinutes * 60000);
    if (slotEndTime <= endTimeObj) {
      slots.push({
        startTime: currentTime.toISOString().split('T')[1].slice(0, 5),
        endTime: slotEndTime.toISOString().split('T')[1].slice(0, 5)
      });
    }
    currentTime = slotEndTime;
  }
  return slots;
}

/**
 * 
 * @param {*} date 
 * Whenever an appointment is added or removed, update the free slots for the relevant date
 */

async function updateFreeSlotsOnAppointmentChange(date) {
  let workingHoursDoc = await db.collection('workingHours').doc(new Date(date).toLocaleString('en-US', { weekday: 'long' })).get();
  if (workingHoursDoc.exists) {
    let workingHours = workingHoursDoc.data();
    let updatedSlots = getSlotsWithinWorkingHours(date, workingHours.startTime, workingHours.endTime, 30);

    let appointmentsOnDate = await db.collection('appointments').where('date', '==', date).get();
    let bookedSlots = appointmentsOnDate.docs.map(doc => doc.data());

    updatedSlots = updatedSlots.filter(slot => {
      return !bookedSlots.some(appointment => {
        return (appointment.startTime < slot.endTime && appointment.endTime > slot.startTime);
      });
    });

    await freeSlots.doc(date).set({ date: date, slots: updatedSlots });
  }
}

/**
 * 
 */
async function getAppointmentDuration(appointmentType) {
  let appointmentTypeDoc = await db.collection('appointmentTypes').doc(appointmentType).get();
  if (appointmentTypeDoc.exists) {
    return appointmentTypeDoc.data().time;
  } else {
    throw new Error('Appointment type not found');
  }
}


/*
Set up a scheduled job (e.g., using Cloud Functions) to pre-calculate and update free slots for distant future dates regularly (e.g., nightly).
*/
/*exports.scheduledFreeSlotsUpdate = functions.pubsub.schedule('every 24 hours').onRun(async (context) => {
  // 1. Set the date range: startDate is today, endDate is 30 days from today
  let startDate = new Date();
  let endDate = new Date();
  endDate.setDate(endDate.getDate() + 30); // Calculate for the next 30 days

  // Convert dates to string format 'YYYY-MM-DD'
  let startDateString = startDate.toISOString().split('T')[0];
  let endDateString = endDate.toISOString().split('T')[0];

  // 2. Calculate free slots for the date range
  let freeSlots = await calculateFreeSlots(startDateString, endDateString);

  // 3. Save free slots to Firestore
  for (let date in freeSlots) {
    await freeSlots.doc(date).set({ date: date, slots: freeSlots[date] });
  }
});*/

const addMinutesToTime = (time, minutesToAdd) => {
  // Split the time string into hours and minutes
  const [hours, minutes] = time.split(':').map(Number);

  // Convert minutesToAdd (string) to a number
  const minutesToAddNum = Number(minutesToAdd);

  // Calculate new hours and minutes
  const totalMinutes = minutes + minutesToAddNum;
  const newHours = String((hours + Math.floor(totalMinutes / 60)) % 24).padStart(2, '0');
  const newMinutes = String(totalMinutes % 60).padStart(2, '0');

  return `${newHours}:${newMinutes}`;
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