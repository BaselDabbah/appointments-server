const mongoose = require('mongoose');

const BusinessHourSchema = new mongoose.Schema({
  dayOfWeek: {
    type: Number,
    required: true, // 0=Sunday, 6=Saturday
  },
  startTime: {
    type: String,
    required: true, // Format: 'HH:mm'
  },
  endTime: {
    type: String,
    required: true, // Format: 'HH:mm'
  },
});

module.exports = mongoose.model('BusinessHour', BusinessHourSchema);
