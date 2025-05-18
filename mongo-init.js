db = db.getSiblingDB('lpr');

// Create collections with schema validation
db.createCollection('users', {
    validator: {
        $jsonSchema: {
            bsonType: 'object',
            required: ['username', 'email'],
            properties: {
                username: {
                    bsonType: 'string',
                    description: 'must be a string and is required'
                },
                email: {
                    bsonType: 'string',
                    pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$',
                    description: 'must be a valid email address and is required'
                },
                googleId: {
                    bsonType: ['string', 'null'],
                    description: 'must be a string if provided'
                },
                role: {
                    enum: ['admin', 'user'],
                    description: 'can only be one of the enum values'
                }
            }
        }
    }
});

db.createCollection('detections', {
    validator: {
        $jsonSchema: {
            bsonType: 'object',
            required: ['licensePlate', 'confidence', 'timestamp'],
            properties: {
                licensePlate: {
                    bsonType: 'string',
                    description: 'must be a string and is required'
                },
                confidence: {
                    bsonType: 'number',
                    minimum: 0,
                    maximum: 1,
                    description: 'must be a number between 0 and 1'
                },
                timestamp: {
                    bsonType: 'date',
                    description: 'must be a date and is required'
                },
                province: {
                    bsonType: 'string',
                    description: 'must be a string if provided'
                },
                vehicleType: {
                    bsonType: 'string',
                    description: 'must be a string if provided'
                },
                imageUrl: {
                    bsonType: 'string',
                    description: 'must be a string if provided'
                },
                bbox: {
                    bsonType: 'object',
                    description: 'bounding box coordinates'
                },
                verificationStatus: {
                    enum: ['pending', 'verified', 'rejected'],
                    description: 'can only be one of the enum values'
                }
            }
        }
    }
});

// Create indexes
db.users.createIndex({ username: 1 }, { unique: true });
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ googleId: 1 }, { sparse: true });

db.detections.createIndex({ timestamp: -1 });
db.detections.createIndex({ licensePlate: 1 });
db.detections.createIndex({ province: 1 });
db.detections.createIndex({ verificationStatus: 1 });

// Create admin user if it doesn't exist
db.users.updateOne(
    { username: 'admin' },
    {
        $setOnInsert: {
            username: 'admin',
            email: 'admin@localhost',
            role: 'admin',
            password: '$2a$10$IhJEqE8PGh4Q8BuLWKdu8OH6Z5ZH3qhj1Yx3QFDrMR9oirIk0FFm.',  // hashed 'admin123'
            createdAt: new Date()
        }
    },
    { upsert: true }
);