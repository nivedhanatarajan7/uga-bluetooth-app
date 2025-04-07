import React, { useState,useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, PermissionsAndroid, Platform, Alert, Button } from 'react-native';
import { BleManager, Device } from 'react-native-ble-plx';
import base64 from 'react-native-base64';
import { Float } from 'react-native/Libraries/Types/CodegenTypes';
import { get } from 'react-native/Libraries/TurboModule/TurboModuleRegistry';


const manager = new BleManager();
const SERVICE_UUID = "12630000-cc25-497d-9854-9b6c02c77054";
const TEMP_CHARACTERISTIC_UUID = "12630001-cc25-497d-9854-9b6c02c77054"; 
const HUMID_CHARACTERISTIC_UUID = "12630003-cc25-497d-9854-9b6c02c77054"; 


export default function App() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [device, setDevice] = useState<Device | null>(null);
  const [temperature, setTemperature] = useState<number | null>(null);
  const [humidity, setHumidity] = useState<number | null>(null);

  const [scanning, setScanning] = useState(false);
  let tempN = false;

  // Request Bluetooth & Location Permissions
  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      ]);
    }
  };

  const createTwoButtonAlert = () =>
    Alert.alert('Alert Title', 'My Alert Msg', [
      {
        text: 'Cancel',
        onPress: () => console.log('Cancel Pressed'),
        style: 'cancel',
      },
      {text: 'OK', onPress: () => console.log('OK Pressed')},
    ]);

  // Scan for Bluetooth Devices
  const scanDevices = async () => {
    await requestPermissions();
    setScanning(true);
    setDevices([]);

    manager.startDeviceScan(null, { allowDuplicates: false }, (error, scannedDevice) => {
      if (error) {
        console.error('Scan error:', error);
        setScanning(false);
        return;
      }

      if (scannedDevice?.name) {
        setDevices((prevDevices) => {
          if (!prevDevices.some((d) => d.id === scannedDevice.id)) {
            return [...prevDevices, scannedDevice];
          }
          return prevDevices;
        });
      }
    });

    setTimeout(() => {
      manager.stopDeviceScan();
      setScanning(false);
    }, 10000);
  };

  const connectToDevice = async (selectedDevice: Device) => {
    try {
      const connectedDevice = await selectedDevice.connect();
      setDevice(connectedDevice);
      await connectedDevice.discoverAllServicesAndCharacteristics();
      getTemperature(connectedDevice);
    } catch (error) {
      console.error('Connection Error:', error);
    }
  };

  const getHumidity = async (device: Device) => {
    try {
        // so
        const humidityCharacteristic = await device.readCharacteristicForService(SERVICE_UUID, HUMID_CHARACTERISTIC_UUID); //WTF DOES THIS DO // oh shit i figured it out. 
        //Sconsole.lo(humidityCharacteristic); // Let me see them BYTES!

        if (humidityCharacteristic?.value) {
          // Converts base 64 byte array into byte array
          // atob converts a string of Base64 characters to bytes, converts each element to decimal value and makes it into an array of 4 ints
          const humval = Uint8Array.from(atob(humidityCharacteristic.value), c => c.charCodeAt(0));
          const humidityval = ((humval[2] << 8) | humval[1]) / 100;
          console.log("humidity:", humidityval);
          
            setHumidity(humidityval);
            tempN = true;
        }
    } catch (error) {
        console.error("Error reading Humidity:", error);
    }

};

const getTemperature = async (device: Device) => {
        try {
            const tempCharacteristic = await device.readCharacteristicForService(SERVICE_UUID, TEMP_CHARACTERISTIC_UUID); //WTF DOES THIS DO 
            console.log(tempCharacteristic); // Let me see them BYTES!

            if (tempCharacteristic?.value) {
              // Converts base 64 byte array into byte array
              // atob converts a string of Base64 characters to bytes, converts each element to decimal value and makes it into an array of 4 ints
              const tempval = Uint8Array.from(atob(tempCharacteristic.value), c => c.charCodeAt(0));
              const temperatureval = ((tempval[2] << 8) | tempval[1]) / 100;
              console.log("Temperature:", temperatureval);
              
                setTemperature(temperatureval);
                tempN = true;
            }
        } catch (error) {
            console.error("Error reading temperature:", error);
        }
    
};

useEffect(() => {
  let interval: NodeJS.Timeout | null = null;

  if (device) {
    interval = setInterval(() => {
      getTemperature(device);
      getHumidity(device);
    }, 1000);
  }

  return () => {
    if (interval) clearInterval(interval);
  };
}, [device]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <Text style={{ fontSize: 20, marginBottom: 20 }}>Bluetooth Temperature Sensor</Text>
      
      <Button title="Scan for Devices" onPress={scanDevices} />
      <Button title={'2-Button Alert'} onPress={createTwoButtonAlert} />


      <FlatList
        data={devices}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => connectToDevice(item)}
            style={{
              padding: 10,
              backgroundColor: '#f0f0f0',
              marginVertical: 5,
              borderRadius: 5,
              width: '100%',
            }}>
            <Text style={{ fontSize: 16, textAlign: 'center' }}>{item.name}</Text>
          </TouchableOpacity>
        )}
      />

      {device && <Text>Connected to: {device.name}</Text>}
      {temperature !== null && <Text>Temperature: {temperature}°C</Text>}
      {humidity !== null && <Text>Humidity: {humidity}%</Text>}
    </View>
  );
}
