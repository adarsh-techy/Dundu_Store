import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import useLanguageStore, { useTranslation } from '../../store/language.store';
import { COLORS } from '../../config';

export default function LanguageModal({ visible, onClose }) {
  const { language, setLanguage, languages, t } = useTranslation();

  const handleSelect = async (code) => {
    await setLanguage(code);
    if (onClose) onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>{t('selectLanguage', 'Select Language')}</Text>
              <Text style={styles.subtitle}>
                {t('changeLanguageSub', 'Choose your preferred language for the app')}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Language Options Grid / List */}
          <ScrollView
            style={styles.list}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          >
            {languages.map((item) => {
              const isSelected = language === item.code;
              return (
                <TouchableOpacity
                  key={item.code}
                  style={[
                    styles.langCard,
                    isSelected && styles.langCardSelected,
                  ]}
                  onPress={() => handleSelect(item.code)}
                  activeOpacity={0.8}
                >
                  <View style={styles.langLeft}>
                    <View
                      style={[
                        styles.flagCircle,
                        isSelected && styles.flagCircleSelected,
                      ]}
                    >
                      <Text style={styles.flagText}>{item.flag}</Text>
                    </View>
                    <View style={styles.langNames}>
                      <Text
                        style={[
                          styles.nativeName,
                          isSelected && styles.nativeNameSelected,
                        ]}
                      >
                        {item.nativeName}
                      </Text>
                      <Text style={styles.englishName}>{item.name}</Text>
                    </View>
                  </View>

                  {/* Radio / Check indicator */}
                  <View
                    style={[
                      styles.radioOuter,
                      isSelected && styles.radioOuterSelected,
                    ]}
                  >
                    {isSelected && <View style={styles.radioInner} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Footer note */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.doneBtn}
              onPress={onClose}
              activeOpacity={0.85}
            >
              <Text style={styles.doneBtnText}>{t('done', 'Done')}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 36,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 3,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeIcon: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  list: {
    marginTop: 12,
  },
  listContent: {
    gap: 10,
    paddingVertical: 6,
  },
  langCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  langCardSelected: {
    backgroundColor: '#FDF2F8',
    borderColor: '#E91E8C',
  },
  langLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  flagCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  flagCircleSelected: {
    borderColor: '#FBCFE8',
    backgroundColor: '#FFFFFF',
  },
  flagText: {
    fontSize: 20,
  },
  langNames: {
    justifyContent: 'center',
  },
  nativeName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  nativeNameSelected: {
    color: '#BE185D',
  },
  englishName: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
    fontWeight: '500',
  },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: {
    borderColor: '#E91E8C',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#E91E8C',
  },
  footer: {
    marginTop: 18,
  },
  doneBtn: {
    backgroundColor: '#E91E8C',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E91E8C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
