import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import AppHeader from '../../../components/ui/AppHeader';
import useAuthStore from '../../../store/auth.store';
import useCartStore from '../../../store/cart.store';
import { userApi, loyaltyApi } from '../../../api/index';
import { COLORS } from '../../../config';
import useLoginPromptStore from '../../../store/loginPrompt.store';

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export default function ProfileScreen() {
  const navigation = useNavigation();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const logout = useAuthStore((state) => state.logout);
  const updateUser = useAuthStore((state) => state.updateUser);
  const resetCart = useCartStore((state) => state.resetCart);
  const showPrompt = useLoginPromptStore((s) => s.show);

  const [profile, setProfile] = useState(user || null);
  const [loading, setLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editDob, setEditDob] = useState('');
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(2000);
  const [pickerMonth, setPickerMonth] = useState(0);
  const [pickerDay, setPickerDay] = useState(1);
  const [editLoading, setEditLoading] = useState(false);
  const [loyaltyCard, setLoyaltyCard] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [addrLoading, setAddrLoading] = useState(false);
  const [showAddrForm, setShowAddrForm] = useState(false);
  const [editingAddrId, setEditingAddrId] = useState(null);
  const [addrForm, setAddrForm] = useState({ name: '', phone: '', address_line1: '', address_line2: '', city: '', state: '', pincode: '' });
  const [addrSaving, setAddrSaving] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);

  useEffect(() => {
    if (isAuthenticated) fetchProfile();
  }, [isAuthenticated]);

  async function fetchProfile() {
    setLoading(true);
    try {
      const res = await userApi.getProfile();
      const p = res.user || res;
      setProfile(p);
      updateUser(p);
      // Fetch loyalty card
      try {
        const lRes = await loyaltyApi.myCard();
        setLoyaltyCard(lRes?.card || lRes?.data?.card || null);
      } catch (_) {}
    } catch (err) {
      // silent — user data from auth store is fallback
    } finally {
      setLoading(false);
    }
  }

  function openEdit() {
    setEditName(profile?.name || '');
    setEditPhone(profile?.phone || '');
    setEditDob(profile?.date_of_birth ? profile.date_of_birth.slice(0, 10) : '');
    setShowAddrForm(false);
    setEditingAddrId(null);
    fetchAddresses();
    setShowEditModal(true);
  }

  async function fetchAddresses() {
    setAddrLoading(true);
    try {
      const res = await userApi.getAddresses();
      setAddresses(res.addresses || res || []);
    } catch (_) {}
    finally { setAddrLoading(false); }
  }

  function openAddAddress() {
    setAddrForm({ name: '', phone: '', address_line1: '', address_line2: '', city: '', state: '', pincode: '' });
    setEditingAddrId(null);
    setShowAddrForm(true);
  }

  function openEditAddress(addr) {
    setAddrForm({
      name: addr.name || '',
      phone: addr.phone || '',
      address_line1: addr.address_line1 || '',
      address_line2: addr.address_line2 || '',
      city: addr.city || '',
      state: addr.state || '',
      pincode: addr.pincode || '',
    });
    setEditingAddrId(addr.id);
    setShowAddrForm(true);
  }

  async function handleSaveAddress() {
    if (!addrForm.name.trim() || !addrForm.phone.trim() || !addrForm.address_line1.trim() || !addrForm.city.trim() || !addrForm.state.trim() || !addrForm.pincode.trim()) {
      Alert.alert('Required', 'Please fill all required address fields.');
      return;
    }
    setAddrSaving(true);
    try {
      if (editingAddrId) {
        await userApi.updateAddress(editingAddrId, addrForm);
      } else {
        await userApi.addAddress(addrForm);
      }
      setShowAddrForm(false);
      fetchAddresses();
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to save address.');
    } finally { setAddrSaving(false); }
  }

  function handleDeleteAddress(id) {
    Alert.alert('Delete Address', 'Remove this address?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await userApi.deleteAddress(id);
          fetchAddresses();
        } catch (_) { Alert.alert('Error', 'Failed to delete address.'); }
      }},
    ]);
  }

  function openAddressModal() {
    setShowAddrForm(false);
    setEditingAddrId(null);
    fetchAddresses();
    setShowAddressModal(true);
  }

  async function handleSaveEdit() {
    if (!editName.trim()) {
      Alert.alert('Required', 'Name is required.');
      return;
    }
    setEditLoading(true);
    try {
      const res = await userApi.updateProfile({ name: editName.trim(), phone: editPhone.trim(), date_of_birth: editDob || null });
      const updated = res.user || res;
      setProfile(updated);
      updateUser(updated);
      setShowEditModal(false);
    } catch (err) {
      Alert.alert('Error', err?.message || 'Failed to update profile.');
    } finally {
      setEditLoading(false);
    }
  }

  function confirmLogout() {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            resetCart();
            await logout();
          },
        },
      ]
    );
  }

  const menuItems = [
    {
      icon: '✏️',
      label: 'Edit Profile',
      onPress: openEdit,
    },
    {
      icon: '📦',
      label: 'My Orders',
      onPress: () => navigation.navigate('Orders'),
    },
    {
      icon: '📍',
      label: 'Saved Addresses',
      onPress: openAddressModal,
    },
    {
      icon: '❤️',
      label: 'Wishlist',
      onPress: () => navigation.navigate('Wishlist'),
    },
    {
      icon: '🎁',
      label: 'Refer & Earn',
      onPress: () => navigation.navigate('Referral'),
    },
    {
      icon: '⭐',
      label: 'My Loyalty Card',
      onPress: () => navigation.navigate('LoyaltyCard'),
    },
    {
      icon: '💳',
      label: 'My Wallet',
      onPress: () => navigation.navigate('Wallet'),
    },
    {
      icon: '🔔',
      label: 'Notifications',
      onPress: () => navigation.navigate('Notifications'),
    },
    {
      icon: '🆘',
      label: 'Help & Support',
      onPress: () => navigation.navigate('Help'),
    },
    { sectionHeader: 'Legal' },
    {
      label: 'Privacy Policy',
      onPress: () => navigation.navigate('PrivacyPolicy'),
    },
    {
      label: 'Return & Refund Policy',
      onPress: () => navigation.navigate('ReturnRefundPolicy'),
    },
    {
      label: 'Shipping Policy',
      onPress: () => navigation.navigate('ShippingPolicy'),
    },
    {
      label: 'Cancellation Policy',
      onPress: () => navigation.navigate('CancellationPolicy'),
    },
    {
      label: 'Terms & Conditions',
      onPress: () => navigation.navigate('TermsConditions'),
    },
    {
      label: 'Logout',
      onPress: confirmLogout,
      danger: true,
    },
  ];

  // ── Guest screen ──────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      <AppHeader logo rightComponent={
        <Text style={styles.headerRightText}>Profile</Text>
      } />
        <ScrollView contentContainerStyle={styles.guestScroll} showsVerticalScrollIndicator={false}>
          {/* Hero */}
          <View style={styles.guestHero}>
            <View style={styles.guestAvatarWrap}>
              <Text style={styles.guestAvatarIcon}>👤</Text>
            </View>
            <Text style={styles.guestTitle}>Welcome to Dundu</Text>
            <Text style={styles.guestSubtitle}>
              Sign in to access your profile, orders, wishlist and exclusive rewards.
            </Text>
          </View>

          {/* CTAs */}
          <TouchableOpacity style={styles.guestLoginBtn} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.guestLoginText}>Login</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.guestSignupBtn} onPress={() => navigation.navigate('Signup')}>
            <Text style={styles.guestSignupText}>Create Account — It's Free</Text>
          </TouchableOpacity>

          {/* Feature highlights */}
          <View style={styles.guestFeatures}>
            {[
              { icon: '📦', label: 'Track your orders' },
              { icon: '❤️', label: 'Save to wishlist' },
              { icon: '🎁', label: 'Earn loyalty points' },
              { icon: '🤝', label: 'Refer friends & earn' },
              { icon: '⚡', label: 'Faster checkout' },
            ].map((f) => (
              <View key={f.icon} style={styles.guestFeatureRow}>
                <Text style={styles.guestFeatureIcon}>{f.icon}</Text>
                <Text style={styles.guestFeatureText}>{f.label}</Text>
              </View>
            ))}
          </View>

          {/* Legal links — accessible without login */}
          <View style={styles.guestLegal}>
            <Text style={styles.guestLegalTitle}>Policies</Text>
            {[
              { label: 'Privacy Policy', screen: 'PrivacyPolicy' },
              { label: 'Return & Refund Policy', screen: 'ReturnRefundPolicy' },
              { label: 'Shipping Policy', screen: 'ShippingPolicy' },
              { label: 'Cancellation Policy', screen: 'CancellationPolicy' },
              { label: 'Terms & Conditions', screen: 'TermsConditions' },
            ].map((item) => (
              <TouchableOpacity
                key={item.screen}
                style={styles.guestLegalRow}
                onPress={() => navigation.navigate(item.screen)}
                activeOpacity={0.7}
              >
                <Text style={styles.guestLegalLabel}>{item.label}</Text>
                <Text style={styles.guestLegalArrow}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }
  // ──────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe} edges={['left', 'right', 'bottom']}>
      <AppHeader logo rightComponent={
        <Text style={styles.headerRightText}>Profile</Text>
      } />
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* ── Profile header card ── */}
        <View style={styles.profileCard}>
          {loading ? (
            <ActivityIndicator color={COLORS.primary} size="small" />
          ) : (
            <>
              {/* Avatar */}
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{getInitials(profile?.name)}</Text>
              </View>
              {/* Info */}
              <View style={styles.profileInfo}>
                <Text style={styles.userName} numberOfLines={1}>{profile?.name || 'User'}</Text>
                {profile?.email && (
                  <Text style={styles.userEmail} numberOfLines={1}>✉ {profile.email}</Text>
                )}
                {profile?.phone && (
                  <Text style={styles.userPhone} numberOfLines={1}>📞 {profile.phone}</Text>
                )}
                {profile?.date_of_birth && (
                  <Text style={styles.userPhone} numberOfLines={1}>
                    🎂 {new Date(profile.date_of_birth).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </Text>
                )}
              </View>
            </>
          )}
        </View>

        {/* ── ATM Loyalty Card ── */}
        {loyaltyCard && (() => {
          const pointsAfterRedeem = loyaltyCard.points % 200;
          const redeemableCount = Math.floor(loyaltyCard.points / 200);
          const progress = Math.round((pointsAfterRedeem / 200) * 100);
          const memberYear = loyaltyCard.created_at ? new Date(loyaltyCard.created_at).getFullYear() : new Date().getFullYear();
          return (
            <View style={styles.lcSection}>
              <View style={styles.lcSectionRow}>
                <Text style={styles.lcSectionTitle}>My Loyalty Card</Text>
                <TouchableOpacity onPress={() => navigation.navigate('LoyaltyCard')}>
                  <Text style={styles.lcSectionLink}>View Details →</Text>
                </TouchableOpacity>
              </View>

              {/* The Card — tap to open detail */}
              <TouchableOpacity
                onPress={() => navigation.navigate('LoyaltyCard')}
                activeOpacity={0.88}
              >
                <View style={styles.lcCard}>
                {/* Blue gradient layers */}
                <View style={styles.lcGradBase} />
                <View style={styles.lcGradMid} />
                <View style={styles.lcGradTop} />
                {/* Shine overlay */}
                <View style={styles.lcShine} />
                {/* Top-right glow circle */}
                <View style={styles.lcGlowTR} />
                {/* Bottom-left deep glow */}
                <View style={styles.lcGlowBL} />

                {/* Row 1: DUNDU + contactless */}
                <View style={styles.lcRow1}>
                  <Text style={styles.lcBrand}>DUNDU</Text>
                  <Text style={styles.lcContactless}>📶</Text>
                </View>

                {/* Row 2: Chip + Points */}
                <View style={styles.lcRow2}>
                  {/* Golden EMV chip */}
                  <View style={styles.lcChip}>
                    <View style={styles.lcChipInner}>
                      <View style={styles.lcChipQ1} />
                      <View style={styles.lcChipQ2} />
                      <View style={styles.lcChipQ3} />
                      <View style={styles.lcChipQ4} />
                    </View>
                  </View>
                  {/* Points */}
                  <View style={styles.lcPointsBox}>
                    <Text style={styles.lcPointsLabel}>Points Balance</Text>
                    <Text style={styles.lcPointsValue}>
                      <Text style={styles.lcStar}>★ </Text>
                      {loyaltyCard.points}
                    </Text>
                  </View>
                </View>

                {/* Row 3: Name + Since */}
                <View style={styles.lcRow3}>
                  <View>
                    <Text style={styles.lcMemberLabel}>MEMBER</Text>
                    <Text style={styles.lcMemberName}>
                      {(loyaltyCard.name || profile?.name || 'Dundu Member').slice(0, 20).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.lcMemberLabel}>SINCE</Text>
                    <Text style={styles.lcMemberName}>{memberYear}</Text>
                  </View>
                </View>
              </View>
              </TouchableOpacity>

              {/* Redeemable banner */}
              {redeemableCount > 0 && (
                <View style={styles.lcRedeemBanner}>
                  <Text style={styles.lcRedeemIcon}>🎁</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.lcRedeemTitle}>₹{redeemableCount * 200} Redeemable Now!</Text>
                    <Text style={styles.lcRedeemSub}>Show your card at billing counter to redeem</Text>
                  </View>
                </View>
              )}

              {/* Progress bar */}
              <View style={styles.lcProgress}>
                <View style={styles.lcProgressRow}>
                  <Text style={styles.lcProgressLeft}>{pointsAfterRedeem} pts toward next redemption</Text>
                  <Text style={styles.lcProgressRight}>{200 - pointsAfterRedeem} more needed</Text>
                </View>
                <View style={styles.lcProgressBg}>
                  <View style={[styles.lcProgressFill, { width: `${progress}%` }]} />
                </View>
                <Text style={styles.lcProgressHint}>Earn 20 pts every ₹500 spent · 200 pts = ₹200 off</Text>
              </View>
            </View>
          );
        })()}

        {/* Menu items */}
        <View style={styles.menuContainer}>
          {menuItems.map((item, index) => {
            if (item.sectionHeader) {
              return (
                <Text key={`header-${index}`} style={styles.menuSectionHeader}>
                  {item.sectionHeader}
                </Text>
              );
            }
            const isLast = index === menuItems.length - 1;
            return (
              <TouchableOpacity
                key={index}
                style={[styles.menuItem, isLast && styles.menuItemLast]}
                onPress={item.onPress}
                activeOpacity={0.7}
              >
                {item.icon ? <Text style={styles.menuIcon}>{item.icon}</Text> : null}
                <Text style={[styles.menuLabel, item.danger && styles.menuLabelDanger]}>
                  {item.label}
                </Text>
                {!item.danger && <Text style={styles.menuArrow}>›</Text>}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.appVersion}>
          <Text style={styles.appVersionText}>Dundu v1.0.0</Text>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={showEditModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Profile</Text>
            <TouchableOpacity onPress={handleSaveEdit} disabled={editLoading}>
              {editLoading ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <Text style={styles.modalSaveText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <View style={styles.modalAvatarContainer}>
              <View style={styles.modalAvatar}>
                <Text style={styles.modalAvatarText}>{getInitials(editName || profile?.name)}</Text>
              </View>
            </View>

            <Text style={styles.modalLabel}>Full Name *</Text>
            <TextInput
              style={styles.modalInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="Your full name"
              placeholderTextColor={COLORS.textSecondary}
              autoCapitalize="words"
            />

            <Text style={styles.modalLabel}>Phone Number</Text>
            <TextInput
              style={[styles.modalInput, { color: COLORS.textSecondary, backgroundColor: '#f5f5f5' }]}
              value={editPhone}
              editable={false}
              placeholderTextColor={COLORS.textSecondary}
            />

            <Text style={styles.modalLabel}>Date of Birth</Text>
            <TouchableOpacity
              style={styles.dobPickerBtn}
              onPress={() => {
                const parsed = editDob ? new Date(editDob + 'T00:00:00') : new Date(2000, 0, 1);
                setPickerYear(parsed.getFullYear());
                setPickerMonth(parsed.getMonth());
                setPickerDay(parsed.getDate());
                setShowDobPicker(true);
              }}
              activeOpacity={0.7}
            >
              <Text style={editDob ? styles.dobPickerText : styles.dobPickerPlaceholder}>
                {editDob
                  ? new Date(editDob + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
                  : 'Select date of birth'}
              </Text>
              <Text style={{ fontSize: 18 }}>📅</Text>
            </TouchableOpacity>

            <Text style={[styles.emailNote, { marginTop: 8 }]}>
              Email address cannot be changed.
            </Text>

            {/* ── Addresses ── */}
            <View style={styles.addrSection}>
              <View style={styles.addrSectionHeader}>
                <Text style={styles.addrSectionTitle}>Saved Addresses</Text>
                {!showAddrForm && (
                  <TouchableOpacity onPress={openAddAddress} style={styles.addrAddBtn}>
                    <Text style={styles.addrAddBtnText}>+ Add</Text>
                  </TouchableOpacity>
                )}
              </View>

              {addrLoading ? (
                <ActivityIndicator size="small" color={COLORS.primary} style={{ marginVertical: 12 }} />
              ) : addresses.length === 0 && !showAddrForm ? (
                <Text style={styles.addrEmpty}>No saved addresses yet.</Text>
              ) : (
                addresses.map((addr) => (
                  <View key={addr.id} style={styles.addrCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.addrName}>{addr.name}  ·  {addr.phone}</Text>
                      <Text style={styles.addrLine}>{addr.address_line1}{addr.address_line2 ? ', ' + addr.address_line2 : ''}</Text>
                      <Text style={styles.addrLine}>{addr.city}, {addr.state} – {addr.pincode}</Text>
                    </View>
                    <View style={styles.addrActions}>
                      <TouchableOpacity onPress={() => openEditAddress(addr)} style={styles.addrActionBtn}>
                        <Text style={styles.addrEditText}>Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteAddress(addr.id)} style={styles.addrActionBtn}>
                        <Text style={styles.addrDeleteText}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}

              {showAddrForm && (
                <View style={styles.addrForm}>
                  <Text style={styles.addrFormTitle}>{editingAddrId ? 'Edit Address' : 'New Address'}</Text>
                  {[
                    { key: 'name', label: 'Full Name *', placeholder: 'Recipient name', caps: 'words' },
                    { key: 'phone', label: 'Phone *', placeholder: '10-digit mobile', kbd: 'phone-pad' },
                    { key: 'address_line1', label: 'Address Line 1 *', placeholder: 'House / Street', caps: 'sentences' },
                    { key: 'address_line2', label: 'Address Line 2', placeholder: 'Landmark (optional)', caps: 'sentences' },
                    { key: 'city', label: 'City *', placeholder: 'City', caps: 'words' },
                    { key: 'state', label: 'State *', placeholder: 'State', caps: 'words' },
                    { key: 'pincode', label: 'Pincode *', placeholder: '6-digit pincode', kbd: 'numeric' },
                  ].map((f) => (
                    <View key={f.key}>
                      <Text style={styles.addrLabel}>{f.label}</Text>
                      <TextInput
                        style={styles.modalInput}
                        value={addrForm[f.key]}
                        onChangeText={(v) => setAddrForm((p) => ({ ...p, [f.key]: v }))}
                        placeholder={f.placeholder}
                        placeholderTextColor={COLORS.textSecondary}
                        keyboardType={f.kbd || 'default'}
                        autoCapitalize={f.caps || 'none'}
                      />
                    </View>
                  ))}
                  <View style={styles.addrFormBtns}>
                    <TouchableOpacity style={styles.addrCancelBtn} onPress={() => setShowAddrForm(false)}>
                      <Text style={styles.addrCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.addrSaveBtn} onPress={handleSaveAddress} disabled={addrSaving}>
                      {addrSaving
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <Text style={styles.addrSaveText}>{editingAddrId ? 'Update' : 'Save'}</Text>}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </ScrollView>

          {/* DOB Picker — must live inside this Modal so it appears on Android */}
          <DobPickerModal
            visible={showDobPicker}
            year={pickerYear}
            month={pickerMonth}
            day={pickerDay}
            onChangeYear={setPickerYear}
            onChangeMonth={setPickerMonth}
            onChangeDay={setPickerDay}
            onConfirm={() => {
              const m = String(pickerMonth + 1).padStart(2, '0');
              const d = String(pickerDay).padStart(2, '0');
              setEditDob(`${pickerYear}-${m}-${d}`);
              setShowDobPicker(false);
            }}
            onCancel={() => setShowDobPicker(false)}
          />
        </SafeAreaView>
      </Modal>

      {/* ── Saved Addresses Modal ── */}
      <Modal visible={showAddressModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalSafe}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddressModal(false)}>
              <Text style={styles.modalCancelText}>Close</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Saved Addresses</Text>
            <TouchableOpacity onPress={openAddAddress}>
              <Text style={styles.modalSaveText}>+ Add</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {addrLoading ? (
              <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
            ) : addresses.length === 0 && !showAddrForm ? (
              <Text style={[styles.addrEmpty, { marginTop: 40 }]}>No saved addresses yet. Tap "+ Add" to add one.</Text>
            ) : (
              addresses.map((addr) => (
                <View key={addr.id} style={styles.addrCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.addrName}>{addr.name}  ·  {addr.phone}</Text>
                    <Text style={styles.addrLine}>{addr.address_line1}{addr.address_line2 ? ', ' + addr.address_line2 : ''}</Text>
                    <Text style={styles.addrLine}>{addr.city}, {addr.state} – {addr.pincode}</Text>
                  </View>
                  <View style={styles.addrActions}>
                    <TouchableOpacity onPress={() => openEditAddress(addr)} style={styles.addrActionBtn}>
                      <Text style={styles.addrEditText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteAddress(addr.id)} style={styles.addrActionBtn}>
                      <Text style={styles.addrDeleteText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}

            {showAddrForm && (
              <View style={styles.addrForm}>
                <Text style={styles.addrFormTitle}>{editingAddrId ? 'Edit Address' : 'New Address'}</Text>
                {[
                  { key: 'name', label: 'Full Name *', placeholder: 'Recipient name', caps: 'words' },
                  { key: 'phone', label: 'Phone *', placeholder: '10-digit mobile', kbd: 'phone-pad' },
                  { key: 'address_line1', label: 'Address Line 1 *', placeholder: 'House / Street', caps: 'sentences' },
                  { key: 'address_line2', label: 'Address Line 2', placeholder: 'Landmark (optional)', caps: 'sentences' },
                  { key: 'city', label: 'City *', placeholder: 'City', caps: 'words' },
                  { key: 'state', label: 'State *', placeholder: 'State', caps: 'words' },
                  { key: 'pincode', label: 'Pincode *', placeholder: '6-digit pincode', kbd: 'numeric' },
                ].map((f) => (
                  <View key={f.key}>
                    <Text style={styles.modalLabel}>{f.label}</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={addrForm[f.key]}
                      onChangeText={(v) => setAddrForm((p) => ({ ...p, [f.key]: v }))}
                      placeholder={f.placeholder}
                      placeholderTextColor={COLORS.textSecondary}
                      keyboardType={f.kbd || 'default'}
                      autoCapitalize={f.caps || 'none'}
                    />
                  </View>
                ))}
                <View style={styles.addrFormBtns}>
                  <TouchableOpacity style={styles.addrCancelBtn} onPress={() => setShowAddrForm(false)}>
                    <Text style={styles.addrCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.addrSaveBtn} onPress={handleSaveAddress} disabled={addrSaving}>
                    {addrSaving
                      ? <ActivityIndicator size="small" color="#fff" />
                      : <Text style={styles.addrSaveText}>{editingAddrId ? 'Update' : 'Save'}</Text>}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ── DOB Picker ──────────────────────────────────────────
const MONTHS_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const _CURR_YEAR = new Date().getFullYear();

function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function SpinnerCol({ label, value, onPrev, onNext, flex = 1 }) {
  return (
    <View style={[ps.spinnerCol, { flex }]}>
      <Text style={ps.spinnerLabel}>{label}</Text>
      <TouchableOpacity onPress={onPrev} style={ps.spinnerBtn} activeOpacity={0.6}>
        <Text style={ps.spinnerArrow}>▲</Text>
      </TouchableOpacity>
      <View style={ps.spinnerValueBox}>
        <Text style={ps.spinnerValueText} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
      </View>
      <TouchableOpacity onPress={onNext} style={ps.spinnerBtn} activeOpacity={0.6}>
        <Text style={ps.spinnerArrow}>▼</Text>
      </TouchableOpacity>
    </View>
  );
}

function DobPickerModal({ visible, year, month, day, onChangeYear, onChangeMonth, onChangeDay, onConfirm, onCancel }) {
  const maxDay = daysInMonth(year, month);

  useEffect(() => {
    if (day > maxDay) onChangeDay(maxDay);
  }, [year, month]);

  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
      <TouchableOpacity style={ps.backdrop} activeOpacity={1} onPress={onCancel}>
        <View style={ps.sheet}>
          <View style={ps.handle} />

          <View style={ps.header}>
            <TouchableOpacity onPress={onCancel} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Text style={ps.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={ps.titleText}>Date of Birth</Text>
            <TouchableOpacity onPress={onConfirm} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Text style={ps.doneText}>Done</Text>
            </TouchableOpacity>
          </View>

          <View style={ps.spinnerRow}>
            <SpinnerCol
              label="DAY"
              value={String(day).padStart(2, '0')}
              onPrev={() => onChangeDay(day <= 1 ? maxDay : day - 1)}
              onNext={() => onChangeDay(day >= maxDay ? 1 : day + 1)}
              flex={1}
            />
            <View style={ps.divider} />
            <SpinnerCol
              label="MONTH"
              value={MONTHS_FULL[month]}
              onPrev={() => onChangeMonth(month <= 0 ? 11 : month - 1)}
              onNext={() => onChangeMonth(month >= 11 ? 0 : month + 1)}
              flex={2}
            />
            <View style={ps.divider} />
            <SpinnerCol
              label="YEAR"
              value={String(year)}
              onPrev={() => onChangeYear(Math.max(1940, year - 1))}
              onNext={() => onChangeYear(Math.min(_CURR_YEAR, year + 1))}
              flex={1.2}
            />
          </View>

          <TouchableOpacity style={ps.confirmBtn} onPress={onConfirm} activeOpacity={0.8}>
            <Text style={ps.confirmBtnText}>Confirm</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const ps = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 36,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#e0e0e0',
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ebebeb',
  },
  titleText: { fontSize: 16, fontWeight: '700', color: '#111' },
  cancelText: { fontSize: 15, color: '#888', fontWeight: '500' },
  doneText: { fontSize: 15, fontWeight: '700', color: COLORS.primary },
  spinnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 28,
  },
  spinnerCol: {
    alignItems: 'center',
    gap: 10,
  },
  divider: {
    width: 1,
    height: 130,
    backgroundColor: '#efefef',
    marginHorizontal: 4,
  },
  spinnerLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#bbb',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  spinnerBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#f4f4f4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinnerArrow: {
    fontSize: 15,
    color: COLORS.primary,
    fontWeight: '700',
  },
  spinnerValueBox: {
    minWidth: 56,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: COLORS.primary + '12',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.primary + '35',
  },
  spinnerValueText: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.primary,
    textAlign: 'center',
  },
  confirmBtn: {
    marginHorizontal: 20,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
  },
  confirmBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
  },
});

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  headerRightText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
    paddingHorizontal: 6,
  },
  header: {
    backgroundColor: COLORS.dark,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.white,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginHorizontal: 14,
    marginTop: 12,
    marginBottom: 14,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#fce4f0',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  avatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.white,
  },
  profileInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 3,
  },
  userEmail: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  userPhone: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  menuContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    margin: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuSectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 1,
    textTransform: 'uppercase',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 6,
    backgroundColor: COLORS.surface,
  },
  menuIcon: {
    fontSize: 20,
    width: 28,
    textAlign: 'center',
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.text,
  },
  menuLabelDanger: {
    color: COLORS.error,
  },
  menuArrow: {
    fontSize: 20,
    color: COLORS.textSecondary,
    fontWeight: '300',
  },
  appVersion: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  appVersionText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  modalSafe: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalCancelText: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
  },
  modalSaveText: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.primary,
  },
  modalContent: {
    padding: 16,
  },
  modalAvatarContainer: {
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 10,
  },
  modalAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalAvatarText: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.white,
  },
  modalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 6,
    marginTop: 12,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    color: COLORS.text,
    backgroundColor: COLORS.surface,
  },
  emailNote: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 16,
    textAlign: 'center',
  },
  dobPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 13,
    backgroundColor: COLORS.surface,
  },
  dobPickerText: {
    fontSize: 15,
    color: COLORS.text,
  },
  dobPickerPlaceholder: {
    fontSize: 15,
    color: COLORS.textSecondary,
  },

  /* ── Address Section ── */
  addrSection: { marginTop: 24 },
  addrSectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  addrSectionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  addrAddBtn: { backgroundColor: COLORS.primary, borderRadius: 20, paddingVertical: 5, paddingHorizontal: 14 },
  addrAddBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  addrEmpty: { fontSize: 13, color: COLORS.textSecondary, textAlign: 'center', paddingVertical: 12 },
  addrLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ad1457',
    marginBottom: 6,
    marginTop: 12,
  },
  addrCard: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: COLORS.surface, borderRadius: 10,
    padding: 12, marginBottom: 10,
    shadowColor: '#e91e8c',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1, borderColor: COLORS.border,
  },
  addrName: { fontSize: 13, fontWeight: '600', color: COLORS.text, marginBottom: 2 },
  addrLine: { fontSize: 12, color: COLORS.textSecondary, lineHeight: 18 },
  addrActions: { gap: 6, alignItems: 'flex-end', marginLeft: 8 },
  addrActionBtn: { paddingVertical: 3, paddingHorizontal: 2 },
  addrEditText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  addrDeleteText: { fontSize: 12, fontWeight: '700', color: '#e53e3e' },
  addrForm: {
    backgroundColor: COLORS.surface, borderRadius: 12,
    padding: 14, marginTop: 8,
    borderWidth: 1, borderColor: '#f9c8e0',
    shadowColor: '#e91e8c',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 5,
  },
  addrFormTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text, marginBottom: 4 },
  addrFormBtns: { flexDirection: 'row', gap: 10, marginTop: 16 },
  addrCancelBtn: { flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  addrCancelText: { fontSize: 14, fontWeight: '600', color: COLORS.textSecondary },
  addrSaveBtn: { flex: 1, backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  addrSaveText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  /* ── ATM Loyalty Card ── */
  lcSection: { marginHorizontal: 14, marginBottom: 14 },
  lcSectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  lcSectionTitle: { fontSize: 15, fontWeight: '700', color: '#ddd' },
  lcSectionLink: { fontSize: 12, fontWeight: '600', color: COLORS.primary },

  lcCard: {
    borderRadius: 20,
    overflow: 'hidden',
    minHeight: 200,
    padding: 22,
    shadowColor: '#1565c0',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
    position: 'relative',
  },
  lcGradBase: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0a1628',
  },
  lcGradMid: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#1565c0',
    opacity: 0.55,
  },
  lcGradTop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#42a5f5',
    opacity: 0.25,
  },
  lcShine: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  lcGlowTR: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(224,244,255,0.22)',
  },
  lcGlowBL: {
    position: 'absolute',
    bottom: -60,
    left: -30,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(13,45,94,0.55)',
  },

  lcRow1: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  lcBrand: {
    fontSize: 18,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: 5,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  lcContactless: {
    fontSize: 20,
    opacity: 0.7,
    transform: [{ rotate: '90deg' }],
  },

  lcRow2: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  lcChip: {
    width: 52,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#f5c518',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 6,
    elevation: 6,
  },
  lcChipInner: {
    width: 36,
    height: 26,
    borderWidth: 1.5,
    borderColor: 'rgba(160,100,0,0.55)',
    borderRadius: 4,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  lcChipQ1: { width: '50%', height: '50%', borderRightWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(160,100,0,0.4)' },
  lcChipQ2: { width: '50%', height: '50%', borderBottomWidth: 1, borderColor: 'rgba(160,100,0,0.4)' },
  lcChipQ3: { width: '50%', height: '50%', borderRightWidth: 1, borderColor: 'rgba(160,100,0,0.4)' },
  lcChipQ4: { width: '50%', height: '50%' },

  lcPointsBox: { alignItems: 'flex-end' },
  lcPointsLabel: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  lcPointsValue: {
    fontSize: 38,
    fontWeight: '900',
    color: '#ffd700',
    lineHeight: 42,
  },
  lcStar: {
    fontSize: 20,
    color: '#ffd700',
  },

  lcRow3: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  lcMemberLabel: {
    fontSize: 8,
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  lcMemberName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 1.5,
  },

  /* Redeemable banner */
  lcRedeemBanner: {
    marginTop: 10,
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#052e16',
    borderWidth: 1,
    borderColor: '#166534',
  },
  lcRedeemIcon: { fontSize: 22 },
  lcRedeemTitle: { fontSize: 14, fontWeight: '700', color: '#86efac' },
  lcRedeemSub: { fontSize: 11, color: '#4ade80', marginTop: 2 },

  /* Progress */
  lcProgress: {
    marginTop: 10,
    borderRadius: 14,
    padding: 14,
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2e2e2e',
  },
  lcProgressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  lcProgressLeft: { fontSize: 11, color: '#ccc' },
  lcProgressRight: { fontSize: 11, color: '#666' },
  lcProgressBg: {
    height: 10,
    borderRadius: 5,
    backgroundColor: '#2a2a2a',
    overflow: 'hidden',
    marginBottom: 8,
  },
  lcProgressFill: {
    height: '100%',
    borderRadius: 5,
    backgroundColor: '#42a5f5',
    shadowColor: '#42a5f5',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 6,
  },
  lcProgressHint: { fontSize: 10, color: '#555', textAlign: 'center' },

  // ── Guest styles ──────────────────────────
  guestScroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  guestHero: {
    alignItems: 'center',
    paddingTop: 40,
    paddingBottom: 28,
  },
  guestAvatarWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#1e1e1e',
    borderWidth: 2.5,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  guestAvatarIcon: { fontSize: 38 },
  guestTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#f9a8d4',
    marginBottom: 8,
    textAlign: 'center',
  },
  guestSubtitle: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
  },
  guestLoginBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  guestLoginText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  guestSignupBtn: {
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    marginBottom: 28,
  },
  guestSignupText: { color: COLORS.primary, fontSize: 14, fontWeight: '700' },
  guestFeatures: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 16,
    gap: 12,
  },
  guestFeatureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  guestFeatureIcon: { fontSize: 20, width: 30 },
  guestFeatureText: { fontSize: 14, color: '#ccc', fontWeight: '500' },
  guestLegal: {
    marginTop: 20,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    overflow: 'hidden',
  },
  guestLegalTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  guestLegalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: 12,
  },
  guestLegalLabel: { flex: 1, fontSize: 14, color: COLORS.text, fontWeight: '500' },
  guestLegalArrow: { fontSize: 20, color: COLORS.textSecondary },
});
