const pidusage = require('pidusage');
const os = require('os');
const v8 = require('v8');
const sendMetrics = require('./send-metrics');
const debug = require('debug')('express-status-monitor');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const gatherOsMetrics = async (io, span, config) => {
  try {
    const stat = await pidusage(process.pid);
    
    const defaultResponse = {
      2: 0,
      3: 0,
      4: 0,
      5: 0,
      count: 0,
      mean: 0,
      timestamp: Date.now(),
    };

    const last = span.responses[span.responses.length - 1] || defaultResponse;

    // Convert from B to MB
    stat.memory = stat.memory / 1024 / 1024;
    stat.load = os.loadavg();
    stat.timestamp = Date.now();
    stat.heap = v8.getHeapStatistics();

    span.os.push(stat);
    if (!span.responses[0] || (last.timestamp + span.interval) * 1000 < Date.now()) {
      span.responses.push(defaultResponse);
    }

    // Database logging
    await prisma.statusLog.create({
      data: {
        timestamp: new Date(stat.timestamp),
        cpuCount: os.cpus().length,
        memory: stat.memory,
        pid: stat.pid,
        ppid: stat.ppid,
        ctime: BigInt(stat.ctime),
        elapsed: stat.elapsed,
        load1: stat.load[0],
        load5: stat.load[1],
        load15: stat.load[2],
        heapTotal: BigInt(stat.heap.total_heap_size),
        heapUsed: BigInt(stat.heap.used_heap_size),
        response2xx: last[2],
        response3xx: last[3],
        response4xx: last[4],
        response5xx: last[5],
        responseMean: last.mean,
      },
    });

    if (span.os.length >= span.retention) span.os.shift();
    if (span.responses[0] && span.responses.length > span.retention) span.responses.shift();

    if (io) {
      sendMetrics(io, span);
    }
  } catch (error) {
    debug('Error gathering metrics:', error);
  }
};

module.exports = gatherOsMetrics;