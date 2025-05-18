const Joi = require('joi');
const { AppError } = require('./error');

const schemas = {
    detection: {
        create: Joi.object({
            image: Joi.any().required(),
            location: Joi.object({
                type: Joi.string().valid('Point').default('Point'),
                coordinates: Joi.array().items(Joi.number()).length(2)
            })
        }),
        verify: Joi.object({
            status: Joi.string().valid('verified', 'rejected').required(),
            notes: Joi.string().trim().allow('', null)
        })
    },
    auth: {
        register: Joi.object({
            username: Joi.string().min(3).max(30).required(),
            password: Joi.string().min(6).required(),
            confirmPassword: Joi.string().valid(Joi.ref('password')).required()
                .messages({ 'any.only': 'Passwords do not match' })
        }),
        login: Joi.object({
            username: Joi.string().required(),
            password: Joi.string().required() 
        })
    }
};

const validateRequest = (schema) => {
    return (req, res, next) => {
        const { error } = schema.validate(req.body, {
            abortEarly: false,
            stripUnknown: true,
            allowUnknown: true
        });

        if (error) {
            const errorMessage = error.details
                .map(detail => detail.message)
                .join(', ');
            
            return next(new AppError(errorMessage, 400));
        }

        next();
    };
};

module.exports = {
    schemas,
    validateRequest
};