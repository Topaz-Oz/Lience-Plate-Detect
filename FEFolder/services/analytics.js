const Detection = require('../models/Detection');
const moment = require('moment');

class AnalyticsService {
    async getDetectionStats(timeframe = '7d') {
        const timeRanges = {
            '24h': moment().subtract(24, 'hours'),
            '7d': moment().subtract(7, 'days'),
            '30d': moment().subtract(30, 'days'),
            '1y': moment().subtract(1, 'year')
        };

        const startDate = timeRanges[timeframe] || timeRanges['7d'];

        const stats = await Detection.aggregate([
            {
                $match: {
                    timestamp: { $gte: startDate.toDate() }
                }
            },
            {
                $group: {
                    _id: {
                        date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
                        province: '$province',
                        vehicleType: '$vehicleType'
                    },
                    count: { $sum: 1 },
                    avgConfidence: { $avg: '$confidence' }
                }
            },
            {
                $group: {
                    _id: '$_id.date',
                    provinces: {
                        $push: {
                            name: '$_id.province',
                            count: '$count',
                            avgConfidence: '$avgConfidence'
                        }
                    },
                    vehicleTypes: {
                        $push: {
                            type: '$_id.vehicleType',
                            count: '$count'
                        }
                    },
                    totalCount: { $sum: '$count' }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        return this.processStats(stats);
    }

    async getAccuracyTrends() {
        const hourlyAccuracy = await Detection.aggregate([
            {
                $match: {
                    timestamp: { 
                        $gte: moment().subtract(24, 'hours').toDate() 
                    }
                }
            },
            {
                $group: {
                    _id: {
                        hour: { $hour: '$timestamp' }
                    },
                    avgConfidence: { $avg: '$confidence' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.hour': 1 } }
        ]);

        return hourlyAccuracy;
    }

    async getTopLocations() {
        return await Detection.aggregate([
            {
                $match: {
                    location: { $exists: true }
                }
            },
            {
                $group: {
                    _id: {
                        location: '$location'
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);
    }

    async getVerificationStats() {
        return await Detection.aggregate([
            {
                $group: {
                    _id: '$verificationStatus',
                    count: { $sum: 1 },
                    avgConfidence: { $avg: '$confidence' }
                }
            }
        ]);
    }

    async getUserPerformance(userId) {
        return await Detection.aggregate([
            {
                $match: { detectedBy: userId }
            },
            {
                $group: {
                    _id: null,
                    totalDetections: { $sum: 1 },
                    avgConfidence: { $avg: '$confidence' },
                    verifiedCount: {
                        $sum: { 
                            $cond: [
                                { $eq: ['$verificationStatus', 'verified'] },
                                1,
                                0
                            ]
                        }
                    }
                }
            }
        ]);
    }

    processStats(rawStats) {
        const processed = {
            timeline: [],
            provinceStats: {},
            vehicleTypeStats: {}
        };

        rawStats.forEach(dayStat => {
            // Timeline data
            processed.timeline.push({
                date: dayStat._id,
                total: dayStat.totalCount
            });

            // Process province stats
            dayStat.provinces.forEach(province => {
                if (!processed.provinceStats[province.name]) {
                    processed.provinceStats[province.name] = {
                        total: 0,
                        avgConfidence: 0,
                        count: 0
                    };
                }
                const stat = processed.provinceStats[province.name];
                stat.total += province.count;
                stat.avgConfidence = (stat.avgConfidence * stat.count + province.avgConfidence * province.count) 
                                   / (stat.count + province.count);
                stat.count += province.count;
            });

            // Process vehicle type stats
            dayStat.vehicleTypes.forEach(vehicle => {
                if (!processed.vehicleTypeStats[vehicle.type]) {
                    processed.vehicleTypeStats[vehicle.type] = 0;
                }
                processed.vehicleTypeStats[vehicle.type] += vehicle.count;
            });
        });

        return processed;
    }
}

module.exports = new AnalyticsService();