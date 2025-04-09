import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  PermissionsAndroid,
  Platform,
  Alert,
  Button,
  Dimensions,
} from 'react-native';
import { BleManager, Device } from 'react-native-ble-plx';
import base64 from 'react-native-base64';
// Chart libraries
import { LineChart } from 'react-native-chart-kit';

const manager = new BleManager();
const SERVICE_UUID = "12630000-cc25-497d-9854-9b6c02c77054";
const TEMP_CHARACTERISTIC_UUID = "12630001-cc25-497d-9854-9b6c02c77054";
const HUMID_CHARACTERISTIC_UUID = "12630003-cc25-497d-9854-9b6c02c77054";

export default function App() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [device, setDevice] = useState<Device | null>(null);
  const [temperature, setTemperature] = useState<number | null>(null);
  const [humidity, setHumidity] = useState<number | null>(null);
  
  // This array holds objects of shape { time, temp }
  // so you can track the actual time at which each reading was taken.
  const [temperatureHistory, setTemperatureHistory] = useState<{ time: string; temp: number }[]>([]);

  const [scanning, setScanning] = useState(false);

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
      getHumidity(connectedDevice);
    } catch (error) {
      console.error('Connection Error:', error);
    }
  };

  const getHumidity = async (device: Device) => {
    try {
      const humidityCharacteristic = await device.readCharacteristicForService(SERVICE_UUID, HUMID_CHARACTERISTIC_UUID);
      if (humidityCharacteristic?.value) {
        const humval = Uint8Array.from(atob(humidityCharacteristic.value), c => c.charCodeAt(0));
        const humidityval = ((humval[2] << 8) | humval[1]) / 100;
        console.log("Humidity:", humidityval);
        setHumidity(humidityval);
      }
    } catch (error) {
      console.error("Error reading Humidity:", error);
    }
  };

  const getTemperature = async (device: Device) => {
    try {
      const tempCharacteristic = await device.readCharacteristicForService(SERVICE_UUID, TEMP_CHARACTERISTIC_UUID);
      console.log(tempCharacteristic);

      if (tempCharacteristic?.value) {
        const tempval = Uint8Array.from(atob(tempCharacteristic.value), c => c.charCodeAt(0));
        const temperatureval = ((tempval[2] << 8) | tempval[1]) / 100;
        console.log("Temperature:", temperatureval);
        setTemperature(temperatureval);
      }
    } catch (error) {
      console.error("Error reading temperature:", error);
    }
  };

  // Setup an interval to read from the BLE device every 1 second.
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (device) {
      interval = setInterval(async () => {
        // Re-read both temperature and humidity
        await getTemperature(device);
        await getHumidity(device);
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [device]);

  // Whenever temperature changes and isn't null, add a new record to our temperatureHistory array.
  useEffect(() => {
    if (temperature !== null) {
      const currentTime = new Date().toLocaleTimeString();
      setTemperatureHistory((prevHistory) => [
        ...prevHistory,
        { time: currentTime, temp: temperature },
      ]);
    }
  }, [temperature]);

  /*
    Prepare the data for react-native-chart-kit.
    We'll take the "time" array and "temp" array from temperatureHistory.
    For demonstration, we simply map "time" to labels & "temp" to data.
    If you have many readings, you might want to limit the label count or only
    label every N points to avoid clutter.
  */
    const MAX_LABELS = 12;
    const chartLabels = temperatureHistory.map(entry => entry.time);
    const chartData   = temperatureHistory.map(entry => entry.temp);
    
    // Calculate how many points you have
    const totalPoints = chartLabels.length;
    
    // Force the skip factor so that *only* up to 12 labels appear
    // e.g. if you have 100 points, skipCount becomes ~8, giving ~12 labeled points.
    const skipCount = Math.ceil(totalPoints / MAX_LABELS);
    
    // When skipCount is 1, that means totalPoints <= 12, so no skipping needed.
    const prunedLabels = chartLabels.map((label, index) => (
      index % skipCount === 0 ? label : ''  // Return empty string to skip
    ));




  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <Text style={{ fontSize: 20, marginBottom: 20 }}>Bluetooth Temperature Sensor</Text>
      
      <Button title="Scan for Devices" onPress={scanDevices} />

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

      {temperatureHistory.length > 1 && (
        <LineChart
          data={{
            labels: prunedLabels,
            datasets: [
              {
                data: chartData,
              },
            ],
          }}
          width={Dimensions.get('window').width * 0.9} // chart width
          height={220}                                 // chart height
          yAxisSuffix="°C"
          chartConfig={{
            backgroundGradientFrom: "#fff",
            backgroundGradientTo: "#fff",
            decimalPlaces: 2,
            color: () => 'rgba(0, 100, 100, 1)',
          }}
          bezier
          style={{
            marginVertical: 20,
            borderRadius: 16,
          }}
        />
      )}

      {device && <Text>Connected to: {device.name}</Text>}
      {temperature !== null && <Text>Temperature: {temperature}°C</Text>}
      {humidity !== null && <Text>Humidity: {humidity}%</Text>}


    </View>
  );
}
