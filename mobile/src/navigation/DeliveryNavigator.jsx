import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import DeliveryHomeScreen from '../screens/delivery/DeliveryHomeScreen';
import DeliveryScanScreen from '../screens/delivery/DeliveryScanScreen';
import DeliveryOrderScreen from '../screens/delivery/DeliveryOrderScreen';

const Stack = createNativeStackNavigator();

export default function DeliveryNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DeliveryHome" component={DeliveryHomeScreen} />
      <Stack.Screen name="DeliveryScan" component={DeliveryScanScreen} options={{ presentation: 'fullScreenModal' }} />
      <Stack.Screen name="DeliveryOrder" component={DeliveryOrderScreen} />
    </Stack.Navigator>
  );
}
