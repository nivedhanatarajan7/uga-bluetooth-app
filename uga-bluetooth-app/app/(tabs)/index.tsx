import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TouchableOpacity,
  PermissionsAndroid,
  Platform,
  Alert,
  Button,
  Dimensions,
  TextInput
} from 'react-native';
import { BleManager, Device } from 'react-native-ble-plx';
import base64 from 'react-native-base64';
// Chart libraries
import { LineChart } from 'react-native-chart-kit';
import { Image } from 'react-native'; // ✅ CORRECT
import PetImage from '../../assets/images/PetImage.png';
import { AnimatedCircularProgress } from 'react-native-circular-progress';
import Svg, { Circle } from 'react-native-svg';





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
  const chartData = temperatureHistory.map(entry => entry.temp);

  // Calculate how many points you have
  const totalPoints = chartLabels.length;

  // Force the skip factor so that *only* up to 12 labels appear
  // e.g. if you have 100 points, skipCount becomes ~8, giving ~12 labeled points.
  const skipCount = Math.ceil(totalPoints / MAX_LABELS);

  // When skipCount is 1, that means totalPoints <= 12, so no skipping needed.
  const prunedLabels = chartLabels.map((label, index) => (
    index % skipCount === 0 ? label : ''  // Return empty string to skip
  ));



  const temp = temperature ?? 0;
  const minTemp = 0;
  const maxTemp = 40;
  const percentage = Math.min(Math.max((temp - minTemp) / (maxTemp - minTemp), 0), 1);

  // Circular ring props
  const size = 200;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - percentage);

  const getTempColor = (temp: number) => {
    if (temp <= 8) return '#0000FF';     // deep blue
    if (temp <= 12) return '#3399FF';    // sky blue
    if (temp <= 15) return '#00CCCC';    // teals
    if (temp <= 20) return '#66FF66';    // light green
    if (temp <= 27) return '#00CC00';    // green
    if (temp <= 28) return '#FFFF00';    // yellow
    if (temp <= 30) return '#FF8000';    // orange
    return '#FF0000';                    // red
  };

  const [tempLimit, setTempLimit] = React.useState('')


  useEffect(() => {
    const limit = parseFloat(tempLimit);
    if (temperature != null && tempLimit && !isNaN(limit)) {
      if (temperature > limit) {

        Alert.alert("🔥 SPARKY IS ON FIRE!!!!!! HES OVERHEATED GET THIS DAWG SOME SHADE")
      }
    }
  })


  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <Text style={{ fontSize: 20, marginBottom: 20 }}>Bluetooth Temperature Sensor</Text>

      {!device && (
        <>
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
        </>
      )}
      {device && (
        <>
          <View style={styles.container}>
            <Svg width={size} height={size}>
              <Circle
                  stroke="#fff" // ✅ white border
                  fill="none"   // ✅ no fill (transparent center)
                cx={size / 2}
                cy={size / 2}
                r={radius}
                strokeWidth={strokeWidth}
              />
              <Circle
                stroke={getTempColor(temp)}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                strokeWidth={strokeWidth}
                strokeDasharray={`${circumference}, ${circumference}`}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                rotation={-90}
                originX={size / 2}
                originY={size / 2}
                fill="none"
              />
            </Svg>

            {/* Image on top */}
            <View style={styles.imageContainer}>
              <Image source={PetImage} style={styles.image} />
              <Text style={styles.tempText}>{temp.toFixed(1)}°C</Text>
            </View>
          </View>
          <Text> Sparky</Text>
          {temperature !== null && <Text>Temperature: {temperature}°C</Text>}

          <TextInput
          onChangeText={(text) => {
            const numericText = text.replace(/[^0-9]/g, '');
            setTempLimit(numericText);
          }}
          value={tempLimit}
          style={styles.input}
          keyboardType = "numeric"
        />

        </>
      )}




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
      {humidity !== null && <Text>Humidity: {humidity}%</Text>}


    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  imageContainer: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff', // ✅ Add this
    borderRadius: 100,       // ✅ ensure it's still a circle
  },
  image: {
    width: 160,
    height: 160,
    borderRadius: 80,
  },
  input: {
    height: 40,
    margin: 12,
    borderWidth: 1,
    padding: 10,
  },
  tempText: {
    position: 'absolute',
    bottom: 10,
    fontSize: 20,
    color: '#000',
    fontWeight: 'bold',
  },
});

