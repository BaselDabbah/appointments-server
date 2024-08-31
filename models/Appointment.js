const mongoose = require('mongoose');

const AppointmentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  appointmentType: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AppointmentType',
    required: true,
  },
  startTime: {
    type: Date,
    required: true,
  },
  endTime: {
    type: Date,
    required: true,
  },
  status: {
    type: String,
    enum: ['booked', 'canceled', 'completed'],
    default: 'booked',
  },
});

module.exports = mongoose.model('Appointment', AppointmentSchema);
