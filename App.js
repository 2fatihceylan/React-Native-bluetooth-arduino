import React, {useEffect, useState} from 'react';
import {
  StyleSheet,
  Text,
  View,
  PermissionsAndroid,
  Platform,
  Alert,
  Button,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  LogBox,
  TouchableHighlight,
  Image,
} from 'react-native';

import {AnimatedCircularProgress} from 'react-native-circular-progress';

var Sound = require('react-native-sound');

import BluetoothSerial from 'react-native-bluetooth-serial';
import {BleManager, Device} from 'react-native-ble-plx';
import {Circle} from 'react-native-svg';

export const manager = new BleManager();
LogBox.ignoreLogs(['new NativeEventEmitter']);

const checkForBluetoothPermission = async () => {
  if (Platform.OS === 'android' && Platform.Version >= 23) {
    let finalPermission =
      Platform.Version >= 29
        ? PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        : PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION;

    PermissionsAndroid.check(finalPermission).then(result => {
      if (result) {
        //enableBluetoothInDevice();
      } else {
        PermissionsAndroid.request(finalPermission).then(result => {
          if (result) {
            //enableBluetoothInDevice();
          } else {
            console.log('User refuse');
          }
        });
      }
    });
  } else {
    console.log('IOS');

    //enableBluetoothInDevice();
  }
};

export default function App() {
  const [pairedDevices, setPairedDevices] = useState([]);
  const [connectedDevice, setConnectedDevice] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [text, setText] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inputdata, setInputdata] = useState('');
  const [nem, setNem] = useState(0);
  const [sic, setSic] = useState(0);
  const [isFlame, setIsFlame] = useState(false);
  const [isOn, setIsOn] = useState(false);
  const [btntext, setbtntext] = useState("LED'i yak");

  Sound.setCategory('Playback');

  useEffect(() => {
    checkForBluetoothPermission();
    getPairedDevices();
    isBluetoothEnabled();
  }, []);

  useEffect(() => {
    BluetoothSerial.on('bluetoothDisabled', isBluetoothEnabled);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      readStringFromDevice();
    }, 2000);
  }, []);

  const isBluetoothEnabled = async () => {
    try {
      const bluetoothState = await BluetoothSerial.isEnabled();
      if (!bluetoothState) {
        setConnectedDevice(null);

        Alert.alert(
          'Bluetooth kapalı',
          'Bluetooth açılsın mı?',
          [
            {
              text: 'Hayır',
              onPress: () => console.log('Cancel Pressed'),
              style: 'cancel',
            },
            {
              text: 'Evet',
              onPress: () => enableBluetoothAndRefresh(),
            },
          ],
          {cancelable: false},
        );
      }
    } catch (e) {
      console.log(e);
    }
  };

  const getPairedDevices = async () => {
    try {
      const pairedDeviceses = await BluetoothSerial.list();
      setPairedDevices(pairedDeviceses);
      console.log(pairedDeviceses);
      /*
      const d = {
        address: '20:16:10:09:45:18',
        class: '7936',
        id: '20:16:10:09:45:18',
        name: 'HC-05',
      };
      connectToDevice(d);
      */
    } catch (e) {
      console.log(e);
    }
  };

  const enableBluetoothAndRefresh = async () => {
    try {
      await BluetoothSerial.enable();
      setTimeout(() => {
        getPairedDevices();
      }, 1000);
    } catch (e) {
      console.log(e);
    }
  };

  const connectToDevice = async device => {
    setLoading(true);
    const connectedDeviceId = connectedDevice && connectedDevice.id;
    if (!connecting) {
      if (device.id === connectedDeviceId) {
        alert('Cihaz halihazırda bağlı');
      } else {
        try {
          setConnecting(true);
          setConnectedDevice(null);

          await BluetoothSerial.connect(device.id);

          ////////////
          setIsConnected(true);
          setLoading(false);
          //////////

          setConnectedDevice(device);
          setConnecting(false);
        } catch (e) {
          console.log(e);
          setConnectedDevice(null);
          setConnecting(false);
          setLoading(false);

          alert('bu cihaza bağlanılamıyor');
        }
      }
    }
  };

  const disconnect = async () => {
    if (!connecting) {
      try {
        setConnecting(true);

        await BluetoothSerial.disconnect();

        setConnectedDevice(null);
        setConnecting(false);
      } catch (e) {
        console.log(e);
        setConnecting(false);
      }
    }
  };

  const sendStringToDevice = async () => {
    try {
      if (!isOn) {
        setIsOn(true);
        await BluetoothSerial.write('1');
        setbtntext("LED'i kapat");
      }
      if (isOn) {
        setIsOn(false);
        await BluetoothSerial.write('2');
        setbtntext("LED'i yak");
      }

      setText(null);
    } catch (e) {
      console.log(e);
    }
  };

  const readStringFromDevice = async () => {
    console.log('a');
    try {
      const response = await BluetoothSerial.readFromDevice();
      //console.log(response);
      setInputdata(response);

      let isinclude = response.includes('flame');
      if (isinclude) {
        playSound();
      }
      setIsFlame(isinclude);
      console.log(isinclude);

      var d = response.split('-');

      try {
        let n = d[0].replace('n', '');
        let s0 = d[1].replace('s', '');
        let s = s0.replace('\n', '');

        console.log('1' + n);
        console.log('2' + s);

        setNem(parseInt(n));
        setSic(parseInt(s));
      } catch (error) {
        console.log(error);
      }
    } catch (e) {
      console.log(e);
    }
  };

  const playSound = () => {
    var whoosh = new Sound('whoosh.mp3', Sound.MAIN_BUNDLE, error => {
      if (error) {
        console.log('failed to load the sound', error);
        return;
      }
      console.log(
        'duration in seconds: ' +
          whoosh.getDuration() +
          'number of channels: ' +
          whoosh.getNumberOfChannels(),
      );

      // Play the sound with an onEnd callback
      whoosh.play(success => {
        if (success) {
          console.log('successfully finished playing');
        } else {
          console.log('playback failed due to audio decoding errors');
        }
      });
    });
  };

  const renderItem = ({item}) => (
    <View key={item.id}>
      <TouchableOpacity
        style={styles.touchbtn}
        onPress={() => connectToDevice(item)}>
        <Text style={styles.textdevice}>{item.name}</Text>
        <Text>{'id: ' + item.id}</Text>
      </TouchableOpacity>
    </View>
  );

  const activityIndicator = () => {
    return (
      <View style={styles.container2}>
        <Text>Daha önce bağlanılmış cihazlar...</Text>
        <FlatList data={pairedDevices} renderItem={renderItem} />
      </View>
    );
  };

  const firemodal = () => {
    return (
      <View>
        <Image
          style={styles.image1}
          source={require('./src/assets/fire.png')}
        />
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator
          visible={loading}
          textContent={'Bağlanıyor...'}
          textStyle={styles.spinnerTextStyle}
          size="large"
        />
      ) : (
        <View>
          {isConnected ? (
            <View>
              {isFlame ? (
                firemodal()
              ) : (
                <View>
                  <View style={styles.horizontalcontainer}>
                    <View style={styles.nemcontainer}>
                      <Text style={styles.textnemsic}>{nem + '%'}</Text>
                      <AnimatedCircularProgress
                        size={100}
                        width={10}
                        fill={nem}
                        tintColor="#7FFFD4"
                        backgroundColor="#fff"
                        shadowColor="#fff"
                        padding={10}
                        renderCap={({center}) => (
                          <Circle cx={center.x} cy={center.y} r="10" />
                        )}
                      />
                      <Text>Nem</Text>
                    </View>
                    <View style={styles.siccontainer}>
                      <Text style={styles.textnemsic}>{sic + '°C'}</Text>
                      <AnimatedCircularProgress
                        size={100}
                        width={10}
                        fill={sic}
                        tintColor="#FF7F50"
                        backgroundColor="#fff"
                        shadowColor="#fff"
                        padding={10}
                        renderCap={({center}) => (
                          <Circle cx={center.x} cy={center.y} r="10" />
                        )}
                      />
                      <Text>Sıcaklık</Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={styles.ledbtn}
                    onPress={() => {
                      sendStringToDevice();
                    }}>
                    <Text style={styles.textnemsic}>{btntext}</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : (
            activityIndicator()
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffd95d',
    alignItems: 'center',
    justifyContent: 'center',
  },
  container2: {
    backgroundColor: '#ffd95d',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 150,
  },
  horizontalcontainer: {
    flexDirection: 'row',
  },
  nemcontainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderColor: '#bbbaba',
    borderStyle: 'solid',
    borderWidth: 1,
    borderRadius: 15,
    margin: 10,
  },
  siccontainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    borderColor: '#bbbaba',
    borderStyle: 'solid',
    borderWidth: 1,
    borderRadius: 15,
    margin: 10,
  },
  textnemsic: {
    fontSize: 18,
    fontStyle: 'italic',
    textShadowColor: 'red',
    color: '#000',
  },
  input: {
    backgroundColor: '#fff',
    padding: 10,
    height: 60,
    width: 300,
    borderColor: '#bbbaba',
    borderStyle: 'solid',
    borderWidth: 1,
    borderRadius: 15,
    margin: 10,
  },
  btn: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 10,
    height: 60,
    width: 300,
    borderColor: '#bbbaba',
    borderStyle: 'solid',
    borderWidth: 1,
    borderRadius: 15,
    margin: 10,
  },
  touchbtn: {
    backgroundColor: '#fff',
    padding: 10,
    height: 60,
    width: 300,
    borderColor: '#bbbaba',
    borderStyle: 'solid',
    borderWidth: 1,
    borderRadius: 15,
    margin: 10,
  },
  ledbtn: {
    backgroundColor: '#fff',
    padding: 10,
    height: 60,
    width: 300,
    borderColor: '#bbbaba',
    borderStyle: 'solid',
    borderWidth: 1,
    borderRadius: 15,
    margin: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textdevice: {
    fontSize: 18,
    fontStyle: 'italic',
    textShadowColor: 'red',
    color: '#000',
  },
  image1: {
    width: 400,
    height: 400,
  },
});
