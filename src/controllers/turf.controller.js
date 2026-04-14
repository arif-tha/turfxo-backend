const turfService = require("../services/turf.service");

const createTurf = async (req, res, next) => {
  try {
    const turf = await turfService.createTurf(req.body);
    res.status(201).json({
      success: true,
      data: turf
    });
  } catch (error) {
    next(error);
  }
};

const getTurfs = async (req, res, next) => {
  try {
    const turfs = await turfService.getAllTurfs();
    res.json({
      success: true,
      data: turfs
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createTurf,
  getTurfs
};