const Turf = require("../models/Turf");
const ApiError = require("../utils/ApiError");

const createTurf = async (data) => {
  return await Turf.create(data);
};

const getAllTurfs = async () => {
  return await Turf.find({ isActive: true });
};

module.exports = {
  createTurf,
  getAllTurfs
};