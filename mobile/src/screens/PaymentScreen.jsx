import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator, Alert, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import AppHeader from '../components/ui/AppHeader';
import { COLORS } from '../config';
import { orderApi } from '../api';

export default function PaymentScreen({ route, navigation }) {
  const { order, razorpayOrder, user } = route.params || {};
  const [verifying, setVerifying] = useState(false);

  const razorpayKey = process.env.EXPO_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_T9OyWP0MyUW2Df';

  if (!order || !razorpayOrder) {
    return (
      <SafeAreaView style={styles.safe}>
        <AppHeader title="Payment" showBack />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Invalid Order Information</Text>
        </View>
      </SafeAreaView>
    );
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
        <style>
          body {
            background-color: #121212;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            color: #fff;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            margin: 0;
            overflow: hidden;
          }
          .loader {
            border: 4px solid #333;
            border-top: 4px solid #e91e8c;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      </head>
      <body>
        <div id="loader" class="loader"></div>
        <script>
          const options = {
            key: "${razorpayKey}",
            amount: ${razorpayOrder.amount},
            currency: "${razorpayOrder.currency || 'INR'}",
            name: "Dundu",
            description: "Order #${order.order_number}",
            order_id: "${razorpayOrder.id}",
            prefill: {
              name: ${JSON.stringify(user?.name || '')},
              email: ${JSON.stringify(user?.email || '')},
              contact: ${JSON.stringify(user?.phone || '')}
            },
            theme: { color: "#e91e8c" },
            handler: function (response) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                status: 'success',
                data: response
              }));
            },
            modal: {
              ondismiss: function () {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  status: 'dismissed'
                }));
              }
            }
          };

          window.onload = function() {
            try {
              const rzp = new window.Razorpay(options);
              rzp.on('payment.failed', function (response) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  status: 'failed',
                  error: response.error
                }));
              });
              rzp.open();
            } catch (err) {
              window.ReactNativeWebView.postMessage(JSON.stringify({
                status: 'error',
                message: err.message
              }));
            }
          };
        </script>
      </body>
    </html>
  `;

  const handleMessage = async (event) => {
    try {
      const response = JSON.parse(event.nativeEvent.data);
      if (response.status === 'success') {
        setVerifying(true);
        try {
          const verifyPayload = {
            razorpay_order_id: response.data.razorpay_order_id,
            razorpay_payment_id: response.data.razorpay_payment_id,
            razorpay_signature: response.data.razorpay_signature,
            order_id: order.id,
          };
          await orderApi.verifyPayment(verifyPayload);
          Alert.alert('Payment Successful', 'Your order has been placed successfully!', [
            {
              text: 'OK',
              onPress: () => {
                navigation.replace('OrderSuccess', {
                  orderId: order.id,
                  orderNumber: order.order_number || order.id
                });
              }
            }
          ]);
        } catch (err) {
          Alert.alert('Verification Failed', err?.message || 'Payment verification failed. Please contact support.');
          navigation.replace('OrderDetail', { id: order.id });
        } finally {
          setVerifying(false);
        }
      } else if (response.status === 'dismissed') {
        Alert.alert('Payment Cancelled', 'You cancelled the payment. You can retry from order details.', [
          {
            text: 'OK',
            onPress: () => {
              navigation.replace('OrderDetail', { id: order.id });
            }
          }
        ]);
      } else if (response.status === 'failed' || response.status === 'error') {
        Alert.alert('Payment Failed', response.error?.description || response.message || 'Payment failed.', [
          {
            text: 'OK',
            onPress: () => {
              navigation.replace('OrderDetail', { id: order.id });
            }
          }
        ]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      <AppHeader title="Secure Checkout" showBack />
      <View style={styles.container}>
        <WebView
          source={{ html: htmlContent }}
          onMessage={handleMessage}
          style={{ flex: 1 }}
          originWhitelist={['*']}
          javaScriptEnabled={true}
          domStorageEnabled={true}
        />
        {verifying && (
          <View style={styles.overlay}>
            <ActivityIndicator size="large" color={COLORS.primary} />
            <Text style={styles.verifyingText}>Verifying Payment...</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  container: {
    flex: 1,
    position: 'relative',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: COLORS.textSecondary,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  verifyingText: {
    marginTop: 16,
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.primary,
  },
});
