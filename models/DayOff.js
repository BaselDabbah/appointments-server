const mongoose = require('mongoose');

const DayOffSchema = new mongoose.Schema({
  date: {
    type: Date,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
});

module.exports = mongoose.model('DayOff', DayOffSchema);
