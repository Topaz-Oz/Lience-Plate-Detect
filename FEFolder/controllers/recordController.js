const DetectionHistory = require('../models/detectionHistory');

const recordController = {
    // Get records with pagination and filters
    getRecords: async (req, res) => {
        try {
            const { 
                page = 1, 
                limit = 10,
                startDate,
                endDate,
                plateNumber,
                province,
                status,
                sortBy = 'timestamp',
                sortOrder = 'desc'
            } = req.query;

            const filter = {};
            
            if (startDate && endDate) {
                filter.timestamp = {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                };
            }

            if (plateNumber) {
                filter.plateNumber = new RegExp(plateNumber, 'i');
            }

            if (province) {
                filter.province = province;
            }

            if (status) {
                filter.status = status;
            }

            const sortOptions = {};
            sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

            const records = await DetectionHistory.find(filter)
                .sort(sortOptions)
                .skip((page - 1) * limit)
                .limit(parseInt(limit))
                .populate('userId', 'name email')
                .populate('verifiedBy', 'name email');

            const total = await DetectionHistory.countDocuments(filter);

            res.send({
                records,
                totalPages: Math.ceil(total / limit),
                currentPage: page,
                totalRecords: total
            });
        } catch (error) {
            res.status(500).send({ error: error.message });
        }
    },

    // Get analytics and statistics
    getAnalytics: async (req, res) => {
        try {
            const { startDate, endDate } = req.query;

            const dateFilter = {};
            if (startDate && endDate) {
                dateFilter.timestamp = {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                };
            }

            const [
                totalDetections,
                verifiedDetections,
                provinceStats,
                vehicleTypeStats,
                dailyStats
            ] = await Promise.all([
                DetectionHistory.countDocuments(dateFilter),
                DetectionHistory.countDocuments({ ...dateFilter, status: 'verified' }),
                DetectionHistory.aggregate([
                    { $match: dateFilter },
                    { $group: { _id: '$province', count: { $sum: 1 } } }
                ]),
                DetectionHistory.aggregate([
                    { $match: dateFilter },
                    { $group: { _id: '$vehicleType', count: { $sum: 1 } } }
                ]),
                DetectionHistory.aggregate([
                    { $match: dateFilter },
                    {
                        $group: {
                            _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
                            count: { $sum: 1 }
                        }
                    },
                    { $sort: { _id: 1 } }
                ])
            ]);

            res.send({
                totalDetections,
                verifiedDetections,
                verificationRate: (verifiedDetections / totalDetections) * 100,
                provinceStats,
                vehicleTypeStats,
                dailyStats
            });
        } catch (error) {
            res.status(500).send({ error: error.message });
        }
    },

    // Verify or reject a detection
    verifyDetection: async (req, res) => {
        try {
            const { id } = req.params;
            const { status, notes } = req.body;
            const { user } = req;

            if (!['verified', 'rejected'].includes(status)) {
                return res.status(400).send({ error: 'Invalid status' });
            }

            const detection = await DetectionHistory.findById(id);
            if (!detection) {
                return res.status(404).send({ error: 'Detection not found' });
            }

            detection.status = status;
            detection.verifiedBy = user._id;
            detection.verifiedAt = new Date();
            detection.notes = notes;

            await detection.save();
            res.send(detection);
        } catch (error) {
            res.status(500).send({ error: error.message });
        }
    },

    // Search records by location radius
    searchByLocation: async (req, res) => {
        try {
            const { longitude, latitude, radius = 1000, limit = 10 } = req.query;

            const records = await DetectionHistory.find({
                location: {
                    $near: {
                        $geometry: {
                            type: 'Point',
                            coordinates: [parseFloat(longitude), parseFloat(latitude)]
                        },
                        $maxDistance: parseInt(radius)
                    }
                }
            })
            .limit(parseInt(limit))
            .populate('userId', 'name email');

            res.send(records);
        } catch (error) {
            res.status(500).send({ error: error.message });
        }
    },

    // Export records to CSV
    exportRecords: async (req, res) => {
        try {
            const { startDate, endDate, format = 'csv' } = req.query;

            const filter = {};
            if (startDate && endDate) {
                filter.timestamp = {
                    $gte: new Date(startDate),
                    $lte: new Date(endDate)
                };
            }

            const records = await DetectionHistory.find(filter)
                .populate('userId', 'name email')
                .populate('verifiedBy', 'name email');

            if (format === 'csv') {
                const csvData = records.map(record => ({
                    plateNumber: record.plateNumber,
                    timestamp: record.timestamp,
                    confidence: record.confidence,
                    province: record.province,
                    vehicleType: record.vehicleType,
                    status: record.status,
                    verifiedBy: record.verifiedBy?.name || '',
                    verifiedAt: record.verifiedAt || '',
                    notes: record.notes || ''
                }));

                res.setHeader('Content-Type', 'text/csv');
                res.setHeader('Content-Disposition', 'attachment; filename=detection_records.csv');
                
                // Convert to CSV string
                const csv = Object.keys(csvData[0]).join(',') + '\\n' +
                    csvData.map(row => Object.values(row).join(',')).join('\\n');

                res.send(csv);
            } else {
                res.send(records);
            }
        } catch (error) {
            res.status(500).send({ error: error.message });
        }
    }
};

module.exports = recordController;