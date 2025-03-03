import React, { useState } from 'react';
import { View, Text, Button, FlatList } from 'react-native';
import { BleManager, Device } from 'react-native-ble-plx';
import { request, PERMISSIONS } from 'react-native-permissions';

const manager = new BleManager();

export default function App() {
  const [devices, setDevices] = useState<Device[]>([]);

  // Request Bluetooth Permissions for Android
  const requestPermissions = async () => {
    await request(PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION);
  };

  // Scanning for Bluetooth Devices
  const scanDevices = () => {
    requestPermissions();
    setDevices([]);

    manager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.error(error);
        return;
      }
      if (device && device.name) {
        setDevices((prevDevices) => {
          if (!prevDevices.some((d) => d.id === device.id)) {
            return [...prevDevices, device];
          }
          return prevDevices;
        });
      }
    });

    // Stop scanning after 10 seconds for testing purposes
    setTimeout(() => {
      manager.stopDeviceScan();
    }, 10000);
  };

  // Test app
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 20, marginBottom: 20 }}>Bluetooth Scanner</Text>
      <Button title="Scan for Devices" onPress={scanDevices} />
      <FlatList
        data={devices}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Text style={{ marginTop: 10 }}>
            {item.name} ({item.id})
          </Text>
        )}
      />
    </View>
  );
}
