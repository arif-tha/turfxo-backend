const Slot = require("../models/Slot");

const createSlot = async (data) => {
  return await Slot.create(data);
};

const getSlotsByTurf = async (turfId, date) => {
  return await Slot.find({ turf: turfId, date });
};

module.exports = {
  createSlot,
  getSlotsByTurf
};