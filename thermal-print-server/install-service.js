// INSTALL THERMAL PRINT SERVER AS WINDOWS SERVICE
// Runs automatically on system startup

const Service = require('node-windows').Service;
const path = require('path');

// Create a new service object
const svc = new Service({
  name: 'GenZ Laundry Thermal Print Server',
  description: 'Thermal printing service for GenZ Laundry POS system',
  script: path.join(__dirname, 'server.js'),
  nodeOptions: [
    '--harmony',
    '--max_old_space_size=4096'
  ],
  env: {
    name: "NODE_ENV",
    value: "production"
  }
});

// Listen for the "install" event, which indicates the process is available as a service.
svc.on('install', function() {
  console.log('✅ GenZ Laundry Thermal Print Service installed successfully!');
  console.log('🚀 Starting service...');
  svc.start();
});

svc.on('start', function() {
  console.log('✅ Service started successfully!');
  console.log('📡 Thermal printing server is now running as a Windows service');
  console.log('🔄 Service will auto-start on system boot');
  console.log('🖨️ Ready for thermal printing operations');
});

svc.on('alreadyinstalled', function() {
  console.log('⚠️ Service is already installed');
  console.log('🔄 Restarting service...');
  svc.restart();
});

// Install the service
console.log('📦 Installing GenZ Laundry Thermal Print Service...');
svc.install();