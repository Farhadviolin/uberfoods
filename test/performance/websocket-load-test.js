/**
 * k6 WebSocket Load Test
 * 
 * Run: k6 run test/performance/websocket-load-test.js
 */

import ws from 'k6/ws';
import { check } from 'k6';
import { Rate } from 'k6/metrics';

const wsErrorRate = new Rate('ws_errors');

export const options = {
  stages: [
    { duration: '30s', target: 50 },   // Ramp up to 50 connections
    { duration: '1m', target: 100 },   // Ramp up to 100 connections
    { duration: '1m', target: 100 },   // Stay at 100 connections
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    'ws_errors': ['rate<0.05'], // Less than 5% errors
  },
};

export default function () {
  const url = 'ws://localhost:3000/socket.io';
  
  const params = {
    headers: {
      'Authorization': 'Bearer test-token',
    },
  };

  const response = ws.connect(url, params, function (socket) {
    socket.on('open', () => {
      console.log('WebSocket connected');
      
      // Join room
      socket.send(JSON.stringify({
        event: 'join',
        data: { room: 'orders' },
      }));
    });

    socket.on('message', (data) => {
      const success = check(data, {
        'message received': (msg) => msg !== null,
      });
      
      wsErrorRate.add(!success);
    });

    socket.on('error', (e) => {
      console.log('WebSocket error:', e);
      wsErrorRate.add(1);
    });

    socket.on('close', () => {
      console.log('WebSocket closed');
    });

    // Keep connection open for test duration
    socket.setTimeout(function () {
      socket.close();
    }, 60000); // 60 seconds
  });

  check(response, {
    'WebSocket connection successful': (r) => r && r.status === 101,
  });
}
