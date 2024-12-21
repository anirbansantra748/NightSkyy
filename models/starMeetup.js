const mongoose = require('mongoose');

const starMeetupSchema = new mongoose.Schema({
  eventName: { type: String, required: true },
  location: { type: String, required: true },
  city: { type: String, required: true },
  date: { type: Date, required: true },
  description: { type: String, required: true },
  capacity: { type: Number, required: true },
  rules: { type: String, required: true },
  carAllowed: { type: Boolean, default: false },
  foodAvailable: { type: Boolean, default: false },
  equipmentProvided: { type: Boolean, default: false },
  chairsProvided: { type: Boolean, default: false },
  itemsToBorrow: { type: String },
  ageLimit: { type: Number, default: 18 },
  socialLinks: { type: String },
  contactNumber: { type: String, required: true },
  contactEmail: { type: String, required: true },
  venueType: { type: String, required: true },
  memberSignaturesLink: { type: String },
  siteImageLink: { type: String },
  whatsappLink: { type: String, required: true },
  createdBy: { type: String, required: true }
});

const StarMeetup = mongoose.model('StarMeetup', starMeetupSchema);
module.exports = StarMeetup;
