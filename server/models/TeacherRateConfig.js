const mongoose = require('mongoose');

const rateTierSchema = new mongoose.Schema({
  range1: { type: Number, default: 120 }, // 0-24 sessions
  range2: { type: Number, default: 135 }, // 25-48 sessions
  range3: { type: Number, default: 150 }, // 49-72 sessions
  range4: { type: Number, default: 165 }, // 73-96 sessions
}, { _id: false });

const teacherRateConfigSchema = new mongoose.Schema({
  Junior: {
    type: rateTierSchema,
    default: () => ({ range1: 120, range2: 135, range3: 150, range4: 165 }),
  },
  Senior: {
    type: rateTierSchema,
    default: () => ({ range1: 140, range2: 155, range3: 170, range4: 185 }),
  },
  Master: {
    type: rateTierSchema,
    default: () => ({ range1: 160, range2: 175, range3: 190, range4: 205 }),
  },
}, { timestamps: true });

// Static helper to fetch or create default config
teacherRateConfigSchema.statics.getConfig = async function () {
  let config = await this.findOne();
  if (!config) {
    config = await this.create({});
  }
  return config;
};

module.exports = mongoose.model('TeacherRateConfig', teacherRateConfigSchema);
