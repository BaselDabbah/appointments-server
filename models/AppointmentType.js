const mongoose = require('mongoose');

const AppointmentTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  duration: {
    type: Number,
    required: true, // Duration in minutes
  },
});

module.exports = mongoose.model('AppointmentType', AppointmentTypeSchema);
