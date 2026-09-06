import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import { deliveryApi } from '../../../api/index';
import { COLORS } from '../../../config';

export default function DeliveryScanScreen() {
  const navigation = useNavigation();
  const [permission, requestPermission] = useCameraPermissions();
  const [loading, setLoading] = useState(false);
  const scannedRef = useRef(false);

  async function handleScan({ data }) {
    if (scannedRef.current || loading) return;
    scannedRef.current = true;
    setLoading(true);
    try {
      const res = await deliveryApi.pickup(data);
      Alert.alert('Picked Up', `Order #${res.order_number || ''} added to your deliveries.`, [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (err) {
      Alert.alert('Scan Failed', err.message || 'Invalid or already picked up QR code.', [
        { text: 'Try Again', onPress: () => { scannedRef.current = false; } },
        { text: 'Cancel', style: 'cancel', onPress: () => navigation.goBack() },
      ]);
    } finally {
      setLoading(false);
    }
  }

  if (!permission) {
    return <SafeAreaView style={styles.center}><ActivityIndicator color={COLORS.primary} /></SafeAreaView>;
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.center}>
        <Text style={styles.permText}>Camera access is needed to scan hub pickup QR codes.</Text>
        <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
          <Text style={styles.permBtnText}>Grant Camera Access</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 16 }}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={handleScan}
      />
      <SafeAreaView style={styles.overlay} edges={['top', 'bottom']}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <Text style={styles.closeBtnText}>✕ Close</Text>
        </TouchableOpacity>
        <View style={styles.frame} />
        <View style={styles.bottomBar}>
          {loading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <Text style={styles.hint}>Point the camera at the order's hub pickup QR code</Text>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  overlay: { flex: 1, justifyContent: 'space-between' },
  closeBtn: { alignSelf: 'flex-end', margin: 20, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  closeBtnText: { color: COLORS.white, fontWeight: '600' },
  frame: { alignSelf: 'center', width: 240, height: 240, borderWidth: 3, borderColor: COLORS.primary, borderRadius: 20, backgroundColor: 'transparent' },
  bottomBar: { padding: 24, alignItems: 'center' },
  hint: { color: COLORS.white, fontSize: 13, textAlign: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30, backgroundColor: COLORS.white },
  permText: { textAlign: 'center', color: COLORS.textSecondary, marginBottom: 16, fontSize: 14 },
  permBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  permBtnText: { color: COLORS.white, fontWeight: '700' },
  cancelText: { color: COLORS.textSecondary, fontSize: 13 },
});
