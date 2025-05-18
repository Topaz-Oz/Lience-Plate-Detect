const axios = require('axios');
const os = require('os');

const services = [
    { name: 'Frontend', url: 'http://localhost' },
    { name: 'Backend', url: 'http://localhost:3000/health' },
    { name: 'License Plate Service', url: 'http://localhost:5000/health' }
];

async function checkService(service) {
    try {
        const start = Date.now();
        const response = await axios.get(service.url, { timeout: 5000 });
        const responseTime = Date.now() - start;

        return {
            name: service.name,
            status: response.status === 200 ? 'healthy' : 'unhealthy',
            responseTime: `${responseTime}ms`,
            lastCheck: new Date().toISOString()
        };
    } catch (error) {
        return {
            name: service.name,
            status: 'unhealthy',
            error: error.message,
            lastCheck: new Date().toISOString()
        };
    }
}

async function getSystemMetrics() {
    const metrics = {
        cpu: {
            loadAverage: os.loadavg(),
            usagePercent: process.cpuUsage()
        },
        memory: {
            total: os.totalmem(),
            free: os.freemem(),
            usedPercent: ((os.totalmem() - os.freemem()) / os.totalmem() * 100).toFixed(2)
        },
        uptime: os.uptime()
    };
    return metrics;
}

async function monitor() {
    console.clear();
    console.log('License Plate Recognition System Monitor');
    console.log('=====================================');
    
    // Check services
    const results = await Promise.all(services.map(checkService));
    console.log('\nService Status:');
    results.forEach(result => {
        const status = result.status === 'healthy' 
            ? '\x1b[32m✓\x1b[0m'  // Green checkmark
            : '\x1b[31m✗\x1b[0m'; // Red X
        console.log(`${status} ${result.name}: ${result.status}`);
        if (result.responseTime) console.log(`  Response Time: ${result.responseTime}`);
        if (result.error) console.log(`  Error: ${result.error}`);
    });

    // System metrics
    const metrics = await getSystemMetrics();
    console.log('\nSystem Metrics:');
    console.log(`CPU Load: ${metrics.cpu.loadAverage[0].toFixed(2)} (1m), ${metrics.cpu.loadAverage[1].toFixed(2)} (5m), ${metrics.cpu.loadAverage[2].toFixed(2)} (15m)`);
    console.log(`Memory: ${(metrics.memory.free / 1024 / 1024).toFixed(2)}MB free of ${(metrics.memory.total / 1024 / 1024).toFixed(2)}MB (${metrics.memory.usedPercent}% used)`);
    console.log(`Uptime: ${(metrics.uptime / 3600).toFixed(2)} hours`);

    console.log('\nLast updated:', new Date().toLocaleString());
}

// Run monitoring every 10 seconds
setInterval(monitor, 10000);
monitor(); // Initial run